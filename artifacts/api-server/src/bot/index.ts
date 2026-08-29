import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  type Message,
  ActivityType,
} from "discord.js";
import { logger } from "../lib/logger";
import { getHistory, addMessage } from "./memory";
import { getAIResponse } from "./openai";
import { handleCommand } from "./commands";
import { getCustomPersonality } from "./personality";
import { handleBackButton } from "./actions";

const token = process.env["DISCORD_BOT_TOKEN"];
if (!token) {
  throw new Error("DISCORD_BOT_TOKEN environment variable is required");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once("ready", (c) => {
  logger.info({ tag: c.user.tag }, "Discord bot logged in");
  c.user.setActivity("your questions", { type: ActivityType.Listening });
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  const isMentioned = message.mentions.has(client.user!.id);
  const isReply =
    message.reference?.messageId != null &&
    (await message.fetchReference().catch(() => null))?.author.id === client.user!.id;
  const isDM = message.channel.isDMBased();

  const cmdResult = await handleCommand(message, client.user!.id);
  if (cmdResult.handled) {
    if (cmdResult.reply || cmdResult.embeds?.length) {
      await message.reply({
        content: cmdResult.reply ?? undefined,
        embeds: cmdResult.embeds ?? [],
        components: cmdResult.components ?? [],
      });
    }
    return;
  }

  if (!isMentioned && !isReply && !isDM) return;

  const content = message.content
    .replace(/<@!?\d+>/g, "")
    .trim();

  if (!content) {
    await message.reply("Hi! Ask me anything — I'm here to help.");
    return;
  }

  try {
    if ("sendTyping" in message.channel) {
      await message.channel.sendTyping();
    }

    addMessage(message.channelId, "user", content, message.author.username);
    const history = getHistory(message.channelId);
    const customPersonality = getCustomPersonality(message.guildId);

    const aiReply = await getAIResponse(history, customPersonality);

    addMessage(message.channelId, "assistant", aiReply);

    if (aiReply.length > 2000) {
      const chunks = splitMessage(aiReply, 2000);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(aiReply);
    }

    logger.info(
      { channelId: message.channelId, userId: message.author.id },
      "Replied to message",
    );
  } catch (err) {
    logger.error({ err }, "Error handling message");
    await message.reply(
      "Sorry, I ran into an error. Please try again in a moment.",
    );
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId } = interaction;
  if (!customId.startsWith("actionback:")) return;

  const parts = customId.split(":");
  const action = parts[1];
  const originalAuthorId = parts[2];
  const targetUserId = parts[3];

  if (!action || !originalAuthorId || !targetUserId) return;

  try {
    // Resolve display names
    const [authorMember, targetMember] = await Promise.all([
      interaction.guild?.members.fetch(originalAuthorId).catch(() => null),
      interaction.guild?.members.fetch(targetUserId).catch(() => null),
    ]);
    const [authorUser, targetUser] = await Promise.all([
      authorMember ? Promise.resolve(null) : interaction.client.users.fetch(originalAuthorId).catch(() => null),
      targetMember ? Promise.resolve(null) : interaction.client.users.fetch(targetUserId).catch(() => null),
    ]);

    const originalAuthorName = authorMember?.displayName ?? authorUser?.displayName ?? "someone";
    const targetUserName = targetMember?.displayName ?? targetUser?.displayName ?? "someone";

    const clickerName =
      interaction.member && "displayName" in interaction.member
        ? (interaction.member.displayName as string)
        : interaction.user.displayName;

    const result = await handleBackButton(
      action,
      originalAuthorId,
      targetUserId,
      interaction.user.id,
      clickerName,
      originalAuthorName,
      targetUserName,
    );

    if ("error" in result) {
      await interaction.reply({ content: result.error, flags: 64 });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(result.color)
      .setDescription(result.text);
    if (result.gifUrl) embed.setImage(result.gifUrl);

    // Disable the button after use
    await interaction.message.edit({ components: [] }).catch(() => null);
    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error({ err, customId }, "Error handling back button");
    await interaction.reply({ content: "Ai, something went wrong haha!!", flags: 64 }).catch(() => null);
  }
});

client.on("error", (err) => {
  logger.error({ err }, "Discord client error");
});

function splitMessage(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if ((current + "\n" + line).length > maxLength) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function startBot(): void {
  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login to Discord — check that DISCORD_BOT_TOKEN is correct");
  });
}

export { client };
