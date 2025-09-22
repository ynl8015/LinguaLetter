// test-news.ts
import { generateDailyNews } from './src/services/newsService';

async function runTest() {
  console.log('뉴스 생성 테스트 시작...');
  const result = await generateDailyNews();
  console.log('결과:', result);
  process.exit(0);
}

runTest().catch(console.error);