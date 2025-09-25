// services/authService.ts
import jwt from 'jsonwebtoken';
import axios from 'axios';
import prisma from '../db';

const TERMS_VERSION = process.env.TERMS_VERSION || "1.0.0";
const PRIVACY_VERSION = process.env.PRIVACY_VERSION || "1.0.0";
const NEWSLETTER_VERSION = process.env.NEWSLETTER_VERSION || "1.0.0";
const ADMIN_EMAILS = ['yuunalee1050@gmail.com'];

// JWT 토큰 만료 시간을 짧게 설정 (2시간)
const JWT_SHORT_EXPIRY = '2h';
const JWT_REFRESH_EXPIRY = '7d';

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

// 동의서 상태 체크 함수
function checkConsentStatus(latestConsent: any | null): { isValid: boolean; required: boolean } {
  if (!latestConsent) {
    return { isValid: false, required: true };
  }
  
  // 필수 동의 체크
  if (!latestConsent.termsAccepted || !latestConsent.privacyAccepted) {
    return { isValid: false, required: true };
  }
  
  // 버전 체크
  if (latestConsent.termsVersion !== TERMS_VERSION || 
      latestConsent.privacyVersion !== PRIVACY_VERSION) {
    return { isValid: false, required: true };
  }
  
  return { isValid: true, required: false };
}

export async function handleGoogleAuth(input: GoogleAuthInput) {
  const { email, name, picture, googleId } = input;

  if (!email || !googleId) {
    throw new Error("필수 정보가 누락되었습니다.");
  }

  const isAdmin = ADMIN_EMAILS.includes(email);

  // 1. 사용자 존재 여부 확인
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email },
        { googleId: googleId }
      ]
    }
  });

  let isNewUser = false;

  if (!user) {
    // 새 사용자 생성 (회원가입)
    isNewUser = true;
    
    // 이전 계정의 블랙리스트 정리 (같은 이메일로 재가입하는 경우)
    if (email) {
      const oldInvalidatedTokens = await prisma.invalidatedToken.findMany({
        where: {
          expiresAt: { lt: new Date() } // 만료된 토큰들
        }
      });
      
      if (oldInvalidatedTokens.length > 0) {
        await prisma.invalidatedToken.deleteMany({
          where: {
            id: { in: oldInvalidatedTokens.map(t => t.id) }
          }
        });
      }
    }
    
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
        role: isAdmin ? 'ADMIN' : 'USER'
      }
    });
  }

  // 2. 동의서 상태 확인
  const latestConsent = await prisma.userConsent.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  const consentStatus = checkConsentStatus(latestConsent);

  // 3. 동의서가 없거나 무효한 경우 임시 토큰 발급
  if (!consentStatus.isValid) {
    const tempToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        googleId: user.googleId,
        provider: 'google',
        role: user.role,
        type: 'temp' // 임시 토큰 표시
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30m' } // 임시 토큰은 30분만 유효
    );

    return {
      success: true,
      token: tempToken,
      user,
      status: 'CONSENT_REQUIRED',
      consents: {
        required: true,
        currentVersions: {
          terms: TERMS_VERSION,
          privacy: PRIVACY_VERSION,
          newsletter: NEWSLETTER_VERSION,
        },
        latest: latestConsent,
      }
    };
  }

  // 4. 정상 로그인 토큰 발급
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      googleId: user.googleId,
      provider: 'google',
      role: user.role,
      type: 'access'
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: JWT_SHORT_EXPIRY }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    { expiresIn: JWT_REFRESH_EXPIRY }
  );

  return {
    success: true,
    token: accessToken,
    refreshToken,
    user,
    status: 'SUCCESS',
    consents: {
      required: false,
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
      // 새 사용자 생성 전에 이전 계정의 블랙리스트 정리
      if (email) {
        const oldInvalidatedTokens = await prisma.invalidatedToken.findMany({
          where: {
            expiresAt: { lt: new Date() }
          }
        });
        
        if (oldInvalidatedTokens.length > 0) {
          await prisma.invalidatedToken.deleteMany({
            where: {
              id: { in: oldInvalidatedTokens.map(t => t.id) }
            }
          });
        }
      }

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

      await prisma.userStats.create({
        data: { 
          userId: user.id, 
          totalSessions: 0, 
          totalMessages: 0, 
          streakDays: 0 
        }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: kakaoUser.properties?.nickname,
          picture: kakaoUser.properties?.profile_image,
          lastLogin: new Date(),
          role: isAdmin ? 'ADMIN' : 'USER'
        }
      });
    }

    // 동의서 상태 확인 후 토큰 발급 (Google과 동일한 로직)
    const latestConsent = await prisma.userConsent.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    const consentStatus = checkConsentStatus(latestConsent);

    if (!consentStatus.isValid) {
      const tempToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          kakaoId: user.kakaoId,
          provider: 'kakao',
          role: user.role,
          type: 'temp'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30m' }
      );

      return {
        success: true,
        token: tempToken,
        user,
        status: 'CONSENT_REQUIRED',
        consents: {
          required: true,
          currentVersions: {
            terms: TERMS_VERSION,
            privacy: PRIVACY_VERSION,
            newsletter: NEWSLETTER_VERSION,
          },
          latest: latestConsent,
        }
      };
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        kakaoId: user.kakaoId,
        provider: 'kakao',
        role: user.role,
        type: 'access'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: JWT_SHORT_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      { expiresIn: JWT_REFRESH_EXPIRY }
    );

    return { 
      success: true, 
      token: accessToken,
      refreshToken,
      user,
      status: 'SUCCESS',
      consents: {
        required: false,
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

// 동의서 제출 후 정식 로그인 처리
export async function completeRegistrationAfterConsent(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  // 동의서 재확인
  const latestConsent = await prisma.userConsent.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  const consentStatus = checkConsentStatus(latestConsent);

  if (!consentStatus.isValid) {
    throw new Error('동의서가 완료되지 않았습니다.');
  }

  // 정식 토큰 발급
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role,
      type: 'access'
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: JWT_SHORT_EXPIRY }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    { expiresIn: JWT_REFRESH_EXPIRY }
  );

  return {
    success: true,
    token: accessToken,
    refreshToken,
    user
  };
}

