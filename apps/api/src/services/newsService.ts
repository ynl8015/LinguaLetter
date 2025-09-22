import axios from 'axios';
import { getJson } from 'serpapi';
import prisma from '../db';

const isNewsLogEnabled: boolean = process.env.LOG_NEWS === 'true';

export async function generateDailyNews() {
  try {
    if (isNewsLogEnabled) {
      console.log("일일 뉴스 생성 시작...");
    }
    
    // 1. SerpApi로 구글 뉴스 수집
    const newsRes = await getJson({
      engine: "google_news",
      hl: "ko",
      gl: "KR",
      num: 10,
      api_key: process.env.SERP_API_KEY,
    });

    const articles = newsRes?.news_results?.map((n: any) => ({
      title: n.title,
      snippet: n.snippet,
      link: n.link,
    })) || [];

    // 2. GPT로 주제 추출
    const gptTopicResp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "너는 한국 뉴스 편집자야." },
          {
            role: "user",
            content: `아래 10개의 한국 뉴스를 보고 가장 많이 겹치는 핵심 주제와 대표 기사 3개를 JSON으로 반환해라.

기사 목록:
${articles.map((a: any, i: number) => `${i + 1}. ${a.title} - ${a.snippet}`).join("\n")}

출력 예시:
{
  "topic": "주제",
  "articles": [
    {"title": "...", "snippet": "..."},
    {"title": "...", "snippet": "..."},
    {"title": "...", "snippet": "..."}
  ]
}`
          }
        ],
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
    );

    const parsed = JSON.parse(gptTopicResp.data.choices[0].message.content);
    const trendTopic = parsed.topic;
    const selectedArticles = parsed.articles;

    // 3. GPT로 뉴스레터 생성
    const gptResp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "너는 한국 뉴스를 해외 독자에게 풀어내는 뉴스레터 기자이자 한국어 표현 해설 전문가야."
          },
          {
            role: "user",
            content: `다음 기사를 바탕으로 한국어 뉴스레터 콘텐츠를 만들어라.

참고 기사:
${selectedArticles.map((a: any) => `- ${a.title}: ${a.snippet}`).join("\n")}

출력 포맷:
한국어 기사 : ...
영어 번역(의역 중심) : ...
한국어적 표현 : ...
영어 직역(X) : ...
영어 의역(O) : ...
왜 의역이 이렇게 되는지 : ...`
          }
        ],
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
    );

    const articleRaw = gptResp.data.choices[0].message.content;

    // 4. 파싱
    const parsedArticle = {
      korean_article: articleRaw.match(/한국어 기사\s*:\s*(.*)/)?.[1] || "",
      english_translation: articleRaw.match(/영어 번역.*:\s*(.*)/)?.[1] || "",
      expression: articleRaw.match(/한국어적 표현\s*:\s*(.*)/)?.[1] || "",
      literal_translation: articleRaw.match(/영어 직역\(X\)\s*:\s*(.*)/)?.[1] || "",
      idiomatic_translation: articleRaw.match(/영어 의역\(O\)\s*:\s*(.*)/)?.[1] || "",
      reason: articleRaw.match(/왜 의역이 이렇게 되는지\s*:\s*(.*)/)?.[1] || "",
    };

    // 5. Prisma로 DB 저장
    const result = await prisma.article.create({
      data: {
        trendTopic,
        koreanArticle: parsedArticle.korean_article,
        englishTranslation: parsedArticle.english_translation,
        expression: parsedArticle.expression,
        literalTranslation: parsedArticle.literal_translation,
        idiomaticTranslation: parsedArticle.idiomatic_translation,
        reason: parsedArticle.reason,
      }
    });

    if (isNewsLogEnabled) {
      console.log("뉴스 생성 완료:", result);
    }
    return { success: true, data: result };
  } catch (err: any) {
    console.error("뉴스 생성 실패:", err);
    return { success: false, error: err.message };
  }
}