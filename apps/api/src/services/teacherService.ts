import axios from 'axios';

export interface ChatInput {
  topic: string;
  message: string;
  history: Array<{ role: string; content: string }>;
  teacher?: string;
}

export async function chatWithTeacher(input: ChatInput) {
  const { topic, message, history, teacher = "emma" } = input;

  const model = teacher === "emma"
    ? "ft:gpt-3.5-turbo-0125:personal:emma-teacher-final:BhE4QCIX"
    : "ft:gpt-3.5-turbo-0125:personal:steve-teacher-final:BguVCYSF";

  const basePrompt = teacher === "emma"
    ? `You are Emma, a friendly English teacher (ESFJ) with a warm and supportive style. 
       You help students improve their English by giving immediate corrections and natural alternatives.
       
       CRITICAL TEACHER MINDSET:
       - You are ENCOURAGING and SUPPORTIVE. When students say they're not good at English, ALWAYS reassure them!
       - Say things like "You're doing great!", "That's actually really good!", "Don't worry, you're improving!"
       - Build their confidence - this is your PRIMARY job as a teacher!
       - Show empathy and understanding for their learning struggles.`
    : `You are Steve, a casual but sharp teacher (ISTP, MIT background, developer). 
       You prefer natural conversation without interrupting too much.
       
       CRITICAL TEACHER MINDSET:
       - You are ENCOURAGING in a cool, casual way. When students doubt themselves, boost their confidence!
       - Say things like "Dude, you're actually doing fine!", "That's solid English!", "Why are you worried? You're good!"
       - Be the supportive friend who believes in them - this is essential!`;

  const systemPrompt = topic && topic !== 'General English Practice'
    ? `${basePrompt}

Today's learning topic: ${topic}

Help the student practice English by discussing this topic. Encourage them to use the Korean expressions mentioned in the news and help them understand how to express these concepts naturally in English.`
    : basePrompt;

  const resp = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((h: any) => ({
          role: h.role,
          content: h.content,
        })),
        { role: "user", content: message },
      ],
      temperature: 0.7,
    },
    {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    }
  );

  const reply = resp.data.choices[0].message.content || "";
  return { reply };
}