// 토큰 갱신
export async function refreshAccessToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret') as any;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 동의서 상태 재확인
    const latestConsent = await prisma.userConsent.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    const consentStatus = checkConsentStatus(latestConsent);

    if (!consentStatus.isValid) {
      throw new Error('Consent expired or invalid');
    }

    // 새 액세스 토큰 발급
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        type: 'access'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: JWT_SHORT_EXPIRY }
    );

    return {
      success: true,
      token: newAccessToken,
      user
    };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

// 로그아웃 함수
export async function handleLogout(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLogin: new Date()
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

// 사용자 탈퇴 함수 (동의서 포함 모든 데이터 삭제)
export async function handleDeleteUser(userId: string) {
  try {
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

      // 3. 사용자 동의 데이터 삭제 (중요!)
      await tx.userConsent.deleteMany({
        where: { userId }
      });

      // 4. 사용자 통계 삭제
      await tx.userStats.deleteMany({
        where: { userId }
      });

      // 5. 뉴스레터 구독 해지
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

      // 7. 해당 사용자의 모든 토큰 무효화
      await tx.invalidatedToken.create({
        data: {
          userId: userId,
          tokenId: `${userId}_delete_${Date.now()}`,
          reason: 'account_deleted',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 후
        }
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

// 토큰 검증 함수 (동의서 상태도 함께 확인)
export async function verifyAuthToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // 임시 토큰인 경우 제한적 접근만 허용
    if (decoded.type === 'temp') {
      return { 
        valid: true, 
        decoded, 
        status: 'TEMP',
        message: '동의서 작성이 필요합니다.' 
      };
    }

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return { 
        valid: false, 
        error: 'User not found - account may have been deleted' 
      };
    }

    // 동의서 상태 확인
    const latestConsent = await prisma.userConsent.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    const consentStatus = checkConsentStatus(latestConsent);

    if (!consentStatus.isValid) {
      return { 
        valid: false, 
        error: 'Consent not found or expired - please login again' 
      };
    }

    return { 
      valid: true, 
      decoded, 
      status: 'VALID',
      user 
    };
  } catch (error) {
    return { 
      valid: false, 
      error: 'Invalid or expired token' 
    };
  }
}

// 세션 활성화 체크를 위한 함수
export function createSessionActivityChecker() {
  const activeUsers = new Map();
  
  const recordActivity = (userId: string) => {
    activeUsers.set(userId, Date.now());
  };
  
  const cleanupInactiveSessions = async () => {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30분
    
    for (const [userId, lastActivity] of activeUsers.entries()) {
      if (now - lastActivity > inactiveThreshold) {
        activeUsers.delete(userId);
        
        try {
          await prisma.invalidatedToken.create({
            data: {
              userId: userId,
              tokenId: `${userId}_inactive_${now}`,
              reason: 'session_timeout',
              expiresAt: new Date(now + 24 * 60 * 60 * 1000)
            }
          });
        } catch (error) {
          console.error('Failed to record inactive session:', error);
        }
      }
    }
  };
  
  // 10분마다 정리 작업 실행
  setInterval(cleanupInactiveSessions, 10 * 60 * 1000);
  
  return { recordActivity, cleanupInactiveSessions };
}