import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Message,
} from "discord.js";
import { logger } from "../lib/logger";
import type { CommandResult } from "./commands";

const GIF_CATEGORY: Record<string, string> = {
  hug: "hug",
  pat: "pat",
  cuddle: "cuddle",
  slap: "slap",
  kiss: "kiss",
  tickle: "tickle",
  wave: "wave",
  poke: "poke",
  bite: "bite",
  bonk: "bonk",
  cry: "cry",
  laugh: "laugh",
  angry: "angry",
  blush: "blush",
  dance: "dance",
  marry: "blush",
};

const ACTION_COLOR: Record<string, number> = {
  hug: 0xff9ecd,
  pat: 0xffb347,
  cuddle: 0xff69b4,
  kiss: 0xff1493,
  tickle: 0xffd700,
  wave: 0x98fb98,
  poke: 0xffd1a9,
  blush: 0xffb6c1,
  dance: 0x9b59b6,
  marry: 0xff69b4,
  slap: 0xff4500,
  bite: 0xff4500,
  bonk: 0xff6600,
  angry: 0xff4500,
  cry: 0x6495ed,
  laugh: 0xffd700,
};

const BACK_LABEL: Record<string, string> = {
  hug: "Hug back! 🤗",
  pat: "Pat back! 🥰",
  cuddle: "Cuddle back! 💕",
  slap: "Slap back! 💢",
  kiss: "Kiss back! 💋",
  tickle: "Tickle back! 😂",
  wave: "Wave back! 👋",
  poke: "Poke back! 👉",
  bite: "Bite back! 😤",
  bonk: "Bonk back! 🔨",
};

const ACTION_TEXT: Record<string, (author: string, target: string) => string> = {
  hug: (a, t) => `${a} gave ${t} a big warm hug!! Nossa, que fofo!! 🤗`,
  pat: (a, t) => `${a} patted ${t}'s head gently! *pat pat* 🥰`,
  cuddle: (a, t) => `Aaaaw!! ${a} is cuddling with ${t}!! So cute haha!!`,
  slap: (a, t) => `EITA!! ${a} slapped ${t}!! O que foi isso?! 😱`,
  kiss: (a, t) => `${a} kissed ${t}!! Que romântico~!! 💋`,
  tickle: (a, t) => `HAHAHA!! ${a} is tickling ${t}!! Stop stop stop!!`,
  wave: (a, t) => `${a} is waving hello to ${t}!! Oi oi!! 👋`,
  poke: (a, t) => `${a} poked ${t}! *poke* Hehe, o que foi isso?? 👉`,
  bite: (a, t) => `${a} BITE ${t}!! Ai, que mordida!! 😤`,
  bonk: (a, t) => `BONK!! ${a} bonked ${t} on the head!! 🔨 Que pancada!!`,
};

const BACK_TEXT: Record<string, (backer: string, original: string) => string> = {
  hug: (b, o) => `${b} hugged ${o} back!! Ai que fofo, they is both so warm!! 🤗`,
  pat: (b, o) => `${b} patted ${o} back!! *pat pat* Que carinho, I love this!! 🥰`,
  cuddle: (b, o) => `${b} cuddled ${o} back!! Eita, que cute esses dois!! 💕`,
  slap: (b, o) => `${b} slapped ${o} BACK!! Eita!! Now they is even haha!! 💢`,
  kiss: (b, o) => `${b} kissed ${o} back!! Ai que romântico, meu Deus!! 💋`,
  tickle: (b, o) => `${b} is tickling ${o} back!! HAHAHA, now you suffer too!! 😂`,
  wave: (b, o) => `${b} waved back at ${o}!! Oi oi oi, que fofos!! 👋`,
  poke: (b, o) => `${b} poked ${o} back!! *poke* Hehe, gotcha!! 👉`,
  bite: (b, o) => `${b} bit ${o} back!! AI!! They not playing haha!! 😤`,
  bonk: (b, o) => `${b} bonked ${o} back!! BONK BONK!! Que pancada dupla!! 🔨`,
};

