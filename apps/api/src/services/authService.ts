import jwt from 'jsonwebtoken';
import axios from 'axios';
import prisma from '../db';

const TERMS_VERSION = process.env.TERMS_VERSION || "1.0.0";
const PRIVACY_VERSION = process.env.PRIVACY_VERSION || "1.0.0";
const NEWSLETTER_VERSION = process.env.NEWSLETTER_VERSION || "1.0.0";
const ADMIN_EMAILS = ['yuunalee1050@gmail.com'];

export interface GoogleAuthInput {
  googleToken: string;
  email: string;
  name?: string;
  picture?: string;
  googleId: string;
}

export interface KakaoAuthInput {
  authCode: string;
  redirectUri: string;
}

function computeConsentsRequired(latest: any | null): boolean {
  if (!latest) return true;
  if (!latest.termsAccepted || !latest.privacyAccepted) return true;
  if (latest.termsVersion !== TERMS_VERSION) return true;
  if (latest.privacyVersion !== PRIVACY_VERSION) return true;
  return false;
}

export async function handleGoogleAuth(input: GoogleAuthInput) {
  const { email, name, picture, googleId } = input;

  if (!email || !googleId) {
    throw new Error("필수 정보가 누락되었습니다.");
  }

  const isAdmin = ADMIN_EMAILS.includes(email);

  // 사용자 존재 여부 확인
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email },
        { googleId: googleId }
      ]
    }
  });

  if (!user) {
    // 새 사용자 생성
    user = await prisma.user.create({
      data: {
        email,
        name,
        picture,
        googleId,
        provider: 'google',
        role: isAdmin ? 'ADMIN' : 'USER'
      }
    });

    // 사용자 통계 초기화
    await prisma.userStats.create({
      data: {
        userId: user.id,
        totalSessions: 0,
        totalMessages: 0,
        streakDays: 0
      }
    });
  } else {
    // 기존 사용자 정보 업데이트
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        picture,
        lastLogin: new Date(),
        role: isAdmin ? 'ADMIN' : 'USER'  // 기존 사용자도 역할 업데이트
      }
    });
  }

  // JWT 토큰 생성 (role 포함)
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      googleId: user.googleId,
      provider: 'google',
      role: user.role
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  // 최신 동의 상태 조회
  const latestConsent = await prisma.userConsent.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  const consentsRequired = computeConsentsRequired(latestConsent);

  return {
    success: true,
    token,
    user,
    consents: {
      required: consentsRequired,
      currentVersions: {
        terms: TERMS_VERSION,
        privacy: PRIVACY_VERSION,
        newsletter: NEWSLETTER_VERSION,
      },
      latest: latestConsent,
    }
  };
}

export async function handleKakaoAuth(input: KakaoAuthInput) {
  const { authCode, redirectUri } = input;

  try {
    // 1. 액세스 토큰 받기
    const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID!,
        client_secret: process.env.KAKAO_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code: authCode
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token } = tokenResponse.data;

    // 2. 사용자 정보 가져오기
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const kakaoUser = userResponse.data;
    const email = kakaoUser.kakao_account?.email;
    const isAdmin = email && ADMIN_EMAILS.includes(email);
    
    // 3. 사용자 생성/업데이트
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { kakaoId: String(kakaoUser.id) }
        ]
      }
    });

    if (!user) {
      // 새 사용자 생성
      user = await prisma.user.create({
        data: {
          email: email,
          name: kakaoUser.properties?.nickname,
          picture: kakaoUser.properties?.profile_image,
          kakaoId: String(kakaoUser.id),
          provider: 'kakao',
          role: isAdmin ? 'ADMIN' : 'USER'
        }
      });

      // 사용자 통계 초기화
      await prisma.userStats.create({
        data: { 
          userId: user.id, 
          totalSessions: 0, 
          totalMessages: 0, 
          streakDays: 0 
        }
      });
    } else {
      // 기존 사용자 정보 업데이트
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: kakaoUser.properties?.nickname,
          picture: kakaoUser.properties?.profile_image,
          lastLogin: new Date(),
          role: isAdmin ? 'ADMIN' : 'USER'  // 기존 사용자도 역할 업데이트
        }
      });
    }

    // JWT 토큰 생성 (role 포함)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        kakaoId: user.kakaoId,
        provider: 'kakao',
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // 최신 동의 상태 조회
    const latestConsent = await prisma.userConsent.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    const consentsRequired = computeConsentsRequired(latestConsent);

    return { 
      success: true, 
      token, 
      user,
      consents: {
        required: consentsRequired,
        currentVersions: {
          terms: TERMS_VERSION,
          privacy: PRIVACY_VERSION,
          newsletter: NEWSLETTER_VERSION,
        },
        latest: latestConsent,
      }
    };
  } catch (error: any) {
    console.error('Kakao Auth Error:', error.response?.data || error.message);
    throw new Error(`카카오 인증 실패: ${error.response?.data?.error_description || error.message}`);
  }
}

// 로그아웃 함수
export async function handleLogout(userId: string) {
  try {
    // 로그아웃 시간 기록
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLogin: new Date() // 마지막 활동 시간 업데이트
      }
    });

    return {
      success: true,
      message: '로그아웃되었습니다.'
    };
  } catch (error: any) {
    console.error('Logout Error:', error);
    throw new Error('로그아웃 처리 중 오류가 발생했습니다.');
  }
}

// 사용자 탈퇴 함수
export async function handleDeleteUser(userId: string) {
  try {
    // 사용자 존재 여부 확인
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 트랜잭션으로 모든 관련 데이터 삭제
    await prisma.$transaction(async (tx) => {
      // 1. 피드백 분석 데이터 삭제
      await tx.feedbackAnalysis.deleteMany({
        where: { userId }
      });

      // 2. 세션 데이터 삭제
      await tx.session.deleteMany({
        where: { userId }
      });

      // 3. 사용자 동의 데이터 삭제
      await tx.userConsent.deleteMany({
        where: { userId }
      });

      // 4. 사용자 통계 삭제
      await tx.userStats.deleteMany({
        where: { userId }
      });

      // 5. 뉴스레터 구독 해지 (이메일 기반)
      if (user.email) {
        await tx.newsletterSubscriber.updateMany({
          where: { email: user.email },
          data: { isActive: false }
        });
      }

      // 6. 최종적으로 사용자 계정 삭제
      await tx.user.delete({
        where: { id: userId }
      });
    });

    return {
      success: true,
      message: '계정이 완전히 삭제되었습니다.'
    };
  } catch (error: any) {
    console.error('Delete User Error:', error);
    throw new Error(`회원 탈퇴 처리 중 오류가 발생했습니다: ${error.message}`);
  }
}

// 토큰 검증 함수
export function verifyAuthToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: 'Invalid or expired token' };
  }
}