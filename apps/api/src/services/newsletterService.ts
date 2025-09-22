import nodemailer from 'nodemailer';
import prisma from '../db';

const createMailTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

export async function subscribeNewsletter(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
    where: { email }
  });

  if (existingSubscriber?.isActive) {
    throw new Error("Already subscribed");
  }

  const unsubscribeToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const confirmToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

  if (existingSubscriber) {
    await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        confirmToken,
        subscribedAt: new Date()
      }
    });
  } else {
    await prisma.newsletterSubscriber.create({
      data: {
        email,
        unsubscribeToken,
        confirmToken
      }
    });
  }

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const transporter = createMailTransporter();
    const confirmUrl = `http://localhost:4000/newsletter/confirm/${confirmToken}`;
    
    await transporter.sendMail({
      from: `"LinguaLetter" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "LinguaLetter 구독 확인",
      html: createConfirmationTemplate(confirmUrl)
    });
  }

  return { success: true, message: "Confirmation email sent" };
}

export async function confirmSubscription(token: string) {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { confirmToken: token }
  });

  if (!subscriber) {
    throw new Error("Invalid confirmation token");
  }

  if (subscriber.isActive) {
    return { success: true, message: "Already confirmed" };
  }

  await prisma.newsletterSubscriber.update({
    where: { confirmToken: token },
    data: {
      isActive: true,
      confirmedAt: new Date()
    }
  });

  return { success: true, message: "Subscription confirmed" };
}

function createConfirmationTemplate(confirmUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>LinguaLetter 구독 확인</title></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>구독을 완료하려면 확인이 필요해요</h2>
      <p>아래 버튼을 눌러 이메일 구독을 확인하면, 매일 아침 6시에 레슨을 보내드릴게요.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${confirmUrl}" style="background: #000; color: #fff; text-decoration: none; padding: 15px 30px; border-radius: 5px; display: inline-block;">구독 확인하기</a>
      </p>
      <p style="color: #666; font-size: 14px;">이 요청을 본인이 하지 않았다면, 이 메일은 무시하셔도 됩니다.</p>
    </body>
    </html>
  `;
}