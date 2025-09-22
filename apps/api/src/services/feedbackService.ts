import axios from 'axios';
import prisma from '../db';

export interface FeedbackInput {
  sessionId: string;
  userId: string;
  messages: Array<{ role: string; content: string }>;
  teacher: string;
  topic: string;
}

export async function analyzeFeedback(input: FeedbackInput) {
  const { sessionId, userId, messages, teacher, topic } = input;

  const conversationText = messages
    .map((msg: any) => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `다음은 한국인 영어 학습자와 AI 선생님 간의 채팅 대화입니다. 
주제: ${topic}
선생님: ${teacher}

대화 내용:
${conversationText}

OPIc 채점 기준을 참고하여 이 학습자의 영어 실력을 평가해주세요.

다음 JSON 형식으로 분석 결과를 제공해주세요:

{
  "overall_score": 7.2,
  "overall_grade": "IM",
  "grammar_score": 7.0,
  "vocabulary_score": 7.5,
  "fluency_score": 7.0,
  "comprehension_score": 8.0,
  "naturalness_score": 6.8,
  "strengths": [
    "주제에 대한 이해도가 높고 적절한 응답을 제공함",
    "기본적인 문법 구조를 잘 활용함"
  ],
  "improvements": [
    "더 다양한 어휘 사용으로 표현력 향상 필요",
    "복잡한 문장 구조 연습 권장"
  ],
  "corrections": [
    {
      "original": "I think this is very good news",
      "corrected": "I think this is really great news",
      "reason": "very보다 really가 더 자연스러운 강조 표현"
    }
  ],
  "recommended_focus": "어휘력 확장",
  "next_topics": ["시사 이슈", "일상 대화"]
}`;

  const analysisResponse = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Analyze this conversation: ${conversationText}` }
      ],
      temperature: 0.3
    },
    {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    }
  );

  let feedbackData;
  try {
    feedbackData = JSON.parse(analysisResponse.data.choices[0].message.content);
  } catch (parseError) {
    feedbackData = {
      overall_score: 7.0,
      overall_grade: "IM",
      grammar_score: 7.0,
      vocabulary_score: 7.0,
      fluency_score: 7.0,
      comprehension_score: 7.0,
      naturalness_score: 7.0,
      strengths: ["자연스러운 대화 참여"],
      improvements: ["더 다양한 표현 연습"],
      corrections: [],
      recommended_focus: "어휘력 향상",
      next_topics: ["일상 대화", "뉴스 토론"]
    };
  }

  const result = await prisma.feedbackAnalysis.create({
    data: {
      sessionId,
      userId,
      overallScore: feedbackData.overall_score,
      overallGrade: feedbackData.overall_grade,
      grammarScore: feedbackData.grammar_score,
      vocabularyScore: feedbackData.vocabulary_score,
      fluencyScore: feedbackData.fluency_score,
      comprehensionScore: feedbackData.comprehension_score,
      naturalnessScore: feedbackData.naturalness_score,
      strengths: feedbackData.strengths || [],
      improvements: feedbackData.improvements || [],
      corrections: JSON.stringify(feedbackData.corrections || []),
      recommendedFocus: feedbackData.recommended_focus,
      nextTopics: feedbackData.next_topics || []
    }
  });

  return result;
}