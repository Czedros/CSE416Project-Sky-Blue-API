const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadLahmanPlayerOverlays } = require("../../../src/services/lahmanOverlayService");

function createTempFile(fileName, content) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "draftkit-lahman-"));
  const fullPath = path.join(tempDir, fileName);
  fs.writeFileSync(fullPath, content, "utf8");
  return { tempDir, fullPath };
}

function cleanupTempDir(tempDir) {
  if (!tempDir || !fs.existsSync(tempDir)) return;
  fs.rmSync(tempDir, { recursive: true, force: true });
}

describe("services: lahmanOverlayService", () => {
  it("maps Lahman batting/pitching seasons onto MLB IDs using Chadwick", () => {
    const battingCsv = [
      "playerID,yearID,lgID,AB,H,HR,R,RBI,SB,BB,HBP,SF,SH",
      "troutmi01,2025,AL,500,150,35,110,95,20,80,4,5,1",
      "troutmi01,2024,AL,480,140,30,100,85,18,75,3,4,0",
    ].join("\n");
    const pitchingCsv = [
      "playerID,yearID,lgID,W,SV,SO,H,BB,ER,IPouts,GS,G",
      "degroja01,2025,NL,14,0,220,150,45,60,600,32,32",
    ].join("\n");
    const peopleCsv = [
      "playerID,birthYear,nameFirst,nameLast",
      "troutmi01,1991,Mike,Trout",
      "degroja01,1988,Jacob,deGrom",
    ].join("\n");
    const chadwickCsv = [
      "key_mlbam,key_bbref,key_fangraphs,name_first,name_last,birth_year",
      "545361,troutmi01,10155,Mike,Trout,1991",
      "594798,degroja01,10954,Jacob,deGrom,1988",
    ].join("\n");

    const tmpBat = createTempFile("Batting.csv", battingCsv);
    const tmpPit = createTempFile("Pitching.csv", pitchingCsv);
    const tmpPeo = createTempFile("People.csv", peopleCsv);
    const tmpCha = createTempFile("register.csv", chadwickCsv);

    try {
      const result = loadLahmanPlayerOverlays({
        seasons: [2025, 2024, 2023],
        lahmanBattingCsvPath: tmpBat.fullPath,
        lahmanPitchingCsvPath: tmpPit.fullPath,
        lahmanPeopleCsvPath: tmpPeo.fullPath,
        chadwickRegisterCsvPath: tmpCha.fullPath,
      });

      expect(result.playerOverlays).toBeGreaterThanOrEqual(2);

      const trout = result.overlaysByMlbId.get(545361);
      expect(trout).toBeTruthy();
      expect(trout.lahmanId).toBe("troutmi01");
      expect(trout.role).toBe("hitter");
      expect(trout.statsHistory[0].season).toBe(2025);
      expect(trout.statsHistory[0].stats.HR).toBe(35);

      const degrom = result.overlaysByMlbId.get(594798);
      expect(degrom).toBeTruthy();
      expect(degrom.role).toBe("pitcher");
      expect(degrom.statsHistory[0].stats.K).toBe(220);
      expect(degrom.statsHistory[0].stats.ERA).toBeCloseTo((60 * 27) / 600, 6);
    } finally {
      cleanupTempDir(tmpBat.tempDir);
      cleanupTempDir(tmpPit.tempDir);
      cleanupTempDir(tmpPeo.tempDir);
      cleanupTempDir(tmpCha.tempDir);
    }
  });
});
