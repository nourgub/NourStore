import { afterAll, describe, expect, it } from "vitest";
import fs from "fs/promises";
import path from "path";
import { localPut, localGet, localGetSignedUrl, UPLOAD_ROOT } from "./local";

describe("local filesystem storage (zero external service)", () => {
  it("writes a real file to disk and returns a resolvable URL", async () => {
    const result = await localPut(
      "test/hello.txt",
      "hello world",
      "text/plain"
    );
    expect(result.url).toMatch(/^\/local-storage\//);
    const fullPath = path.join(UPLOAD_ROOT, result.key);
    const contents = await fs.readFile(fullPath, "utf-8");
    expect(contents).toBe("hello world");
  });

  it("appends a random suffix so two uploads with the same name never collide", async () => {
    const first = await localPut("test/dup.txt", "a", "text/plain");
    const second = await localPut("test/dup.txt", "b", "text/plain");
    expect(first.key).not.toBe(second.key);
  });

  it("strips path-traversal segments from the key — cannot escape the upload root", async () => {
    const result = await localPut(
      "../../etc/passwd",
      "malicious",
      "text/plain"
    );
    const fullPath = path.resolve(UPLOAD_ROOT, result.key);
    expect(fullPath.startsWith(UPLOAD_ROOT)).toBe(true);
  });

  it("localGet and localGetSignedUrl both resolve to the same local-storage path scheme", async () => {
    const got = await localGet("test/hello.txt");
    const signed = await localGetSignedUrl("test/hello.txt");
    expect(got.url).toBe("/local-storage/test/hello.txt");
    expect(signed).toBe("/local-storage/test/hello.txt");
  });

  afterAll(async () => {
    await fs.rm(path.join(UPLOAD_ROOT, "test"), {
      recursive: true,
      force: true,
    });
  });
});
