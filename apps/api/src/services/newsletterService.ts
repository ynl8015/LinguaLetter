import nodemailer from 'nodemailer';
import prisma from '../db';

/**
 * 이메일 전송을 위한 Transporter를 생성합니다.
 */
const createMailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * 뉴스레터 구독 신청 & 확인 메일 발송
 */
export async function subscribeNewsletter(email: string) {
  console.log('=== 구독 신청 처리 시작 ===');
  console.log('요청 이메일:', email);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email format" };
  }

  const existingSubscriber = await prisma.newsletterSubscriber.findUnique({ where: { email } });

  // 이미 활성 구독자인 경우 → 에러 메시지 반환
  if (existingSubscriber?.isActive) {
    return { success: false, error: "Already subscribed" };
  }

  // 신규 or 비활성 상태 → 새 토큰 발급
  const unsubscribeToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const confirmToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

  if (existingSubscriber) {
    await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        confirmToken,
        unsubscribeToken,
        subscribedAt: new Date(),
        isActive: false,
        confirmedAt: null
      }
    });
  } else {
    await prisma.newsletterSubscriber.create({
      data: { email, unsubscribeToken, confirmToken }
    });
  }

  await sendConfirmationEmail(email, confirmToken);

  return { success: true, message: "구독 확인 이메일이 발송되었습니다." };
}

/**
 * 구독 확인
 */
export async function confirmSubscription(token: string) {
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { confirmToken: token } });

  if (!subscriber) {
    throw new Error("유효하지 않은 확인 토큰입니다.");
  }

  if (subscriber.isActive) {
    return { success: true, message: "이미 확인된 구독입니다." };
  }

  await prisma.newsletterSubscriber.update({
    where: { confirmToken: token },
    data: {
      isActive: true,
      confirmedAt: new Date()
    }
  });

  return { success: true, message: "구독이 성공적으로 확인되었습니다." };
}

/**
 * 모든 활성 구독자에게 뉴스레터 발송
 */
export async function sendNewsletterToAllSubscribers(newsId: string) {
  try {
    console.log('=== 뉴스레터 발송 시작 ===');
    console.log('뉴스 ID:', newsId);

    const news = await prisma.article.findUnique({ where: { id: newsId } });
    if (!news) throw new Error('해당 ID의 뉴스를 찾을 수 없습니다.');

    const subscribers = await prisma.newsletterSubscriber.findMany({ where: { isActive: true } });
    console.log(`총 활성 구독자 수: ${subscribers.length}명`);

    if (subscribers.length === 0) {
      return { success: true, message: '발송할 구독자가 없습니다.', count: 0, total: 0 };
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('이메일 환경변수가 설정되지 않았습니다.');
    }

    const transporter = createMailTransporter();
    let successCount = 0;

    for (const subscriber of subscribers) {
      try {
        const unsubscribeUrl = `http://localhost:4000/newsletter/unsubscribe/${subscriber.unsubscribeToken}`;
        await transporter.sendMail({
          from: `"LinguaLetter" <${process.env.EMAIL_USER}>`,
          to: subscriber.email,
          subject: `LinguaLetter에서 보내는 ${news.trendTopic} 관련 소식을 확인해보세요!`,
          html: createNewsletterTemplate(news, unsubscribeUrl)
        });
        successCount++;
        console.log(`뉴스레터 발송 성공: ${subscriber.email}`);
      } catch (error) {
        console.error(`뉴스레터 발송 실패 (${subscriber.email}):`, error);
      }
    }

    console.log(`뉴스레터 발송 완료: ${successCount}/${subscribers.length}`);
    return {
      success: true,
      message: `${successCount}명에게 뉴스레터가 성공적으로 발송되었습니다.`,
      count: successCount,
      total: subscribers.length
    };
  } catch (error: any) {
    console.error('뉴스레터 발송 프로세스 오류:', error);
    throw new Error(`뉴스레터 발송 실패: ${error.message}`);
  }
}

// ----------------------- 템플릿 / 유틸 -----------------------

/**
 * 구독 확인 메일 발송
 */
