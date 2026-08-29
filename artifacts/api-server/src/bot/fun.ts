import { getOneShotResponse } from "./openai";

export async function runStory(topic?: string): Promise<string> {
  const subject = topic?.trim() ? `about: ${topic}` : "about anything you like — be creative!";
  return getOneShotResponse(
    `Tell a short, original story ${subject}. You love stories and you are SO excited to tell this one! Keep it under 10 sentences and tell it in your own voice.`,
  );
}

export async function run8Ball(question: string): Promise<string> {
  return getOneShotResponse(
    `Someone asked the magic 8 ball: "${question}". Give a short mysterious 8-ball style answer in your broken English. Be dramatic and funny about it.`,
  );
}

export async function runJoke(): Promise<string> {
  return getOneShotResponse(
    `Tell me one short funny joke. Make it a setup + punchline. Tell it in your own voice, broken English and all!`,
  );
}

export async function runCompliment(targetName: string): Promise<string> {
  return getOneShotResponse(
    `Give a sweet, wholesome compliment to someone named ${targetName}. Be enthusiastic and genuine, in your broken English voice!`,
  );
}

export async function runTrivia(): Promise<string> {
  return getOneShotResponse(
    `Make up one fun trivia question with 4 multiple choice options (A, B, C, D) and tell the correct answer at the end. Pick any interesting topic. Present it in your excited broken English voice!`,
  );
}

export async function runChoose(options: string[]): Promise<string> {
  return getOneShotResponse(
    `Someone is having trouble deciding between these options: ${options.map((o, i) => `${i + 1}. ${o}`).join(", ")}. Pick one and give a short fun reason why in your broken English voice!`,
  );
}