const MALICE_TEXT: Record<string, (author: string) => string> = {
  hug: (a) => `Aaaaw!! ${a} hugged ME!! I is so happy, obrigada!! 🤗`,
  pat: (a) => `Ehehe!! ${a} patted my head!! I like it haha, thank you!!`,
  cuddle: (a) => `*squish* Ai ai... okay okay, one cuddle!! You is so sweet haha!!`,
  slap: (a) => `OW!! ${a} slapped ME!! Que absurdo!! Why you do this?! 😤 *rubs cheek*`,
  kiss: (a) => `Ai NÃO!! No kisses!! *SLAP* 🖐️ ${a} take this back!! I not like it!!`,
  tickle: (a) => `HAHAHA ${a} STOP STOP!! You is tickling me and I cannot BREATHE HAHAHA!!`,
  wave: (a) => `OI OI OI!! ${a} waved to ME!! Hi hi hi!! I wave back so fast!! 👋`,
  poke: (a) => `Ai!! ${a} is poking me!! *poke poke* Chega haha, stop it!!`,
  bite: (a) => `OUCH!! ${a} BIT me?! Que absurdo!! I not a food, haha!!`,
  bonk: (a) => `OUCH!! ${a} bonked my head!! Ai que dor!! Why you do this?!`,
};

const SELF_TEXT: Record<string, (author: string) => string> = {
  cry: (a) => `${a} is crying... 😢 Ai não, don't cry!! I want to help!!`,
  laugh: (a) => `${a} is laughing SO MUCH!! 😂 Haha, what is so funny?!`,
  angry: (a) => `${a} is VERY angry right now!! 😤 Calma, respira fundo!! Tá bom??`,
  blush: (a) => `${a} is blushing!! Ai que fofo, que vergonha!! 😳`,
  dance: (a) => `${a} is dancing!! 💃 Nossa, you so good!! Come on, dance with me!!`,
};

const SELF_ACTIONS = new Set(["cry", "laugh", "angry", "blush", "dance"]);

