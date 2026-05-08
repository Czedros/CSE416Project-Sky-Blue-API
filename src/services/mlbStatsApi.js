const axios = require("axios");

const MLB_API_BASE = "https://statsapi.mlb.com/api/v1";

function mapRosterEntry(entry) {
  return {
    playerId: entry.person?.id,
    name: entry.person?.fullName,
    jerseyNumber: entry.jerseyNumber,
    position: entry.position?.abbreviation || "",
    status: entry.status?.description || "Active",
    statusCode: entry.status?.code || "",
  };
}

async function fetchAllTeams() {
  const { data } = await axios.get(`${MLB_API_BASE}/teams`, {
    params: { sportId: 1 },
  });
  return data.teams.map((t) => ({
    mlbTeamId: t.id,
    name: t.name,
    abbreviation: t.abbreviation,
    league: t.league?.name?.includes("American") ? "AL" : "NL",
    division: t.division?.name?.replace(/American |National /g, "").trim() || "",
    city: t.locationName || "",
  }));
}

async function fetchTeamRoster(mlbTeamId, rosterType = "active") {
  const { data } = await axios.get(`${MLB_API_BASE}/teams/${mlbTeamId}/roster`, {
    params: { rosterType },
  });

  return (data.roster || []).map(mapRosterEntry);
}

async function fetchActiveRoster(mlbTeamId) {
  return fetchTeamRoster(mlbTeamId, "active");
}

async function fetchPlayer(mlbPlayerId) {
  const { data } = await axios.get(`${MLB_API_BASE}/people/${mlbPlayerId}`, {
    params: { hydrate: "currentTeam,stats(type=season)" },
  });
  const person = data.people?.[0];
  if (!person) return null;

  return {
    playerId: person.id,
    name: person.fullName,
    mlbTeamId: person.currentTeam?.id,
    team: person.currentTeam?.abbreviation || "",
    position: person.primaryPosition?.abbreviation || "",
    batSide: person.batSide?.code,
    pitchHand: person.pitchHand?.code,
    birthDate: person.birthDate,
    active: person.active,
  };
}

async function fetchPlayerSeasonStats(mlbPlayerId, season) {
  const { data } = await axios.get(`${MLB_API_BASE}/people/${mlbPlayerId}/stats`, {
    params: { stats: "season", season, group: "hitting,pitching" },
  });
  const result = {};
  for (const group of data.stats || []) {
    const split = group.splits?.[0]?.stat;
    if (split) {
      result[group.group?.displayName || "unknown"] = split;
    }
  }
  return result;
}

async function fetchTransactions(date) {
  const dateStr = typeof date === "string" ? date : date.toISOString().slice(0, 10);
  const { data } = await axios.get(`${MLB_API_BASE}/transactions`, {
    params: { date: dateStr },
  });
  return mapTransactions(data.transactions || []);
}

function mapTransactions(transactions) {
  return (transactions || []).map((tx) => ({
    id: tx.id,
    date: tx.date,
    effectiveDate: tx.effectiveDate,
    description: tx.description,
    playerId: tx.person?.id,
    playerName: tx.person?.fullName,
    fromTeamId: tx.fromTeam?.id,
    toTeamId: tx.toTeam?.id,
    type: tx.typeDesc,
  }));
}

async function fetchTransactionsRange(startDate, endDate) {
  const startDateStr = typeof startDate === "string" ? startDate : startDate.toISOString().slice(0, 10);
  const endDateStr = typeof endDate === "string" ? endDate : endDate.toISOString().slice(0, 10);

  const { data } = await axios.get(`${MLB_API_BASE}/transactions`, {
    params: { startDate: startDateStr, endDate: endDateStr, sportId: 1 },
  });

  return mapTransactions(data.transactions || []);
}

module.exports = {
  fetchAllTeams,
  fetchTeamRoster,
  fetchActiveRoster,
  fetchPlayer,
  fetchPlayerSeasonStats,
  fetchTransactions,
  fetchTransactionsRange,
};
