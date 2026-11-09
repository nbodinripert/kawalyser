import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mainKeyId, thumbKeyIds } from "@/domain/geometry";
import { analyse, type AnalysisDetail } from "./analyse";
import fixtureJson from "./__fixtures__/propergol-ck-fr.json";
import { layoutFromFixture, replacementsFromFixture, type ExcelFixture } from "./__fixtures__/excel";

/**
 * Checks the port against the results stored in Kawamashi's workbook "Propergol CK - fr".
 * The corpus stays private, so this test only runs where corpus/fr.txt exists.
 */
const corpusPath = join(process.cwd(), "corpus", "fr.txt");
const fixture = fixtureJson as unknown as ExcelFixture;

describe.skipIf(!existsSync(corpusPath))("parity with the Excel analyser (Propergol CK, French)", () => {
  let detail: AnalysisDetail;
  const run = () => {
    detail ??= analyse(readFileSync(corpusPath, "utf8"), {
      layout: layoutFromFixture(fixture),
      replacements: replacementsFromFixture(fixture),
      level: "clever",
      language: "fr",
      compat: true,
    });
    return detail;
  };
  const num = (record: Record<string, string | number>, cell: string) => Number(record[cell]);

  it("counts the same n-grams", { timeout: 60_000 }, () => {
    const { counts, result } = run();
    const header = fixture.ngramsHeader;
    // Excel turns a few corpus lines into numbers or dates ("+1", "95:00:00"), which shifts its totals
    // by a handful of characters; its "invalides" counters also start at 1.
    const near = (actual: number, cell: string) => expect(Math.abs(actual - num(header, cell)), cell).toBeLessThanOrEqual(12);
    near(result.totals.characters, "AA1");
    near(result.totals.corpusPresses, "AB1");
    expect(result.totals.words).toBe(num(header, "C1"));
    const sum = (map: Map<string, number>) => [...map.values()].reduce((a, b) => a + b, 0);
    near(sum(counts.ngrams[1]) + counts.invalid[1], "W1");
    near(sum(counts.ngrams[2]) + counts.invalid[2], "Q1");
    near(sum(counts.ngrams[3]) + counts.invalid[3], "J1");
  });

  it("counts the same key presses", () => {
    const { result } = run();
    const grid = fixture.doigts;
    const leftColumns = ["P", "R", "T", "V", "X"];
    const rightColumns = ["AA", "AC", "AE", "AG", "AI"];
    for (let row = 0; row < 3; row++) {
      leftColumns.forEach((column, i) => {
        expect(Math.abs(result.keyPresses[mainKeyId(row, i + 1)]! - num(grid, `${column}${3 + row * 2}`)), `${column}${3 + row * 2}`).toBeLessThanOrEqual(2);
      });
      rightColumns.forEach((column, i) => {
        expect(Math.abs(result.keyPresses[mainKeyId(row, i + 6)]! - num(grid, `${column}${3 + row * 2}`)), `${column}${3 + row * 2}`).toBeLessThanOrEqual(2);
      });
    }
    expect(result.keyPresses[thumbKeyIds.leftOuter]).toBe(num(grid, "V9"));
    expect(result.keyPresses[thumbKeyIds.leftInner]).toBe(num(grid, "X9"));
    expect(result.keyPresses[thumbKeyIds.rightInner]).toBe(num(grid, "AA9"));
    expect(result.keyPresses[thumbKeyIds.rightOuter]).toBe(num(grid, "AC9"));
  });

  it("classifies trigrams the same way", () => {
    const { trigramTallies: t } = run();
    const tri = fixture.trigrammes;
    const triple = (a: string, b: string, c: string) => [num(tri, `${a}2`), num(tri, `${b}2`), num(tri, `${c}2`)];
    expect(t.classified).toEqual(triple("E", "F", "G"));
    expect(Math.abs(t.invalid - num(tri, "H2"))).toBeLessThanOrEqual(12);
    expect(t.other).toBe(num(tri, "I2"));
    expect(t.alternation).toEqual(triple("J", "K", "L"));
    expect(t.rolls).toEqual(triple("M", "N", "O"));
    expect(t.inwardRolls).toEqual(triple("P", "Q", "R"));
    expect(t.outwardRolls).toEqual(triple("S", "T", "U"));
    expect(t.oneHand).toEqual(triple("V", "W", "X"));
    expect(t.inwardOneHand).toEqual(triple("Y", "Z", "AA"));
    expect(t.outwardOneHand).toEqual(triple("AB", "AC", "AD"));
    expect(t.redirects).toEqual(triple("AE", "AF", "AG"));
    expect(t.sfsAlternation).toEqual(triple("AH", "AI", "AJ"));
    expect(t.sfsRedirect).toEqual(triple("AK", "AL", "AM"));
  });

  it("finds the same difficulties", () => {
    const { result } = run();
    const totals = fixture.difficultesTotals;
    expect(result.lists.sfb.total).toBe(num(totals, "B1"));
    expect(result.lists.skb.total).toBe(num(totals, "F1"));
    expect(result.lists.lsb.total).toBe(num(totals, "J1"));
    expect(result.lists.fsb.total).toBe(num(totals, "N1"));
    expect(result.lists.hsb.total).toBe(num(totals, "R1"));
    expect(result.lists.rjb.total).toBe(num(totals, "V1"));
    expect(result.lists.badRedirects.total).toBe(num(totals, "Z1"));
    expect(result.lists.sfsRedirect.total).toBe(num(totals, "AD1"));
    expect(result.lists.sfsAlternation.total).toBe(num(totals, "AH1"));
    expect(result.lists.fssRedirect.total).toBe(num(totals, "AL1"));
    expect(result.lists.fssAlternation.total).toBe(num(totals, "AP1"));
    expect(result.lists.cc.total).toBe(num(totals, "AU1"));
    expect(result.lists.shs4.total).toBe(num(totals, "AY1"));
    expect(result.lists.shs5.total).toBe(num(totals, "BB1"));
  });

  it("gives the same percentages on the Analyse sheet", () => {
    const { result } = run();
    const a = fixture.analyse as Record<string, number>;
    const close = (actual: number, cell: string) => expect(actual, cell).toBeCloseTo(a[cell]!, 4);
    close(result.hands.innerColumns.left, "V20");
    close(result.hands.innerColumns.right, "X20");
    close(result.hands.withoutThumbs.left, "V22");
    close(result.hands.overall.left, "V23");
    close(result.homeKeys.withSpace, "W27");
    close(result.pressesChange, "W30");
    const pad = result.trigrams.pad;
    close(pad.alternation, "D40");
    close(pad.rolls, "F40");
    close(pad.inward, "H40");
    close(pad.outward, "J40");
    close(pad.oneHand, "L40");
    close(pad.ratio, "N40");
    close(pad.redirects, "P40");
    const d = result.difficulties;
    close(d.sfb, "D47");
    close(d.skb, "E47");
    close(d.lsb, "F47");
    close(d.fsb, "G47");
    close(d.hsb, "H47");
    close(d.rjb, "I47");
    close(d.badRedirects, "J47");
    close(d.sfs, "L47");
    close(d.sts, "M47");
    close(d.fss, "N47");
    close(d.cc, "O47");
    close(d.shs, "P47");
  });
});