async function fetchGif(action: string): Promise<string | null> {
  const requestedCategory = GIF_CATEGORY[action] ?? action;
  const categoryFallbacks: Record<string, string> = {
    angry: "slap",
    bonk: "slap",
  };
  const categories = [
    requestedCategory,
    categoryFallbacks[requestedCategory],
  ].filter((category, index, all): category is string =>
    Boolean(category) && all.indexOf(category) === index,
  );

  for (const category of categories) {
    const endpoints = [
      `https://api.otakugifs.xyz/gif?reaction=${encodeURIComponent(category)}`,
      `https://nekos.life/api/v2/img/${encodeURIComponent(category)}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const resp = await fetch(endpoint, {
          signal: AbortSignal.timeout(8_000),
        });
        if (!resp.ok) continue;

        const data = (await resp.json()) as {
          url?: string;
          results?: { url?: string }[];
        };
        const url = data.url ?? data.results?.[0]?.url;
        if (url) return url;
      } catch (err) {
        logger.warn({ err, action, endpoint }, "GIF provider request failed");
      }
    }
  }

  logger.warn({ action }, "No GIF was available for action");
  return null;
}

function buildEmbed(text: string, gifUrl: string | null, color: number): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(color).setDescription(text);
  if (gifUrl) embed.setImage(gifUrl);
  return embed;
}

function backButton(action: string, originalAuthorId: string, targetUserId: string): ActionRowBuilder<ButtonBuilder> {
  const label = BACK_LABEL[action] ?? "Back!";
  const btn = new ButtonBuilder()
    .setCustomId(`actionback:${action}:${originalAuthorId}:${targetUserId}`)
    .setLabel(label)
    .setStyle(ButtonStyle.Primary);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(btn);
}

function hashPercent(a: string, b: string): number {
  let hash = 0;
  const str = [a, b].sort().join("💍");
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 101;
}

export async function processAction(
  command: string,
  message: Message,
  botUserId?: string,
): Promise<CommandResult | null> {
  if (!GIF_CATEGORY[command]) return null;

  const author = `**${message.author.displayName}**`;
  const isSelfAction = SELF_ACTIONS.has(command);

  // Self emotions — no target needed
  if (isSelfAction) {
    const text = SELF_TEXT[command]?.(author) ?? `${author} is feeling something!!`;
    const gifUrl = await fetchGif(command);
    const embed = buildEmbed(text, gifUrl, ACTION_COLOR[command] ?? 0xff9ecd);
    return { handled: true, embeds: [embed] };
  }

  // Target actions — need a mention
  const targetUser = message.mentions.users.first();
  if (!targetUser) {
    return {
      handled: true,
      reply: `Oops!! Have to mention someone! Like \`!${command} @user\``,
    };
  }

  const isMalice = botUserId != null && targetUser.id === botUserId;

  // Marriage special case
  if (command === "marry") {
    const gifUrl = await fetchGif("marry");
    if (isMalice) {
      const embed = buildEmbed(
        `Marriage?! With ME?! Ai meu Deus... I is **0%** available!! I have zero interest in marriage, haha!! Sorry ${author}!! 💔`,
        gifUrl,
        0xff4444,
      );
      return { handled: true, embeds: [embed] };
    }
    const pct = hashPercent(message.author.id, targetUser.id);
    const target = `**${targetUser.displayName}**`;
    const comment =
      pct >= 80 ? "Nossa, perfect couple!! 💍 Congratulations!!" :
      pct >= 60 ? "Very compatible!! I think they make it work!!" :
      pct >= 40 ? "Is okay! Love can grow, you know?" :
      pct >= 20 ? "Ai... maybe think more about this haha?" :
      "Oof... I not sure about this one haha!!";
    const embed = buildEmbed(
      `💍 ${author} wants to marry ${target}!\n\n**Marriage Compatibility: ${pct}%**\n${comment}`,
      gifUrl,
      ACTION_COLOR.marry,
    );
    return { handled: true, embeds: [embed] };
  }

  // Kiss targeting Malice → she slaps back
  if (command === "kiss" && isMalice) {
    const gifUrl = await fetchGif("slap");
    const embed = buildEmbed(MALICE_TEXT.kiss(author), gifUrl, ACTION_COLOR.slap);
    return { handled: true, embeds: [embed] };
  }

  // Other actions targeting Malice — custom responses, no back button
  if (isMalice && MALICE_TEXT[command]) {
    const text = MALICE_TEXT[command]!(author);
    const gifUrl = await fetchGif(command);
    const embed = buildEmbed(text, gifUrl, ACTION_COLOR[command] ?? 0xff9ecd);
    return { handled: true, embeds: [embed] };
  }

  // Regular action targeting another user — add back button
  const target = `**${targetUser.displayName}**`;
  const text = ACTION_TEXT[command]?.(author, target) ?? `${author} used ${command} on ${target}!!`;
  const gifUrl = await fetchGif(command);
  const embed = buildEmbed(text, gifUrl, ACTION_COLOR[command] ?? 0xff9ecd);
  const row = backButton(command, message.author.id, targetUser.id);
  return { handled: true, embeds: [embed], components: [row] };
}

// Called from index.ts interactionCreate
export async function handleBackButton(
  action: string,
  originalAuthorId: string,
  targetUserId: string,
  clickerId: string,
  clickerName: string,
  originalAuthorName: string,
  targetUserName: string,
): Promise<{ text: string; gifUrl: string | null; color: number } | { error: string }> {
  if (clickerId !== targetUserId) {
    return { error: `Só **${targetUserName}** pode responder essa ação, haha!!` };
  }
  const backer = `**${clickerName}**`;
  const original = `**${originalAuthorName}**`;
  const text = BACK_TEXT[action]?.(backer, original) ?? `${backer} responded to ${original}!!`;
  const gifUrl = await fetchGif(action);
  const color = ACTION_COLOR[action] ?? 0xff9ecd;
  return { text, gifUrl, color };
}
