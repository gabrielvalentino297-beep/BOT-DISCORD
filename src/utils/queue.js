// utils/queue.js
const queues = new Map();

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      songs: [],
      playing: false,
      volume: 1,
      loop: false,
    });
  }
  return queues.get(guildId);
}

function deleteQueue(guildId) {
  queues.delete(guildId);
}

module.exports = { getQueue, deleteQueue };
