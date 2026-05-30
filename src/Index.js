// src/index.js
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const {
  handlePlay,
  handleSkip,
  handleStop,
  handleQueue,
  handleLoop,
  handleNowPlaying,
} = require('./commands/music');

const PREFIX = process.env.PREFIX || '!';
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN tidak ditemukan di environment variables!');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once('ready', () => {
  console.log(`✅ Bot online sebagai ${client.user.tag}`);
  client.user.setActivity('🎵 Musik | !help', { type: 'LISTENING' });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (!message.guild) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'play':
    case 'p':
      await handlePlay(message, args);
      break;

    case 'skip':
    case 's':
      handleSkip(message);
      break;

    case 'stop':
      handleStop(message);
      break;

    case 'queue':
    case 'q':
      handleQueue(message);
      break;

    case 'loop':
    case 'l':
      handleLoop(message);
      break;

    case 'np':
    case 'nowplaying':
      handleNowPlaying(message);
      break;

    case 'help':
      message.reply(
        `🎵 **Perintah Musik:**\n` +
        `\`${PREFIX}play <judul/URL>\` — Putar lagu\n` +
        `\`${PREFIX}skip\` — Skip lagu\n` +
        `\`${PREFIX}stop\` — Stop & kosongkan queue\n` +
        `\`${PREFIX}queue\` — Lihat queue\n` +
        `\`${PREFIX}loop\` — Toggle loop\n` +
        `\`${PREFIX}np\` — Lagu yang sedang diputar`
      );
      break;
  }
});

client.on('error', (err) => console.error('Client error:', err));

client.login(TOKEN);
