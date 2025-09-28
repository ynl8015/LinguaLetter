<img width="1172" height="364" alt="Image" src="https://github.com/user-attachments/assets/779f3936-e0cf-4a6e-9394-f661840e54c4" />

# ✉️ LinguaLeter(링구아레터) 서비스 소개
<br>
<div align="center">
<strong>직역을 넘어서, <br>
한국을 영어로 풀어내는 뉴스레터</strong>
<br>
  <br>
바로 공부하러 가기 : https://lingualetter.ai.kr/
  
</div>
<br>
<br>
<br>
<br>

# 💡 서비스 기획배경/소개
<div align="center">
영어 학습자는 말하고 싶은것이 있어도
<br>
원어민스러운 단어를 학습하기 쉽지 않습니다.
<br>
<img width="400" height="200" alt="Image" src="https://github.com/user-attachments/assets/94cc01fe-9e95-42ed-ba8e-1451c4e198c1" />
<br>
<br>
"어디에서" "어떻게" 
정보를 얻을지 모르기 때문입니다. 
<br>
그냥 번역기로 그대로 돌려버리면,
<br>
문화적 뉘앙스가 전달되지 않는 오류가 생깁니다.
<br>
<br>
<img width="800" height="300" alt="Image" src="https://github.com/user-attachments/assets/e51e1ba7-dabe-484c-8e7a-ef5e7b91dbaa" />
<br>
<br>
  /
<br>
<br>

그래서, 우리 서비스는,
<br>
손쉽게 메일로 받아보는 "의역"을 담은 뉴스레터를 생각해냈습니다.
<br>
<br>
//
<br>
<br>
<strong>
뉴스레터 속 "영어표현"을 익히고,
  <br>
이를 "영어교육학"에 기반해 파인튜닝한 선생님 AI 모델과 함께 복습하면서,
  <br>
영어실력을 키워보세요!
</strong>
</div>

