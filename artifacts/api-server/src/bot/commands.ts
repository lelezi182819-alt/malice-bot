import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";
import { clearHistory } from "./memory";
import { setCustomPersonality, resetCustomPersonality, getCustomPersonality } from "./personality";
import { runStory, run8Ball, runJoke, runCompliment, runTrivia, runChoose } from "./fun";
import { processAction } from "./actions";
import { logger } from "../lib/logger";

export interface CommandResult {
  handled: boolean;
  reply?: string;
  embeds?: EmbedBuilder[];
  components?: ActionRowBuilder<ButtonBuilder>[];
}

function isAdmin(message: Message): boolean {
  if (!message.guild || !message.member) return false;
  return message.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shipPercent(a: string, b: string): number {
  let hash = 0;
  const str = [a, b].sort().join("");
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 101;
}

function shipBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return "❤️".repeat(filled) + "🖤".repeat(10 - filled);
}

export async function handleCommand(message: Message, botUserId?: string): Promise<CommandResult> {
  const content = message.content.trim();

  if (!content.startsWith("!")) {
    return { handled: false };
  }

  const [cmd, ...args] = content.slice(1).split(/\s+/);
  const command = cmd?.toLowerCase();

  switch (command) {
    case "clear":
    case "reset":
      clearHistory(message.channelId);
      logger.info({ channelId: message.channelId }, "Conversation history cleared");
      return { handled: true, reply: "Conversation history cleared. Starting fresh!" };

    case "commands":
      return {
        handled: true,
        reply: [
          "**Commands:**",
          "• Mention me or reply to me to chat!",
          "",
          "**Actions (need @user):**",
          "• `!hug` `!pat` `!cuddle` `!slap` `!kiss` `!tickle` `!wave` `!poke` `!bite` `!bonk` `!marry`",
          "",
          "**Emotions (no @user needed):**",
          "• `!cry` `!laugh` `!angry` `!blush` `!dance`",
          "",
          "**Fun:**",
          "• `!hug @user` — give someone a hug",
          "• `!pat @user` — pat someone on the head",
          "• `!ship @user1 @user2` — check the ship compatibility",
          "• `!love @user` — see how much love there is",
          "• `!coinflip` — heads or tails?",
          "• `!roll [sides]` — roll a dice (default 6 sides)",
          "• `!8ball <question>` — ask the magic 8 ball",
          "• `!joke` — Malice tells you a joke",
          "• `!story [topic]` — Malice tells a story",
          "• `!compliment @user` — give someone a sweet compliment",
          "• `!choose opt1 | opt2 | ...` — Malice picks one for you",
          "• `!poll <question>` — creates a 👍/👎 poll",
          "• `!trivia` — Malice makes a trivia question",
          "",
          "**Info:**",
          "• `!avatar [@user]` — shows a user's avatar",
          "• `!userinfo [@user]` — account info and roles",
          "• `!serverinfo` — server stats",
          "",
          "**Utility:**",
          "• `!ping` — check if I is online",
          "• `!clear` or `!reset` — clear conversation history",
          "• `!personality set/reset/show` — manage personality *(admin only)*",
        ].join("\n"),
      };

    case "ping":
      return {
        handled: true,
        reply: `Pong! Latency: ${Date.now() - message.createdTimestamp}ms`,
      };

    case "ship": {
      const mentions = message.mentions.users;
      if (mentions.size < 2) {
        return { handled: true, reply: "You need mention two peoples! Like `!ship @person1 @person2`" };
      }
      const [user1, user2] = [...mentions.values()];
      const pct = shipPercent(user1!.id, user2!.id);
      const bar = shipBar(pct);
      const comment =
        pct >= 80 ? "Nossa, perfect match!!! 💕" :
        pct >= 60 ? "Is pretty good!! I think they cute together!" :
        pct >= 40 ? "Hmm... maybe? Is not bad!" :
        pct >= 20 ? "Ai... not so much haha, but who know!" :
        "Oof... I not so sure about this one haha";
      return {
        handled: true,
        reply: `💘 **${user1!.displayName}** x **${user2!.displayName}**\n${bar} **${pct}%**\n${comment}`,
      };
    }

    case "love": {
      const target = message.mentions.users.first();
      if (!target) return { handled: true, reply: "Mention someone! Like `!love @user`" };
      const pct = shipPercent(message.author.id, target.id);
      const comment =
        pct >= 80 ? "Nossa!!! This is MUITO love! 💕" :
        pct >= 60 ? "Awww that's sweet!!" :
        pct >= 40 ? "Is okay! Love can grow, yes?" :
        "Hehe maybe just friends for now!";
      return {
        handled: true,
        reply: `${message.author.displayName} → ${target.displayName}: **${pct}% love** 💖\n${comment}`,
      };
    }

    case "coinflip": {
      const result = Math.random() < 0.5 ? "HEADS" : "TAILS";
      const replies = [
        `I flip the coin and... **${result}**! 🪙`,
        `The coin say **${result}**!! 🪙`,
        `**${result}**! 🪙 The coin never lie, haha!`,
      ];
      return { handled: true, reply: pick(replies) };
    }

    case "roll": {
      const sides = parseInt(args[0] ?? "6", 10);
      if (isNaN(sides) || sides < 2) {
        return { handled: true, reply: "The dice need at least 2 sides! Like `!roll 20`" };
      }
      const result = Math.floor(Math.random() * sides) + 1;
      const replies = [
        `🎲 I roll the ${sides}-sided dice and... **${result}**!`,
        `🎲 **${result}**! Out of ${sides}!`,
        `The dice say **${result}**! 🎲 ${result === sides ? "Wow, maximum!! Nossa!!" : result === 1 ? "Ai, minimum haha!" : ""}`,
      ];
      return { handled: true, reply: pick(replies) };
    }

    case "8ball": {
      const question = args.join(" ").trim();
      if (!question) return { handled: true, reply: "Ask me something! Like `!8ball Will I be rich?`" };
      if ("sendTyping" in message.channel) await message.channel.sendTyping();
      const answer = await run8Ball(question);
      return { handled: true, reply: `🎱 *${question}*\n\n${answer}` };
    }

    case "joke": {
      if ("sendTyping" in message.channel) await message.channel.sendTyping();
      const joke = await runJoke();
      return { handled: true, reply: joke };
    }

    case "story": {
      const topic = args.join(" ").trim();
      if ("sendTyping" in message.channel) await message.channel.sendTyping();
      const story = await runStory(topic || undefined);
      return { handled: true, reply: story };
    }

    case "compliment": {
      const target = message.mentions.users.first();
      if (!target) return { handled: true, reply: "Mention someone to compliment! Like `!compliment @user`" };
      if ("sendTyping" in message.channel) await message.channel.sendTyping();
      const compliment = await runCompliment(target.displayName);
      return { handled: true, reply: compliment };
    }

    case "avatar": {
      const target = message.mentions.users.first() ?? message.author;
      const url = target.displayAvatarURL({ size: 512 });
      return { handled: true, reply: `**${target.displayName}'s avatar:**\n${url}` };
    }

    case "userinfo": {
      const target = message.mentions.members?.first() ?? message.member;
      if (!target) return { handled: true, reply: "This command only work in a server!" };
      const user = target.user;
      const created = `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`;
      const joined = target.joinedTimestamp
        ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>`
        : "Unknown";
      const roles = target.roles.cache
        .filter((r) => r.name !== "@everyone")
        .map((r) => r.name)
        .slice(0, 5)
        .join(", ") || "None";
      return {
        handled: true,
        reply: [
          `**${user.displayName}** (${user.username})`,
          `🪪 ID: \`${user.id}\``,
          `📅 Account created: ${created}`,
          `📥 Joined server: ${joined}`,
          `🎭 Roles: ${roles}`,
        ].join("\n"),
      };
    }

    case "serverinfo": {
      const guild = message.guild;
      if (!guild) return { handled: true, reply: "This command only work in a server!" };
      const created = `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`;
      return {
        handled: true,
        reply: [
          `**${guild.name}**`,
          `🪪 ID: \`${guild.id}\``,
          `👑 Owner: <@${guild.ownerId}>`,
          `👥 Members: ${guild.memberCount}`,
          `📅 Created: ${created}`,
          `📢 Channels: ${guild.channels.cache.size}`,
          `🎭 Roles: ${guild.roles.cache.size}`,
        ].join("\n"),
      };
    }

    case "choose": {
      const rawOptions = args.join(" ").split("|").map((o) => o.trim()).filter(Boolean);
      if (rawOptions.length < 2) {
        return { handled: true, reply: "Give me at least two options! Like `!choose pizza | burger | sushi`" };
      }
      if ("sendTyping" in message.channel) await message.channel.sendTyping();
      const choice = await runChoose(rawOptions);
      return { handled: true, reply: choice };
    }

    case "poll": {
      const question = args.join(" ").trim();
      if (!question) return { handled: true, reply: "Give me a question! Like `!poll Is pineapple on pizza good?`" };
      if (!("send" in message.channel)) return { handled: true, reply: "I cannot create polls here, sorry!" };
      const pollMsg = await message.channel.send(`📊 **Poll:** ${question}\n\nReact with 👍 or 👎!`);
      await pollMsg.react("👍");
      await pollMsg.react("👎");
      return { handled: true, reply: undefined };
    }

    case "trivia": {
      if ("sendTyping" in message.channel) await message.channel.sendTyping();
      const trivia = await runTrivia();
      return { handled: true, reply: trivia };
    }

    case "personality": {
      const sub = args[0]?.toLowerCase();
      const guildId = message.guildId;

      if (sub === "show") {
        if (!isAdmin(message)) {
          return { handled: true, reply: "Only admins can see the personality settings! (Manage Server permission needed)" };
        }
        const current = guildId ? getCustomPersonality(guildId) : null;
        return {
          handled: true,
          reply: current
            ? `**Current custom personality:**\n${current}`
            : "No custom personality set — using default!",
        };
      }

      if (!isAdmin(message)) {
        return { handled: true, reply: "Only admins can change my personality! (Manage Server permission needed)" };
      }

      if (sub === "reset") {
        if (guildId) resetCustomPersonality(guildId);
        logger.info({ guildId }, "Personality reset");
        return { handled: true, reply: "Personality reset to default!" };
      }

      if (sub === "set") {
        const text = args.slice(1).join(" ").trim();
        if (!text) return { handled: true, reply: "Usage: `!personality set <your custom notes here>`" };
        if (!guildId) return { handled: true, reply: "This command only works in a server!" };
        setCustomPersonality(guildId, text);
        logger.info({ guildId, text }, "Personality updated");
        return { handled: true, reply: `Personality updated! New notes:\n> ${text}` };
      }

      return { handled: true, reply: "Usage: `!personality set <text>` | `!personality reset` | `!personality show`" };
    }

    default: {
      const actionResult = await processAction(command ?? "", message, botUserId);
      if (actionResult) return actionResult;
      return { handled: false };
    }
  }
}