async function sendConfirmationEmail(email: string, confirmToken: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('이메일 환경변수가 설정되지 않았습니다.');
  }

  const transporter = createMailTransporter();
  const confirmUrl = `http://localhost:4000/newsletter/confirm/${confirmToken}`;

  await transporter.sendMail({
    from: `"LinguaLetter" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "LinguaLetter 구독을 완료해주세요!",
    html: createConfirmationTemplate(confirmUrl)
  });
}

/**
 * 구독 확인 메일 템플릿
 */
function createConfirmationTemplate(confirmUrl: string) {
  return `
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8">
    <title>LinguaLetter 구독 확인</title>
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fafafa; color: #111; }
      .page {
        max-width: 600px; margin: 40px auto; background: #fff;
        border: 1px solid #e5e5e5; border-radius: 12px; padding: 40px; text-align: center;
      }
      .btn, .btn:link, .btn:visited {
        display: inline-block; margin-top: 20px;
        background: #111; color: #fff !important;
        padding: 12px 24px; border-radius: 8px;
        text-decoration: none !important; font-weight: 600;
      }
      .btn:hover, .btn:active { background: #333; color: #fff !important; }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>LinguaLetter 구독 확인</h1>
      <p>구독 신청해주셔서 감사합니다.<br/>아래 버튼을 눌러 이메일을 인증해주세요.</p>
      <a href="${confirmUrl}" class="btn">구독 확인하기</a>
      <p style="margin-top:20px; font-size:12px; color:#666;">본인이 요청하지 않았다면 이 메일은 무시하셔도 됩니다.</p>
    </div>
  </body>
  </html>
  `;
}

/**
 * 구독 해지
 */
export async function unsubscribeNewsletter(token: string) {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { unsubscribeToken: token }
  });

  if (!subscriber) {
    throw new Error("유효하지 않은 구독 해지 링크입니다.");
  }

  if (!subscriber.isActive) {
    return { success: true, message: "이미 구독이 해지된 상태입니다." };
  }

  await prisma.newsletterSubscriber.update({
    where: { unsubscribeToken: token },
    data: {
      isActive: false,
      unsubscribedAt: new Date()
    }
  });

  return { success: true, message: "구독이 성공적으로 해지되었습니다." };
}

/**
 * 사용자별 구독 상태 조회
 */
export async function getUserSubscriptionStatus(email: string) {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { email }
  });

  return {
    isSubscribed: subscriber?.isActive || false,
    subscribedAt: subscriber?.subscribedAt || null,
    confirmedAt: subscriber?.confirmedAt || null
  };
}

/**
 * 사용자 구독 해지 (이메일로)
 */
export async function unsubscribeByEmail(email: string) {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { email }
  });

  if (!subscriber) {
    throw new Error("해당 이메일로 구독된 내역이 없습니다.");
  }

  if (!subscriber.isActive) {
    return { success: true, message: "이미 구독이 해지된 상태입니다." };
  }

  await prisma.newsletterSubscriber.update({
    where: { email },
    data: {
      isActive: false,
      unsubscribedAt: new Date()
    }
  });

  return { success: true, message: "구독이 성공적으로 해지되었습니다." };
}

/**
 * 뉴스레터 이메일 템플릿
 */
function createNewsletterTemplate(news, unsubscribeUrl) {
  return `
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8">
    <title>${news.trendTopic} - LinguaLetter</title>
    <style>
      body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: #fafafa; color: #111; }
      .page { max-width: 680px; margin: 40px auto; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 60px 80px; }
      .header { text-align: center; margin-bottom: 40px; }
      .logo { width: 48px; height: 48px; margin-bottom: 8px; }
      .brand-title { font-size: 20px; font-weight: 700; margin: 0; }
      .brand-subtitle { font-size: 13px; color: #555; margin: 0; }
      .topic-box { display: inline-block; background: #111; color: #fff; padding: 10px 20px; border-radius: 10px; font-size: 16px; font-weight: 600; margin-bottom: 30px; }
      h2 { font-size: 16px; margin: 28px 0 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
      p { font-size: 14px; line-height: 1.7; margin-bottom: 18px; }
      .cta-btn {
        display: inline-block; margin: 20px 0;
        background: #111; color: #fff !important;
        padding: 12px 24px; border-radius: 8px;
        text-decoration: none !important; font-weight: 600;
      }
      .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
      .footer a { color: #666; text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <img class="logo" src="https://res.cloudinary.com/dahbfym6q/image/upload/v1758003572/%E1%84%85%E1%85%B5%E1%86%BC%E1%84%80%E1%85%AE%E1%84%8B%E1%85%A1%E1%84%85%E1%85%A6%E1%84%90%E1%85%A5%E1%84%85%E1%85%A9%E1%84%80%E1%85%A9_lfvtie.png" alt="LinguaLetter Logo">
        <p class="brand-title">LinguaLetter</p>
        <p class="brand-subtitle">한국어의 뉘앙스를 영어로</p>
      </div>

      <div class="topic-box">${news.trendTopic}</div>

      <h2>한국어 기사</h2>
      <p>${news.koreanArticle}</p>
      <h2>영어 번역</h2>
      <p>${news.englishTranslation}</p>
      <h2>핵심 표현</h2>
      <p>${news.expression}</p>
      <h2>직역</h2>
      <p>${news.literalTranslation}</p>
      <h2>의역</h2>
      <p>${news.idiomaticTranslation}</p>
      <h2>왜 이렇게 번역했을까?</h2>
      <p>${news.reason}</p>

      <div style="text-align:center;">
  <a href="http://localhost:3000/teacher" class="cta-btn"> 이 주제로 선생님과 대화해보기</a>
</div>

      <div class="footer">
        <a href="${unsubscribeUrl}">구독 해지</a><br/><br/>
        <span>LinguaLetter Team</span>
      </div>
    </div>
  </body>
  </html>
  `;
}
