import cron from 'node-cron';
import { generateDailyNews } from './newsService';
import { sendNewsletterToAllSubscribers } from './newsletterService';

let latestNewsId: string | null = null;

export function startScheduler() {
  // 매일 오전 12시 30분에 뉴스 생성
  cron.schedule('30 0 * * *', async () => {
    try {
      const result = await generateDailyNews();
      if (result.success && result.data?.id) {
        latestNewsId = result.data.id;
        console.log('News generated');
      }
    } catch (error) {
      console.error('News generation error:', error);
    }
  }, {
    timezone: "Asia/Seoul"
  });

  // 매일 오전 6시에 뉴스레터 발송
  cron.schedule('0 6 * * *', async () => {
    try {
      if (latestNewsId) {
        await sendNewsletterToAllSubscribers(latestNewsId);
        console.log('Newsletter sent');
      }
    } catch (error) {
      console.error('Newsletter send error:', error);
    }
  }, {
    timezone: "Asia/Seoul"
  });

  console.log('Scheduler started');
}

export function stopScheduler() {
  cron.stop();
  console.log('Scheduler stopped');
}