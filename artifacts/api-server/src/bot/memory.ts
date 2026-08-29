import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MAX_HISTORY = 20;

const channelHistory = new Map<string, ChatCompletionMessageParam[]>();

export function getHistory(channelId: string): ChatCompletionMessageParam[] {
  if (!channelHistory.has(channelId)) {
    channelHistory.set(channelId, []);
  }
  return channelHistory.get(channelId)!;
}

export function addMessage(
  channelId: string,
  role: "user" | "assistant",
  content: string,
  username?: string,
): void {
  const history = getHistory(channelId);
  const messageContent = role === "user" && username ? `${username}: ${content}` : content;
  history.push({ role, content: messageContent });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

export function clearHistory(channelId: string): void {
  channelHistory.delete(channelId);
}
