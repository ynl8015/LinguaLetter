import axios from 'axios';
import { getJson } from 'serpapi';
import prisma from '../db';

const isNewsLogEnabled: boolean = process.env.LOG_NEWS === 'true';

// 뉴스 생성 함수 (스케줄링용)
export async function generateDailyNews() {
  try {
    if (isNewsLogEnabled) {
      console.log(" 일일 뉴스 생성 시작...");
    }
    
    // 1. SerpApi → 구글 뉴스에서 10개 기사 가져오기
    if (isNewsLogEnabled) {
      console.log("1. 구글 뉴스 API 호출 시작...");
    }
    const newsRes = await getJson({
      engine: "google_news",
      hl: "ko",
      gl: "KR",
      num: 10,
      api_key: process.env.SERP_API_KEY,
    });
    if (isNewsLogEnabled) {
      console.log("1. 구글 뉴스 API 응답 완료");
    }

    const articles = newsRes?.news_results?.map((n: any) => ({
      title: n.title,
      snippet: n.snippet,
      link: n.link,
    })) || [];

    // 2. GPT → 가장 많이 겹치는 주제 & 대표 기사 3개 추출
    if (isNewsLogEnabled) {
      console.log("2. GPT로 주제 추출 시작");
    }
    const gptTopicResp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "너는 한국 뉴스 편집자야.",
          },
          {
            role: "user",
            content: `
아래 10개의 한국 뉴스 기사 제목과 요약을 보고
1) 가장 많이 겹치는 핵심 주제를 뽑아라.
2) 그 주제와 가장 밀접한 기사 3개를 JSON으로 반환해라.

[선정 기준]
- 한국 내 이슈와 맥락을 우선한다. 글로벌 이슈라도 한국과의 연결고리를 분명히 하라.
- 최대한 넓고 일반 독자가 이해하기 "쉬운" 주제를 우선한다 (예: 경제, 기술, 문화, 교육, 공중보건, 환경 등)
- 너무 협소한 법리/세부 이슈/개별 인물 중심 서술(특정 학설·판결·정치인의 발언 등)은 피하고, 가능하면 상위 개념으로 일반화해라.
- 정치·사회 이슈도 가능하나, 특정 진영/인물의 입장에 치우치지 않는 중립적 주제명을 사용하라. 
- 주제명은 8단어 이하의 간결한 표현으로 작성하라.
- (중요) 너무 정치적이거나 너무 주제에 대해 깊이 들어가는 뉴스에 대해서는 기피하라
- 독자의 흥미를 자극할만한 주제나, 현시점 우리가 알아야 하는 뉴스에 대해 선별하라. 
- 일반적으로 넓게만 이야기하지 말고 정확히 어떤 내용에 대해 말하는지를 설명하라. 
예를 들어 누가 누군가를 비판했다고 하면, ~라는 것 때문에 비판했음을 명시해야한다. 

추후 아래와 같은 느낌의 뉴스를 뽑을 수 있도록 리소스를 가져와라 : (같은 주제, 같은 내용을 의미하는게 아님)
걸그룹 에스파의 카리나가 최근 인스타그램에 숫자 '2'가 새겨진 붉은색 점퍼를 올렸다가 정치색 논란에 휩싸였습니다. 카리나는 곧바로 해당 게시물을 삭제했지만, 온라인에서는 상징 해석을 두고 갑론을박이 이어지고 있습니다.,
KT 가입자들을 향한 소액결제 피해가 새벽 시간대에 집중적으로 발생한 가운데, 이번 사태는 사실 13년 전부터 경고된 ‘예견된 참사’였다는 비판이 제기된다. 2012년 KISA가 “펨토셀 보안 취약점 연구”를 통해 인증토큰 복제, 중간자 공격 가능성 등을 포함한 29가지 위협을 보고했음에도, 그 경고는 제대로 반영되지 않았다는 것이다. 이상휘 의원은 “13년 전 경고를 흘려들은 결과가 이번 해킹 참사로 되돌아왔다”고 지적했다.,
이재용 삼성전자 회장의 장남 이지호 씨(24)가 해군 장교로 자원입대했다. 그는 미국 국적을 포기하고 한국 국적만 유지한 뒤, 해군 학사장교 139기로 입영했다. 훈련 기간 11주 후 12월 1일 해군 소위로 임관할 예정이며, 이후 의무 복무 기간 36개월, 총 복무 기간은 39개월이다. 이씨는 복수 국적자였는데, 병역 의무를 수행하기 위해 미국 시민권을 포기한 점이 주목받고 있다. 입대 사진이 공개되자 네티즌들은 과거 어린 시절 사진과 비교하면서 외모가 많이 성장했다는 반응이 많았고, 특히 할아버지인 이건희 회장과 닮았다는 의견도 나왔다.,
2025년 9월 4일 미국 조지아주 엘러벨 현대·LG 배터리 공장 건설 현장에서 대규모 이민 단속이 실시되면서 한국인 노동자들을 포함한 약 475명이 체포되었습니다. 미국 당국은 이들에게 체류 허가를 검토할 수 있다는 제안을 했지만, 대부분은 이를 거절하고 귀국을 선택했습니다. 결국 2025년 9월 12일 316명의 한국인 노동자들이 인천국제공항을 통해 귀국하였습니다. 일부 귀국자는 “다시는 미국에 일하러 가지 않겠다”고 말하며 구금 과정에서의 열악한 처우와 정신적 충격을 토로하였습니다. 한국 사회에서는 이들을 수갑과 쇠사슬로 이송한 미국 당국의 처우를 두고 “전쟁포로보다 못한 취급”이라는 비판이 제기되었으며, 정부는 이를 계기로 새로운 비자 제도 개편을 추진하겠다고 밝혔습니다.

[주의]
- 특정 개인이나 정당, 단체의 입장을 '사실'처럼 단정하지 말라.
- 오해 소지가 있는 전문 용어는 가능한 한 상위 개념으로 바꿔라.

기사 목록:
${articles.map((a: any, i : number) => `${i + 1}. ${a.title} - ${a.snippet}`).join("\n")}

출력 예시:
{
  "topic": "주제",
  "articles": [
    {"title": "...", "snippet": "..."},
    {"title": "...", "snippet": "..."},
    {"title": "...", "snippet": "..."}
  ]
}
`,
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }
    );

    const parsed = JSON.parse(gptTopicResp.data.choices[0].message.content);
    const trendTopic = parsed.topic;
    const selectedArticles = parsed.articles;

    // 3. GPT → 뉴스레터용 기사 작성
    if (isNewsLogEnabled) {
      console.log("3. GPT로 기사 작성 시작...");
    }
    const gptResp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "너는 한국 뉴스를 해외 독자에게 풀어내는 뉴스레터 기자이자 한국어 표현 해설 전문가야.",
          },
          {
            role: "user",
            content: `
다음 기사를 바탕으로 한국어 뉴스레터용 콘텐츠를 만들어라.

⚡ 지역/맥락 지침:
- 한국 독자를 기준으로 한국 내 맥락과 영향(정책, 생활, 산업, 문화 등)을 중심으로 설명하라.
- 글로벌 이슈라면 한국과의 연결고리(한국의 반응/영향/사례/데이터)를 반드시 포함하라.

⚡ 작성 원칙(중요):
- 중립적이고 균형 잡힌 어조를 유지하라. 특정 개인/정당/단체의 입장을 사실처럼 단정하지 말 것.
- 논쟁적이거나 오해 소지가 있는 사안은 사실(팩트)과 해석(의견)을 분리해서 서술하라.
- 특정 발언·학설·판결 등에 대해 찬반/지지/반대를 귀속시키지 말고, 맥락을 일반 독자가 이해할 수 있게 상위 개념으로 설명하라.
- 전문 용어는 가능한 한 일상 언어로 풀어, 일반 독자가 쉽게 이해할 수 있도록 하라.
- 기사 안에서 한국어 특유의 문화·사회적 맥락이 담긴 표현들을 적극적으로 사용하라.(정치색, 금수저, 자원입대, 눈치보다 등) 이것이 추후 한국어적 표현으로 담긴다. 

⚡ 요구사항:
1. 300자 내외의 한국어 기사 작성.
2. 반드시 '한국어적 표현' 1개 이상 포함.(연어,한국어 독자들이 영어로 어떻게 말하지 궁금해 할법한, 직역으론 안되는 단어)
3. 그 표현에 대해 직역(X), 의역(O), 의역이 필요한 이유 설명까지 제공.
4. 영어 번역은 의역 중심으로 자연스럽게.
5. 출력은 반드시 아래 포맷을 지킬 것.
6. 기사는 단 한가지 주제에 대해서만 쓸 것. 
7. 특정 인물의 발언을 다루더라도, 그 인물이 해당 입장에 동의/지지한다고 추정하지 말 것.
8. 구체적인 인물의 발언이나 사건을 중심으로 뉴스 작성
- "~라고 발언했습니다", "~에서 발표했습니다", "~에 따르면" 등 뉴스 문체 사용
- 추상적 논의보다는 실제 일어난 사건이나 발표 중심으로 구성하되, 시작을 그렇게 할 것이지 끝까지 무조건 그렇게 할 필요는 없음. 
즉 주제를 끌고오는 과정에서 추상적 논의로 서두를 시작하기 보다는 구체적 사건으로 시작하라는 말임. 
예를 들어, 최근 한국 사회에서 사법부에 대한 불신이 커지고 있다는 우려의 목소리가 높아지고 있습니다"는 잘못된 방향.
개선: "이재명 민주당 대표가 오늘 국회에서 '사법부 개혁이 시급하다'고 발언했습니다" 같은 구체적 사건을 시작으로 서술해야함.

출력 포맷:
한국어 기사 : ...
영어 번역(의역 중심) : ...
한국어적 표현 : ...
영어 직역(X) : ...
영어 의역(O) : ...
왜 의역이 이렇게 되는지 : ...

예시:
한국어 기사 : 걸그룹 에스파의 카리나가 최근 인스타그램에 숫자 '2'가 새겨진 붉은색 점퍼를 올렸다가 정치색 논란에 휩싸였습니다. 카리나는 곧바로 해당 게시물을 삭제했지만, 온라인에서는 상징 해석을 두고 갑론을박이 이어지고 있습니다.
영어 번역(의역 중심) : Karina from aespa faced backlash after posting a photo in a red jumper with the number "2," which many interpreted as a political statement. She quickly deleted it, but online debate continues over the symbolism.
한국어적 표현 : 정치색
영어 직역(X) : political color
영어 의역(O) : political leaning
왜 의역이 이렇게 되는지 : 영어에서 "color"는 물리적 색상에 국한되며 은유적으로 정치적 성향을 표현하지 않음. 따라서 "leaning"이 자연스럽다.

한국어 기사 : KT 가입자들을 향한 소액결제 피해가 새벽 시간대에 집중적으로 발생한 가운데, 이번 사태는 사실 13년 전부터 경고된 ‘예견된 참사’였다는 비판이 제기된다. 2012년 KISA가 “펨토셀 보안 취약점 연구”를 통해 인증토큰 복제, 중간자 공격 가능성 등을 포함한 29가지 위협을 보고했음에도, 그 경고는 제대로 반영되지 않았다는 것이다. 이상휘 의원은 “13년 전 경고를 흘려들은 결과가 이번 해킹 참사로 되돌아왔다”고 지적했다.
영어 번역(의역 중심) : Amid the wave of small-payment fraud targeting KT users in the early hours, critics say this incident was a “foreseeable disaster” warned about 13 years ago. Back in 2012, KISA reportedly published a “femtocell security vulnerability study” listing 29 threat scenarios, including token duplication and man-in-the-middle attacks — yet none were properly addressed. Representative Lee Sang-hui asserted, “Ignoring warnings from 13 years ago has come back to haunt us in this hacking disaster.”
한국어적 표현 : 소액결제 시스템
영어 직역(X) : micro-payment system
영어 의역(O) : small-payment system
왜 의역이 이렇게 되는지 : ‘소액결제’는 단순히 ‘micropayment’로 번역되지 않으며, 금융·블록체인 업계에서는 ‘초미세 단위 결제’를 뜻하는 전문 용어로 쓰인다. 한국에서 말하는 ‘소액결제’는 일상적 맥락의 휴대폰·온라인 결제를 지칭하므로, 영어에서는 ‘small-payment system’이 더 자연스럽고 의미도 정확하게 전달된다.

참고 기사:
${selectedArticles.map((a: any) => `- ${a.title}: ${a.snippet}`).join("\n")}
`,
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }
    );

    const articleRaw = gptResp.data.choices[0].message.content;

    // 4. GPT 결과 파싱 → DB 저장용
    if (isNewsLogEnabled) {
      console.log("4. DB 저장 준비...");
    }
    const parsedArticle = {
      korean_article: articleRaw.match(/한국어 기사\s*:\s*(.*)/)?.[1] || "",
      english_translation:
        articleRaw.match(/영어 번역.*:\s*(.*)/)?.[1] || "",
      expression: articleRaw.match(/한국어적 표현\s*:\s*(.*)/)?.[1] || "",
      literal_translation:
        articleRaw.match(/영어 직역\(X\)\s*:\s*(.*)/)?.[1] || "",
      idiomatic_translation:
        articleRaw.match(/영어 의역\(O\)\s*:\s*(.*)/)?.[1] || "",
      reason: articleRaw.match(/왜 의역이 이렇게 되는지\s*:\s*(.*)/)?.[1] || "",
    };

    // 5. Prisma로 DB 저장 (PostgreSQL)
    const result = await prisma.article.create({
      data: {
        trendTopic,
        koreanArticle: parsedArticle.korean_article,
        englishTranslation: parsedArticle.english_translation,
        expression: parsedArticle.expression,
        literalTranslation: parsedArticle.literal_translation,
        idiomaticTranslation: parsedArticle.idiomatic_translation,
        reason: parsedArticle.reason,
        createdAt: new Date(),
      }
    });

    if (isNewsLogEnabled) {
      console.log(" 일일 뉴스 생성 완료:", result);
    }
    return { success: true, data: result };
  } catch (err: any) {
    console.error("뉴스 생성 실패 - 전체 에러:", err);
    return { success: false, error: err.message };
  }
}

// 관리자용 함수들 추가
export async function deleteAllNews() {
  try {
    const result = await prisma.article.deleteMany({});
    console.log(`모든 뉴스 삭제 완료: ${result.count}개`);
    return { success: true, count: result.count };
  } catch (err: any) {
    console.error("뉴스 삭제 실패:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteNewsById(id: string) {
  try {
    await prisma.article.delete({ where: { id } });
    console.log(`뉴스 삭제 완료: ${id}`);
    return { success: true };
  } catch (err: any) {
    console.error("뉴스 삭제 실패:", err);
    return { success: false, error: err.message };
  }
}