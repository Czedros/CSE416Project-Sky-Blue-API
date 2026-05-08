const axios = require("axios");
const {
  fetchAllTeams,
  fetchTeamRoster,
  fetchActiveRoster,
  fetchPlayer,
  fetchPlayerSeasonStats,
  fetchTransactions,
  fetchTransactionsRange,
} = require("../../../src/services/mlbStatsApi");

describe("services: mlbStatsApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps team data from MLB API shape", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: {
        teams: [
          {
            id: 147,
            name: "New York Yankees",
            abbreviation: "NYY",
            league: { name: "American League" },
            division: { name: "American East" },
            locationName: "New York",
          },
        ],
      },
    });

    const teams = await fetchAllTeams();

    expect(teams).toEqual([
      {
        mlbTeamId: 147,
        name: "New York Yankees",
        abbreviation: "NYY",
        league: "AL",
        division: "East",
        city: "New York",
      },
    ]);
  });

  it("returns empty array for empty active roster response", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({ data: { roster: [] } });
    const roster = await fetchActiveRoster(147);
    expect(roster).toEqual([]);
  });

  it("maps roster rows for explicit roster type", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: {
        roster: [
          {
            person: { id: 1, fullName: "Test Player" },
            jerseyNumber: "42",
            position: { abbreviation: "OF" },
            status: { description: "Injured 10-Day", code: "D10" },
          },
        ],
      },
    });

    const roster = await fetchTeamRoster(147, "40Man");
    expect(roster).toEqual([
      {
        playerId: 1,
        name: "Test Player",
        jerseyNumber: "42",
        position: "OF",
        status: "Injured 10-Day",
        statusCode: "D10",
      },
    ]);
  });

  it("returns null when player API response has no people", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({ data: { people: [] } });
    const player = await fetchPlayer(605141);
    expect(player).toBeNull();
  });

  it("maps season stats into group-keyed object", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: {
        stats: [
          {
            group: { displayName: "hitting" },
            splits: [{ stat: { avg: ".300", homeRuns: "30" } }],
          },
          {
            group: { displayName: "pitching" },
            splits: [{ stat: { era: "3.00", strikeOuts: "180" } }],
          },
        ],
      },
    });

    const stats = await fetchPlayerSeasonStats(605141, 2025);
    expect(stats).toEqual({
      hitting: { avg: ".300", homeRuns: "30" },
      pitching: { era: "3.00", strikeOuts: "180" },
    });
  });

  it("returns empty transactions when MLB API responds empty", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({ data: { transactions: [] } });
    const transactions = await fetchTransactions("2026-01-10");
    expect(transactions).toEqual([]);
  });

  it("fetches transactions over a start/end date range", async () => {
    const getSpy = vi.spyOn(axios, "get").mockResolvedValue({
      data: {
        transactions: [
          {
            id: 100,
            date: "2026-03-01",
            effectiveDate: "2026-03-01",
            description: "Placed on 10-day injured list",
            person: { id: 10, fullName: "Pitcher A" },
            fromTeam: { id: 147 },
            toTeam: { id: 147 },
            typeDesc: "Injured List",
          },
        ],
      },
    });

    const transactions = await fetchTransactionsRange("2026-03-01", "2026-03-08");
    expect(transactions).toEqual([
      {
        id: 100,
        date: "2026-03-01",
        effectiveDate: "2026-03-01",
        description: "Placed on 10-day injured list",
        playerId: 10,
        playerName: "Pitcher A",
        fromTeamId: 147,
        toTeamId: 147,
        type: "Injured List",
      },
    ]);

    expect(getSpy).toHaveBeenCalledWith("https://statsapi.mlb.com/api/v1/transactions", {
      params: { startDate: "2026-03-01", endDate: "2026-03-08", sportId: 1 },
    });
  });
});
