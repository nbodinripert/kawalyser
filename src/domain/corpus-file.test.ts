import { describe, expect, it } from "vitest";
import { decodeCorpus, MAX_CORPUS_BYTES } from "./corpus-file";

const utf8 = (text: string) => new TextEncoder().encode(text);

describe("decodeCorpus", () => {
  it("reads UTF-8", () => {
    expect(decodeCorpus(utf8("déjà là"))).toEqual({ ok: true, text: "déjà là", encoding: "utf-8" });
  });

  it("follows a byte order mark, and drops it", () => {
    expect(decodeCorpus(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8("été")]))).toEqual({ ok: true, text: "été", encoding: "utf-8" });
    // "é!" in UTF-16, little then big endian.
    expect(decodeCorpus(new Uint8Array([0xff, 0xfe, 0xe9, 0x00, 0x21, 0x00]))).toEqual({ ok: true, text: "é!", encoding: "utf-16le" });
    expect(decodeCorpus(new Uint8Array([0xfe, 0xff, 0x00, 0xe9, 0x00, 0x21]))).toEqual({ ok: true, text: "é!", encoding: "utf-16be" });
  });

  it("falls back to Windows-1252 when the file is not valid UTF-8", () => {
    // "café … œuvre" as Windows saves it: é = E9, … = 85, œ = 9C.
    const bytes = new Uint8Array([0x63, 0x61, 0x66, 0xe9, 0x20, 0x85, 0x20, 0x9c, 0x75, 0x76, 0x72, 0x65]);
    expect(decodeCorpus(bytes)).toEqual({ ok: true, text: "café … œuvre", encoding: "windows-1252" });
  });

  it("refuses an empty file, or one with spaces only", () => {
    expect(decodeCorpus(new Uint8Array())).toEqual({ ok: false, problem: "empty" });
    expect(decodeCorpus(utf8(" \n\t "))).toEqual({ ok: false, problem: "empty" });
  });

  it("refuses a binary file, such as a Word document renamed .txt", () => {
    // A zip archive, as a .docx is, starts with "PK", two control characters, and holds null bytes.
    expect(decodeCorpus(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0xe9, 0xff]))).toEqual({ ok: false, problem: "not-text" });
    // UTF-16 without a byte order mark: every other byte is null.
    expect(decodeCorpus(new Uint8Array([0x61, 0x00, 0x62, 0x00]))).toEqual({ ok: false, problem: "not-text" });
  });

  it("tolerates a few stray control characters in a real text", () => {
    const text = `${"a".repeat(200)}\x1b`;
    expect(decodeCorpus(utf8(text))).toMatchObject({ ok: true });
  });

  it("refuses a file over 10 MB (question 29 of the specs)", () => {
    expect(decodeCorpus(new Uint8Array(MAX_CORPUS_BYTES + 1).fill(0x61))).toEqual({ ok: false, problem: "too-large" });
  });
});
