const fs = require("fs");
const os = require("os");
const path = require("path");
const { parseCsvLine, readCsvTable } = require("../../../src/services/csvTableService");

function withTempCsv(content, testFn) {
  const tempPath = path.join(os.tmpdir(), `draftkit-csv-${Date.now()}-${Math.random()}.csv`);
  fs.writeFileSync(tempPath, content, "utf8");
  try {
    return testFn(tempPath);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

describe("services: csvTableService", () => {
  it("parses quoted CSV cells", () => {
    const parsed = parseCsvLine('a,"b,c","d""e"');
    expect(parsed).toEqual(["a", "b,c", 'd"e']);
  });

  it("reads CSV rows into objects", () => {
    const csv = ["name,team,score", "Player One,NYY,10", '"Player, Two",BOS,7'].join("\n");

    withTempCsv(csv, (csvPath) => {
      const rows = readCsvTable(csvPath);
      expect(rows).toEqual([
        { name: "Player One", team: "NYY", score: "10" },
        { name: "Player, Two", team: "BOS", score: "7" },
      ]);
    });
  });

  it("returns empty array for missing CSV path", () => {
    const rows = readCsvTable(path.join(os.tmpdir(), "does-not-exist.csv"));
    expect(rows).toEqual([]);
  });
});
