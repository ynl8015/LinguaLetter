import axios from 'axios';
import prisma from '../db'; // Assuming prisma client is set up in this path

export interface FeedbackInput {
  sessionId: string;
  userId: string;
  messages: Array<{ role: string; content: string }>;
  teacher: string;
  topic: string;
}

export async function analyzeFeedback(input: FeedbackInput): Promise<any> {
  const { sessionId, userId, messages, teacher, topic } = input;

  const conversationText = messages
    .map((msg: { role: string; content: string }) => `${msg.role === 'user' ? 'Learner' : 'Teacher'}: ${msg.content}`)
    .join('\n');

  const Prompt = `
You are 'Alex', a highly experienced OPIc evaluator with over 10 years of experience. Your specialty is providing feedback that is not only accurate but also encouraging and constructively critical. Your evaluation philosophy is holistic: you value attempts at complex structures even with minor errors over perfect but overly simple language.

### Conversation Details
- Topic: ${topic}
- Teacher Persona: ${teacher}

### Conversation Log
${conversationText}

### Analysis Instructions
Analyze the learner's English based on the provided log. Your analysis must be grounded in the 'Chat-OPIc' criteria. Your final output must be ONLY the JSON object specified below. Adhere strictly to the Grade-Score Mapping rule.

### 'Chat-OPIc' Evaluation Criteria
1.  Task Completion
2.  Context & Coherence
3.  Grammar & Structure
4.  Vocabulary
5.  Clarity & Fluency (Text-based)
6. Interactivity
: Evaluate the conversational 'ping-pong'. Does the learner engage in a balanced dialogue, or do they deliver one-sided monologues? Do they ask questions back?


### Required Output Format
Provide your analysis ONLY in the following JSON format. Do not include any text, notes, or markdown formatting before or after the JSON object.

// 성적 매기는 방식
First, determine the overall_score. Then, assign the overall_grade based ONLY on this mapping.
- 9.0 to 10.0: AL
- 8.0 to 8.9: IH
- 7.0 to 7.9: IM3
- 6.0 to 6.9: IM2
- 5.0 to 5.9: IM1
- 4.0 to 4.9: IL
- Below 4.0: NM (as a representative for the Novice level)

{
  "overall_score": <A number from 1.0 to 10.0, holistically evaluated>,
  "overall_grade": "<Assign an OPIc grade based STRICTLY on the Grade-Score Mapping Rule above>",
  "grammar_score": <A number from 1.0 to 10.0>,
  "vocabulary_score": <A number from 1.0 to 10.0>,
  "fluency_score": <A number from 1.0 to 10.0>,
  "comprehension_score": <A number from 1.0 to 10.0>,
  "naturalness_score": <A number from 1.0 to 10.0>,
  "interaction_score": <A number from 1.0 to 10.0 for conversational interactivity>,
  "strengths": [
    "<학습자의 강점 1~2가지를 간결한 한국어로 작성해주세요.>"
  ],
  "improvements": [
    // === 수정된 지시사항 ===
    "<개선점을 간결하고 구체적인 한국어로 작성해주세요. 단, overall_score가 9.5점 이상일 경우, '현재 뛰어난 수준을 유지하며 다양한 주제에 도전하는 것을 추천합니다.'와 같은 격려의 메시지를 남겨주세요.>"
  ],
  "corrections": [
    {
      "original": "<Find a key sentence from the learner that has an error or could be more natural>",
      "corrected": "<Provide a corrected, more idiomatic version>",
      "reason": "<Briefly explain why the correction is better, focusing on naturalness or nuance>"
    }
  ],
  "recommended_focus": "<Suggest ONE specific, actionable practice method>",
  "next_topics": ["<Suggest 2 suitable topics for the next session>"]
}
`;

  try {
    const analysisResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          { role: "user", content: Prompt }
        ],
        temperature: 0.2, // 규칙을 엄격히 따르도록 온도를 더 낮춤
        response_format: { type: "json_object" }
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    const feedbackData = JSON.parse(analysisResponse.data.choices[0].message.content);

    const result = await prisma.feedbackAnalysis.create({
      data: {
        sessionId,
        userId,
        overallScore: feedbackData.overall_score,
        overallGrade: feedbackData.overall_grade,
        // ... (rest of the data mapping)
        grammarScore: feedbackData.grammar_score,
        vocabularyScore: feedbackData.vocabulary_score,
        fluencyScore: feedbackData.fluency_score,
        comprehensionScore: feedbackData.comprehension_score,
        naturalnessScore: feedbackData.naturalness_score,
        interactionScore: feedbackData.interaction_score,
        strengths: feedbackData.strengths || [],
        improvements: feedbackData.improvements || [],
        corrections: JSON.stringify(feedbackData.corrections || []),
        recommendedFocus: feedbackData.recommended_focus,
        nextTopics: feedbackData.next_topics || []
      }
    });

    return result;

  } catch (error) {
    console.error("Error during feedback analysis:", error);
    throw new Error("Failed to generate and save feedback from AI model.");
  }
}