![Image](https://github.com/user-attachments/assets/4bd6e7f7-32bb-47d8-863e-7b2f4c3ae6cb)


# 🔗 주요 기능
## 1️⃣ 원클릭 로그인 기능
최대한 빠르게, 부담없이 접근할 수 있도록,

카카오, 구글 로그인 구현

JWT 인증, 동의서 관리 로직 구현
<br>
<br>
<img width="900" height="600" alt="Image" src="https://github.com/user-attachments/assets/5c2708cb-67db-4a8d-845a-faa2f7ca8d69" />
<br>

## 2️⃣ 구독 기능
손쉬운 구독, 해지로 부담감, 진입장벽을 낮추다.

![Image](https://github.com/user-attachments/assets/1e471e0b-c8c1-4f08-856a-a7a7d964865d)
<br>


## 3️⃣ 자동뉴스생성 기능
자동 뉴스 생성과, 수동 뉴스 수정이 가능한 하이브리드 구조로, 질 높은 기사를 작성

SERP API를 통해 구글 뉴스 10가지를 고르고, 

GPT-4o-mini를 통해 가장 유의미한 주제 선정,

다시, GPT-4o-mini로 조건에 맞는 기사 작성까지.

가장 효과적인 AI 프롬프팅과 알고리즘을 구현.

![Image](https://github.com/user-attachments/assets/d3e56fe2-09f9-42f7-a1af-59735a9c8d49)

## 4️⃣ 스케쥴링 기능
node-cron 기반 안정적이고 검증된 스케줄링 라이브러리

타임존 최적화 Asia/Seoul 기준으로 한국 사용자에게 최적화

리소스 관리 메모리 효율적인 스케줄러 관리

## 5️⃣ 이메일발송 기능
Nodemailer 대신, Sendgrid를 사용해 백엔드 배포환경(Railway)에 더 잘 맞는 설정

<img width="1468" height="797" alt="Image" src="https://github.com/user-attachments/assets/2640e1dd-214e-4865-8a0f-c407f389c872" />

## 6️⃣ 채팅 기능

### *영어언어학에 기반한 AI 영어교사 모델 파인튜닝*

일반 AI모델과는 다르게,

선생님이라는 자아가 있으며, 꼬리질문이 가능하고, 정서적 격려가 가능

학생들의 영어 발화를 최대한 이끌어 줄 수 있도록 영어교육학 논문 다수 참고해 설계

피드백 제시 방법에 따라 두 선생님 선택 가능

![Image](https://github.com/user-attachments/assets/325d972b-b9a2-4f7c-99da-04152cc2fa42)

## 7️⃣ 피드백 기능
오픽 채점 기준을 그대로 반영해, 

채점하고 피드백을 **레이더 차트로 시각화**

<img width="1390" height="794" alt="Image" src="https://github.com/user-attachments/assets/656a8468-d6f2-4974-8dfd-8b040eebf807" />

## 8️⃣ 반응형 디자인

모바일에서도 사용 가능한 친화적 디자인

<img width="296" height="439" alt="Image" src="https://github.com/user-attachments/assets/5093c1b7-6df9-4854-aab1-c8633677e398" />
<img width="350" height="440" alt="Image" src="https://github.com/user-attachments/assets/0914f82e-8060-4dca-b424-c0711d697996" />

<br>
<br>
<br>

# ⚙️ 개발 원칙

## 빠른 실행과 MVP 우선 전략
- 완벽한 기능보다 **핵심 가치 전달**을 최우선으로 함  
- “뉴스 → 메일 발송” 플로우를 **MVP**로 설정하고, 이후 학습 존 및 웹 인터페이스로 확장  
- 초기 사용자 피드백을 빠르게 수집해 **서비스 방향을 유연하게 조정**

## 생성형 AI와 프로토타이핑
- **Figma + Generation AI**를 활용해 프로토타입을 단기간 제작  
- 반복적 시각화 과정을 줄이고, 실제 구현 단계에 리소스를 집중  
- **빠른 시도–빠른 검증** 사이클을 통해 제품 완성도 점진적 향상

## CI/CD 중심의 자동화
- GitHub Actions를 활용해 **Vercel(Web) → Render·Railway(API) → Cloudflare(DNS)** 로 이어지는 자동 파이프라인 구축  
- 코드 병합 시 자동 배포가 이루어지는 환경 조성  
- 팀 협업 상황에서도 안정적이고 신속한 배포 보장

##  애자일 기반 개선
- **계획 → 실행 → 피드백 → 개선** 주기를 짧게 가져가며 서비스가 실제 동작하는 것을 최우선으로 함  
- 작은 단위의 실험으로 실패 비용을 최소화  
- CI/CD 자동화를 통해 빠른 품질 개선을 위한 파이프라인을 확보

<br>
<br>
<br>

# 🛠 기술 스택

| Category       | Stack |
|----------------|-------|
| **Common**     | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![pnpm](https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white) ![TurboRepo](https://img.shields.io/badge/Turbo-000000?style=flat-square&logo=turborepo&logoColor=white) ![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=flat-square&logo=prettier&logoColor=black) ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white) |
| **Frontend**   | ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white) ![Apollo](https://img.shields.io/badge/Apollo%20Client-311C87?style=flat-square&logo=apollographql&logoColor=white) |
| **Backend**    | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) ![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white) ![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=flat-square&logo=graphql&logoColor=white) ![Apollo Server](https://img.shields.io/badge/Apollo%20Server-311C87?style=flat-square&logo=apollographql&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) |
| **External**   | ![OpenAI](https://img.shields.io/badge/OpenAI%20GPT--4o%20mini-412991?style=flat-square&logo=openai&logoColor=white) ![SerpApi](https://img.shields.io/badge/SerpApi-4285F4?style=flat-square&logo=google&logoColor=white) ![SendGrid](https://img.shields.io/badge/SendGrid-0085CA?style=flat-square&logo=sendgrid&logoColor=white) ![Google](https://img.shields.io/badge/Google%20OAuth-4285F4?style=flat-square&logo=google&logoColor=white) ![Kakao](https://img.shields.io/badge/Kakao%20OAuth-FFCD00?style=flat-square&logo=kakao&logoColor=000000) |
| **Deployment** | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white) ![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) |
| **Collaboration** | ![Notion](https://img.shields.io/badge/Notion-000000?style=flat-square&logo=notion&logoColor=white) ![Figma](https://img.shields.io/badge/Figma-F24E1E?style=flat-square&logo=figma&logoColor=white) ![Slack](https://img.shields.io/badge/Slack-4A154B?style=flat-square&logo=slack&logoColor=white) |

<br>
<br>
<br>
<br>

# 핵심 경험
## FE 기술적 도전
### GraphQL + REST API 하이브리드 아키텍처 구축

❓ Problem: 모든 통신을 GraphQL로 통일하려 했지만, 파일 업로드, 외부 OAuth 콜백, 이메일 발송 등 특정 기능들은 REST API가 더 적합했습니다.

❗ Solved: 핵심 데이터 조회는 GraphQL, 특수 기능은 REST API로 분리하는 하이브리드 구조를 설계했습니다. Apollo Client와 Fetch API를 함께 사용하여 각 통신 방식의 장점을 극대화했습니다.

### Turbo 모노레포 환경에서의 의존성 충돌 해결

❓ Problem: 프론트엔드와 백엔드 간 패키지 버전 충돌이 지속적으로 발생하고, workspace 설정이 복잡했습니다.

❗ Solved: pnpm workspace와 Turbo의 캐싱 전략을 최적화하여 공통 의존성은 루트에서 관리하고, 각 앱별 고유 의존성만 분리했습니다. 개발 환경 안정성을 크게 향상시켰습니다.

### OAuth 플랫폼별 회원가입/로그인 플로우 통합

❓ Problem: 구글과 카카오의 OAuth 구조가 달라서 동의서 처리 로직과 토큰 관리가 복잡했습니다.

❗ Solved: 임시 토큰과 정규 토큰을 구분하는 이중 인증 시스템을 구현했습니다. 플랫폼별 차이점을 추상화하여 통일된 사용자 경험을 제공하면서도 각 플랫폼의 특성을 살렸습니다.

### Lazy Loading 포기를 통한 UX 개선

❓ Problem: React Lazy Loading으로 번들 최적화를 했지만 메인 플로우에서 깜빡임 현상이 발생했습니다.

❗ Solved: 사용자 피드백을 반영해 핵심 경험에서는 일관된 로딩이 더 중요하다고 판단, Blocking Loading으로 전환했습니다. 기술적 완성도보다 사용자 만족도를 우선한 의사결정이었습니다.

### Cloudinary를 통한 이미지 렌더링 최적화

❓ Problem: 로컬 이미지 파일들의 로딩 지연으로 인한 사용자 경험 저하가 발생했습니다.

❗ Solved: 전체 이미지를 Cloudinary CDN으로 마이그레이션하여 글로벌 캐싱과 자동 최적화를 적용했습니다. 이미지 로딩 성능을 개선하고 CLS 문제를 해결했습니다.

## BE 기술적 도전
### AI 튜터 모델 파인튜닝을 통한 자연스러운 발화 구현

❓ Problem: 일반 AI 모델로는 교육적 맥락의 자연스러운 대화가 어려웠고, 기존 교육용 모델은 GPU 리소스 문제가 발생했습니다.

❗ Solved: 영어교육 전문가의 지식을 바탕으로 대화 데이터를 분석하고 정교하게 파인튜닝했습니다. 실제 인간 선생님의 대화 스타일과 피드백 방식을 재현하여 자연스러운 교육적 상호작용을 구현했습니다.

### 다단계 AI 모델 활용한 뉴스 생성 파이프라인

❓ Problem: 단일 프롬프트로는 한국 문화적 뉘앙스가 반영된 고품질 번역을 얻기 어려웠습니다.

❗ Solved: SERP API → 트렌드 분석 → 기사 생성 → 직역/의역 비교의 다단계 프로세스를 구축했습니다. 각 단계별로 서로 다른 모델과 프롬프팅 전략을 적용하여 문화적 맥락이 살아있는 학습 콘텐츠를 자동 생성했습니다.

### Railway 환경에서의 메일 발송 시스템 최적화

❓ Problem: Nodemailer의 SMTP 연결이 Railway 배포 환경에서 불안정했습니다.

❗ Solved: SendGrid Web API로 전환하여 클라우드 기반 안정성을 확보했습니다. 배치 처리와 에러 핸들링을 강화하여 안정적인 메일 전송 시스템을 구축했습니다.

## DevOps & 인프라 도전
### 멀티 플랫폼 OAuth 통합 인증 시스템

❓ Problem: 구글과 카카오의 OAuth 구조와 콜백 처리 방식이 상이해서 통합 관리가 복잡했습니다.

❗ Solved: 플랫폼별 어댑터 패턴을 적용해 차이점을 추상화하고, 공통 인증 플로우를 구축했습니다. 각 플랫폼의 특성을 살리면서도 일관된 사용자 경험을 제공했습니다.

<br>
<br>
<br>


# 👩‍💻 개발자 소개

| Name | Avatar | MBTI | Role |
|-----------|--------|------|------|
| **이유나** | <img width="80" height="80" alt="Image" src="https://github.com/user-attachments/assets/8d7bb0c4-3833-4fdb-9b25-c84bf861a7db" /> | INFP | FE (+BE) |
