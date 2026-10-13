const SEED_LEADERBOARD = [
  { rank: 1, name: 'Needles Runner', score: 36 },
  { rank: 2, name: 'Leadless Runner', score: 29 },
  { rank: 3, name: 'Paegion Runner', score: 9 },
];

function getStore() {
  if (!globalThis.__NEON_RUNNER_LEADERBOARD__) {
    globalThis.__NEON_RUNNER_LEADERBOARD__ = SEED_LEADERBOARD.map((entry) => ({ ...entry }));
  }
  return globalThis.__NEON_RUNNER_LEADERBOARD__;
}

function sanitizeName(value) {
  return String(value || 'Neon Runner')
    .trim()
    .slice(0, 24)
    .replace(/[<>]/g, '');
}

function sanitizeNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.floor(number));
}

function normalize(entries) {
  return entries
    .map((entry, index) => ({
      rank: 0,
      name: sanitizeName(entry.name),
      score: sanitizeNumber(entry.score, 0),
      coins: sanitizeNumber(entry.coins, 0),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export default function handler(req, res) {
  const store = getStore();

  if (req.method === 'GET') {
    return res.status(200).json({ leaderboard: normalize(store) });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const entry = {
      name: sanitizeName(body.name),
      score: sanitizeNumber(body.score, 0),
      coins: sanitizeNumber(body.coins, 0),
    };

    store.push(entry);
    const ranked = normalize(store);
    globalThis.__NEON_RUNNER_LEADERBOARD__ = ranked;

    return res.status(200).json({
      ok: true,
      synced: true,
      leaderboard: ranked,
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
