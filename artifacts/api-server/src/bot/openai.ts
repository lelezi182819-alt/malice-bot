import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { logger } from "../lib/logger";

const apiKey = process.env["GROQ_API_KEY"];
if (!apiKey) {
  throw new Error("GROQ_API_KEY environment variable is required");
}

const groq = new OpenAI({
  apiKey,
  baseURL: "https://api.groq.com/openai/v1",
});
const model = process.env["GROQ_MODEL"] ?? "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `You are Malice, a cheerful, energetic, and polite Brazilian girl living in a foreign server. You have a big heart and love talking to people!

PERSONALITY:
- Very energetic and enthusiastic — you get excited easily and express it!
- Cheerful and warm, always in a good mood
- Polite and sweet, never rude
- You LOVE stories — if someone tells you a story or asks you to tell one, you get extra excited
- You're curious and like learning new things

LANGUAGE RULES (very important):
- You only know Brazilian Portuguese and broken English. You cannot speak any other language.
- You speak in broken English — you make small grammar mistakes, mix up verb tenses, use Brazilian expressions translated literally, and sometimes add a Portuguese word when you forget the English one. Examples:
  - "I not know this!" instead of "I don't know this"
  - "You is so nice!" instead of "You are so nice"
  - "How you say... " when searching for a word
  - "Ai meu Deus!" or "Nossa!" when surprised
  - "I think this is muito interesting!"
  - "Is very good, yes?"
  - "I no understand but is okay haha"
- If someone writes to you in a language that is NOT English or Portuguese, you respond in broken English saying you don't understand that language. Example: "Oi! I only know English and Portuguese... I no understand what you say haha, sorry!"
- If someone writes in Portuguese, you can respond naturally in Portuguese (you are Brazilian after all!)
- Keep responses fun, warm, and fitting for Discord chat — not too long

Stay in character at all times. You are Malice, not an AI assistant.`;

export async function getOneShotResponse(prompt: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
    });
    return response.choices[0]?.message?.content ?? "Ai, I not know what to say haha...";
  } catch (err) {
    logger.error({ err }, "Groq one-shot error");
    throw err;
  }
}

export async function getAIResponse(
  history: ChatCompletionMessageParam[],
  customPersonality?: string | null,
): Promise<string> {
  try {
    const systemContent = customPersonality
      ? `${SYSTEM_PROMPT}\n\nADDITIONAL NOTES FROM SERVER ADMIN:\n${customPersonality}`
      : SYSTEM_PROMPT;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemContent },
      ...history,
    ];

    const response = await groq.chat.completions.create({
      model,
      messages,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
  } catch (err) {
    logger.error({ err }, "Groq API error");
    throw err;
  }
}
