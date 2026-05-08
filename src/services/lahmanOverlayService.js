const { readCsvTable } = require("./csvTableService");

const MAJOR_LEAGUES = new Set(["AL", "NL"]);

function asFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseIntOrNull(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeId(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function makeNameKey(first, last) {
  const normalizedLast = normalizeName(last);
  const normalizedFirst = normalizeName(first);
  if (!normalizedLast && !normalizedFirst) return "";
  return `${normalizedLast}|${normalizedFirst}`;
}

function computeObp(H, BB, HBP, AB, SF) {
  const numerator = H + BB + HBP;
  const denominator = AB + BB + HBP + SF;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}

function computeWhip(H, BB, IPouts) {
  if (!Number.isFinite(IPouts) || IPouts <= 0) return 0;
  return ((H + BB) * 3) / IPouts;
}

function computeEra(ER, IPouts) {
  if (!Number.isFinite(IPouts) || IPouts <= 0) return 0;
  return (ER * 27) / IPouts;
}

function ipFromOuts(IPouts) {
  if (!Number.isFinite(IPouts) || IPouts <= 0) return 0;
  const whole = Math.floor(IPouts / 3);
  const remainder = IPouts % 3;
  return parseFloat(`${whole}.${remainder}`);
}

function indexChadwickRows(rows) {
  const byLahmanId = new Map();
  const byFgId = new Map();
  const byNameBirth = new Map();

  for (const row of rows) {
    const mlbam = parseIntOrNull(row.key_mlbam || row.mlbam_id);
    if (!mlbam) continue;

    const lahmanId = normalizeId(row.key_bbref || row.lahman_id || row.playerID);
    if (lahmanId) byLahmanId.set(lahmanId, mlbam);

    const fgId = parseIntOrNull(row.key_fangraphs || row.fangraphs_id || row.playerid);
    if (fgId) byFgId.set(fgId, mlbam);

    const birthYear = parseIntOrNull(row.birth_year || row.birthYear);
    const nameKey = makeNameKey(row.name_first || row.nameFirst, row.name_last || row.nameLast);
    if (nameKey && birthYear) {
      byNameBirth.set(`${nameKey}|${birthYear}`, mlbam);
    }
  }

  return { byLahmanId, byFgId, byNameBirth };
}

function aggregateLahmanBatting(rows, seasons) {
  const seasonsSet = new Set(seasons);
  const byPlayerSeason = new Map();

  for (const row of rows) {
    const year = parseIntOrNull(row.yearID);
    if (!year || !seasonsSet.has(year)) continue;
    const league = String(row.lgID || "").toUpperCase();
    if (!MAJOR_LEAGUES.has(league)) continue;

    const playerId = normalizeId(row.playerID);
    if (!playerId) continue;

    const key = `${playerId}|${year}`;
    const current = byPlayerSeason.get(key) || {
      AB: 0,
      H: 0,
      HR: 0,
      R: 0,
      RBI: 0,
      SB: 0,
      BB: 0,
      HBP: 0,
      SF: 0,
      PA: 0,
    };

    current.AB += asFiniteNumber(row.AB, 0);
    current.H += asFiniteNumber(row.H, 0);
    current.HR += asFiniteNumber(row.HR, 0);
    current.R += asFiniteNumber(row.R, 0);
    current.RBI += asFiniteNumber(row.RBI, 0);
    current.SB += asFiniteNumber(row.SB, 0);
    current.BB += asFiniteNumber(row.BB, 0);
    current.HBP += asFiniteNumber(row.HBP, 0);
    current.SF += asFiniteNumber(row.SF, 0);
    current.PA +=
      asFiniteNumber(row.AB, 0) +
      asFiniteNumber(row.BB, 0) +
      asFiniteNumber(row.HBP, 0) +
      asFiniteNumber(row.SF, 0) +
      asFiniteNumber(row.SH, 0);

    byPlayerSeason.set(key, current);
  }

  return byPlayerSeason;
}

function aggregateLahmanPitching(rows, seasons) {
  const seasonsSet = new Set(seasons);
  const byPlayerSeason = new Map();

  for (const row of rows) {
    const year = parseIntOrNull(row.yearID);
    if (!year || !seasonsSet.has(year)) continue;
    const league = String(row.lgID || "").toUpperCase();
    if (!MAJOR_LEAGUES.has(league)) continue;

    const playerId = normalizeId(row.playerID);
    if (!playerId) continue;

    const key = `${playerId}|${year}`;
    const current = byPlayerSeason.get(key) || {
      W: 0,
      SV: 0,
      SO: 0,
      H: 0,
      BB: 0,
      ER: 0,
      IPouts: 0,
      GS: 0,
      G: 0,
    };

    current.W += asFiniteNumber(row.W, 0);
    current.SV += asFiniteNumber(row.SV, 0);
    current.SO += asFiniteNumber(row.SO, 0);
    current.H += asFiniteNumber(row.H, 0);
    current.BB += asFiniteNumber(row.BB, 0);
    current.ER += asFiniteNumber(row.ER, 0);
    current.IPouts += asFiniteNumber(row.IPouts, 0);
    current.GS += asFiniteNumber(row.GS, 0);
    current.G += asFiniteNumber(row.G, 0);

    byPlayerSeason.set(key, current);
  }

  return byPlayerSeason;
}

function buildPlayerLookup(peopleRows) {
  const byPlayerId = new Map();
  for (const row of peopleRows) {
    const playerId = normalizeId(row.playerID);
    if (!playerId) continue;
    byPlayerId.set(playerId, {
      playerID: playerId,
      birthYear: parseIntOrNull(row.birthYear),
      nameKey: makeNameKey(row.nameFirst, row.nameLast),
    });
  }
  return byPlayerId;
}

function buildPlayerOverlays({
  battingAgg,
  pitchingAgg,
  seasons,
  playerLookup,
  chadwickIndex,
}) {
  const overlaysByMlbId = new Map();

  const allPlayerIds = new Set();
  for (const key of battingAgg.keys()) allPlayerIds.add(key.split("|")[0]);
  for (const key of pitchingAgg.keys()) allPlayerIds.add(key.split("|")[0]);

  for (const lahmanPlayerId of allPlayerIds) {
    const person = playerLookup.get(lahmanPlayerId) || {};
    let mlbamId = chadwickIndex.byLahmanId.get(lahmanPlayerId) || null;

    if (!mlbamId && person.nameKey && person.birthYear) {
      mlbamId = chadwickIndex.byNameBirth.get(`${person.nameKey}|${person.birthYear}`) || null;
    }

    if (!mlbamId) continue;

    const hittingHistory = [];
    const pitchingHistory = [];

    for (const season of seasons) {
      const battingRow = battingAgg.get(`${lahmanPlayerId}|${season}`);
      if (battingRow) {
        const BA = battingRow.AB > 0 ? battingRow.H / battingRow.AB : 0;
        const OBP = computeObp(
          battingRow.H,
          battingRow.BB,
          battingRow.HBP,
          battingRow.AB,
          battingRow.SF,
        );
        hittingHistory.push({
          season,
          stats: {
            BA,
            OBP,
            HR: battingRow.HR,
            R: battingRow.R,
            RBI: battingRow.RBI,
            SB: battingRow.SB,
            H: battingRow.H,
            AB: battingRow.AB,
            PA: battingRow.PA,
          },
        });
      }

      const pitchingRow = pitchingAgg.get(`${lahmanPlayerId}|${season}`);
      if (pitchingRow) {
        const ERA = computeEra(pitchingRow.ER, pitchingRow.IPouts);
        const WHIP = computeWhip(pitchingRow.H, pitchingRow.BB, pitchingRow.IPouts);
        const QS = pitchingRow.GS > 0 ? Math.round(pitchingRow.GS * 0.45) : 0;
        pitchingHistory.push({
          season,
          stats: {
            ERA,
            WHIP,
            W: pitchingRow.W,
            SV: pitchingRow.SV,
            K: pitchingRow.SO,
            QS,
            IP: ipFromOuts(pitchingRow.IPouts),
          },
        });
      }
    }

    const usePitching = pitchingHistory.length > hittingHistory.length;
    const chosenHistory = usePitching ? pitchingHistory : hittingHistory;
    if (chosenHistory.length === 0) continue;

    overlaysByMlbId.set(mlbamId, {
      lahmanId: lahmanPlayerId,
      birthYear: person.birthYear || null,
      statsHistory: chosenHistory,
      role: usePitching ? "pitcher" : "hitter",
    });
  }

  return overlaysByMlbId;
}

function loadLahmanPlayerOverlays(options) {
  const seasons = Array.isArray(options?.seasons) ? options.seasons : [];
  if (seasons.length === 0) {
    return { overlaysByMlbId: new Map(), rowsProcessed: 0 };
  }

  const battingRows = readCsvTable(options?.lahmanBattingCsvPath);
  const pitchingRows = readCsvTable(options?.lahmanPitchingCsvPath);
  const peopleRows = readCsvTable(options?.lahmanPeopleCsvPath);
  const chadwickRows = readCsvTable(options?.chadwickRegisterCsvPath);

  if (battingRows.length === 0 || pitchingRows.length === 0 || chadwickRows.length === 0) {
    return { overlaysByMlbId: new Map(), rowsProcessed: 0 };
  }

  const chadwickIndex = indexChadwickRows(chadwickRows);
  const battingAgg = aggregateLahmanBatting(battingRows, seasons);
  const pitchingAgg = aggregateLahmanPitching(pitchingRows, seasons);
  const playerLookup = buildPlayerLookup(peopleRows);
  const overlaysByMlbId = buildPlayerOverlays({
    battingAgg,
    pitchingAgg,
    seasons,
    playerLookup,
    chadwickIndex,
  });

  return {
    overlaysByMlbId,
    rowsProcessed: battingRows.length + pitchingRows.length,
    playerOverlays: overlaysByMlbId.size,
  };
}

module.exports = {
  loadLahmanPlayerOverlays,
  indexChadwickRows,
  aggregateLahmanBatting,
  aggregateLahmanPitching,
};
