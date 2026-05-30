// commands/music.js
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const playdl = require('play-dl');
const { getQueue, deleteQueue } = require('../utils/queue');

const players = new Map();

async function play(guildId, connection, message) {
  const queue = getQueue(guildId);

  if (queue.songs.length === 0) {
    connection.destroy();
    deleteQueue(guildId);
    players.delete(guildId);
    return;
  }

  const song = queue.songs[0];

  try {
    const stream = await playdl.stream(song.url, { quality: 2 });
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    let player = players.get(guildId);
    if (!player) {
      player = createAudioPlayer();
      players.set(guildId, player);
      connection.subscribe(player);
    }

    player.play(resource);

    player.once(AudioPlayerStatus.Idle, () => {
      if (!queue.loop) queue.songs.shift();
      play(guildId, connection, message);
    });

    player.once('error', (err) => {
      console.error('Player error:', err);
      queue.songs.shift();
      play(guildId, connection, message);
    });

    message.channel.send(
      `▶️ **Sekarang main:** \`${song.title}\`\n🔗 ${song.url}`
    );
  } catch (err) {
    console.error('Stream error:', err);
    message.channel.send('❌ Gagal memutar lagu. Skip ke berikutnya...');
    queue.songs.shift();
    play(guildId, connection, message);
  }
}

async function handlePlay(message, args) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel)
    return message.reply('❌ Kamu harus masuk voice channel dulu!');

  const botPermissions = voiceChannel.permissionsFor(message.client.user);
  if (!botPermissions.has('Connect') || !botPermissions.has('Speak'))
    return message.reply('❌ Bot tidak punya izin masuk/ngomong di voice channel!');

  if (!args.length)
    return message.reply('❌ Tulis nama lagu atau URL YouTube-nya!');

  const query = args.join(' ');
  const queue = getQueue(message.guild.id);

  await message.channel.send('🔍 Mencari lagu...');

  try {
    let songUrl, songTitle;

    if (playdl.yt_validate(query) === 'video') {
      const info = await playdl.video_info(query);
      songUrl = query;
      songTitle = info.video_details.title;
    } else {
      const results = await playdl.search(query, { limit: 1 });
      if (!results.length) return message.reply('❌ Lagu tidak ditemukan!');
      songUrl = results[0].url;
      songTitle = results[0].title;
    }

    queue.songs.push({ url: songUrl, title: songTitle });

    if (queue.songs.length > 1) {
      return message.channel.send(
        `✅ **Ditambahkan ke queue:** \`${songTitle}\` (posisi #${queue.songs.length})`
      );
    }

    let connection;
    try {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: true,
      });
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch {
      deleteQueue(message.guild.id);
      return message.reply('❌ Gagal konek ke voice channel!');
    }

    play(message.guild.id, connection, message);
  } catch (err) {
    console.error('Play error:', err);
    message.reply('❌ Terjadi kesalahan saat memproses lagu.');
  }
}

function handleSkip(message) {
  const queue = getQueue(message.guild.id);
  const player = players.get(message.guild.id);

  if (!player || queue.songs.length === 0)
    return message.reply('❌ Tidak ada lagu yang sedang diputar!');

  player.stop();
  message.reply('⏭️ Lagu diskip!');
}

function handleStop(message) {
  const queue = getQueue(message.guild.id);
  const player = players.get(message.guild.id);

  if (!player || queue.songs.length === 0)
    return message.reply('❌ Bot tidak sedang memutar lagu!');

  queue.songs = [];
  player.stop();
  message.reply('⏹️ Musik dihentikan dan queue dikosongkan.');
}

function handleQueue(message) {
  const queue = getQueue(message.guild.id);

  if (!queue.songs.length)
    return message.reply('📭 Queue kosong!');

  const list = queue.songs
    .slice(0, 10)
    .map((s, i) => `${i === 0 ? '▶️' : `${i + 1}.`} \`${s.title}\``)
    .join('\n');

  message.reply(`🎵 **Queue (${queue.songs.length} lagu):**\n${list}`);
}

function handleLoop(message) {
  const queue = getQueue(message.guild.id);
  queue.loop = !queue.loop;
  message.reply(`🔁 Loop: **${queue.loop ? 'ON' : 'OFF'}**`);
}

function handleNowPlaying(message) {
  const queue = getQueue(message.guild.id);

  if (!queue.songs.length)
    return message.reply('❌ Tidak ada lagu yang sedang diputar!');

  message.reply(`🎶 **Sedang main:** \`${queue.songs[0].title}\``);
}

module.exports = {
  handlePlay,
  handleSkip,
  handleStop,
  handleQueue,
  handleLoop,
  handleNowPlaying,
};
