const env = import.meta.env || {};
const SUPABASE_URL = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || "";
const TABLE = "ariel_scores";
const LOCAL_KEY = "gorb-local-scores";

export const leaderboardConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export function calculateScore(gameState) {
  const rawSeconds = Object.values(gameState.times).reduce(
    (total, value) => total + (Number(value) || 0),
    0
  );
  const emailFailures = gameState.stats.emailFailures || 0;
  const retries =
    (gameState.stats.cookingRetries || 0) +
    (gameState.stats.sprintRetries || 0) +
    (gameState.stats.casinoBailouts || 0);
  const penaltySeconds = emailFailures * 10 + retries * 20;
  return {
    rawSeconds,
    emailFailures,
    retries,
    penaltySeconds,
    adjustedSeconds: Math.max(1, Math.round(rawSeconds + penaltySeconds)),
  };
}

export function formatLeaderboardTime(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export const NAME_COLORS = [
  "#f3e6c0",
  "#ffcd75",
  "#ef7d57",
  "#a7f070",
  "#73eff7",
  "#41a6f6",
  "#de7070",
  "#f4f4f4",
];

export function placementLabel(rank) {
  const n = rank + 1;
  const tens = n % 100;
  const ones = n % 10;
  let suffix = "TH";
  if (tens < 11 || tens > 13) {
    if (ones === 1) suffix = "ST";
    else if (ones === 2) suffix = "ND";
    else if (ones === 3) suffix = "RD";
  }
  return `${n}${suffix}`;
}

export function placementColor(rank) {
  if (rank === 0) return "#ffcd75";
  if (rank === 1) return "#c5c8ce";
  if (rank === 2) return "#ef7d57";
  return "#e8c15a";
}

export function normalizeNameColor(color) {
  const value = String(color || "").toLowerCase();
  return NAME_COLORS.includes(value) ? value : NAME_COLORS[0];
}

export function boardRemark(rank, submittedMatch = false) {
  if (submittedMatch) return "DEPARTED";
  if (rank === 0) return "ON TIME";
  if (rank === 1) return "BOARDING";
  if (rank === 2) return "GATE OPEN";
  return "DELAYED";
}

function localScores() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalScores(scores) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(scores.slice(0, 50)));
}

function sorted(scores, limit = 8) {
  return [...scores]
    .sort(
      (a, b) =>
        a.adjusted_seconds - b.adjusted_seconds ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .slice(0, limit);
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra,
  };
}

async function fetchBoard(limit, withColor) {
  const select = withColor
    ? "id,name,name_color,adjusted_seconds,raw_seconds,email_failures,retries,created_at"
    : "id,name,adjusted_seconds,raw_seconds,email_failures,retries,created_at";
  const query = new URLSearchParams({
    select,
    order: "adjusted_seconds.asc,created_at.asc",
    limit: String(limit),
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?${query}`, {
    headers: headers(),
  });
  if (!response.ok) throw new Error(`Leaderboard load failed (${response.status})`);
  return response.json();
}

export async function getLeaderboard(limit = 8) {
  if (!leaderboardConfigured) return sorted(localScores(), limit);
  try {
    return await fetchBoard(limit, true);
  } catch {
    return fetchBoard(limit, false);
  }
}

export async function submitScore(name, score, color) {
  const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 16);
  if (!cleanName) throw new Error("Enter a name first");
  const entry = {
    name: cleanName,
    name_color: normalizeNameColor(color),
    adjusted_seconds: score.adjustedSeconds,
    raw_seconds: Math.round(score.rawSeconds),
    email_failures: score.emailFailures,
    retries: score.retries,
  };

  if (!leaderboardConfigured) {
    const localEntry = { ...entry, created_at: new Date().toISOString() };
    const scores = sorted([...localScores(), localEntry], 50);
    saveLocalScores(scores);
    return sorted(scores, 8);
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: headers({
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    }),
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    const { name_color: _ignored, ...legacy } = entry;
    const retry = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: headers({
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      }),
      body: JSON.stringify(legacy),
    });
    if (!retry.ok) throw new Error(`Score submission failed (${response.status})`);
  }
  return getLeaderboard();
}
