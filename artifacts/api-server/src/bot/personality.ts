const guildPersonality = new Map<string, string>();

export function getCustomPersonality(guildId: string | null): string | null {
  if (!guildId) return null;
  return guildPersonality.get(guildId) ?? null;
}

export function setCustomPersonality(guildId: string, text: string): void {
  guildPersonality.set(guildId, text);
}

export function resetCustomPersonality(guildId: string): void {
  guildPersonality.delete(guildId);
}
