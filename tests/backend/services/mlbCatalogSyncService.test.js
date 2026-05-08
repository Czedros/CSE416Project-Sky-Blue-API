const {
  normalizeHittingStats,
  normalizePitchingStats,
  normalizeSeasonStats,
  classifyTransaction,
  buildLatestTransactionStatus,
  normalizeRosterStatus,
  extractInjuryDetail,
  resolveSeasons,
} = require("../../../src/services/mlbCatalogSyncService");

describe("services: mlbCatalogSyncService", () => {
  it("normalizes hitting stats from MLB API payload shape", () => {
    const stats = normalizeHittingStats({
      avg: ".301",
      obp: ".390",
      homeRuns: "27",
      runs: "89",
      rbi: "102",
      stolenBases: "11",
      hits: "165",
      atBats: "548",
      plateAppearances: "620",
    });

    expect(stats).toEqual({
      BA: 0.301,
      OBP: 0.39,
      HR: 27,
      R: 89,
      RBI: 102,
      SB: 11,
      H: 165,
      AB: 548,
      PA: 620,
    });
  });

  it("normalizes pitching stats from MLB API payload shape", () => {
    const stats = normalizePitchingStats({
      era: "3.27",
      whip: "1.11",
      wins: "15",
      saves: "2",
      strikeOuts: "201",
      qualityStarts: "20",
      inningsPitched: "187.2",
    });

    expect(stats).toEqual({
      ERA: 3.27,
      WHIP: 1.11,
      W: 15,
      SV: 2,
      K: 201,
      QS: 20,
      IP: 187.2,
    });
  });

  it("selects hitter or pitcher season mapping based on role", () => {
    const seasonRow = {
      hitting: { avg: ".280", homeRuns: "20" },
      pitching: { era: "2.95", wins: "12", strikeOuts: "180" },
    };

    const hitter = normalizeSeasonStats(seasonRow, false);
    const pitcher = normalizeSeasonStats(seasonRow, true);

    expect(hitter.BA).toBeCloseTo(0.28);
    expect(hitter.HR).toBe(20);
    expect(pitcher.ERA).toBeCloseTo(2.95);
    expect(pitcher.W).toBe(12);
  });

  it("classifies injury and activation transactions", () => {
    const injured = classifyTransaction({
      type: "Injured List",
      description: "Placed on 10-day injured list (left hamstring strain)",
    });
    expect(injured).toEqual({
      status: "injured",
      injuryStatus: "left hamstring strain",
    });

    const activated = classifyTransaction({
      type: "Injured List",
      description: "Activated from 10-day injured list",
    });
    expect(activated).toEqual({
      status: "active",
      injuryStatus: "",
    });
  });

  it("keeps only latest status from transaction stream per player", () => {
    const map = buildLatestTransactionStatus([
      {
        playerId: 100,
        date: "2026-03-01",
        type: "Injured List",
        description: "Placed on 10-day injured list (right shoulder inflammation)",
      },
      {
        playerId: 100,
        date: "2026-03-10",
        type: "Injured List",
        description: "Activated from 10-day injured list",
      },
    ]);

    expect(map.get(100)).toEqual({ status: "active", injuryStatus: "" });
  });

  it("maps roster status strings to valuation status buckets", () => {
    expect(normalizeRosterStatus("Injured 15-Day")).toBe("injured");
    expect(normalizeRosterStatus("Suspended List")).toBe("suspended");
    expect(normalizeRosterStatus("Optioned to Triple-A")).toBe("minors");
    expect(normalizeRosterStatus("Active")).toBe("active");
  });

  it("extracts injury detail from description text", () => {
    expect(extractInjuryDetail("Placed on injured list (right elbow inflammation)")).toBe(
      "right elbow inflammation",
    );
    expect(extractInjuryDetail("Placed on injured list with right ankle sprain")).toBe(
      "right ankle sprain",
    );
  });

  it("builds descending season windows", () => {
    expect(resolveSeasons(2025, 3)).toEqual([2025, 2024, 2023]);
  });
});
