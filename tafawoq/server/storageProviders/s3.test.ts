import { describe, expect, it } from "vitest";
import { s3Put, s3Get, s3GetSignedUrl } from "./s3";

describe("S3 storage provider (no real credentials in this environment)", () => {
  it("throws a clear configuration error instead of attempting a request with missing credentials", async () => {
    await expect(s3Put("test/file.txt", "hello", "text/plain")).rejects.toThrow(
      /S3_BUCKET|S3_ACCESS_KEY_ID|S3_SECRET_ACCESS_KEY/
    );
  });

  it("s3Get also fails honestly when unconfigured (no public base URL set)", async () => {
    await expect(s3Get("test/file.txt")).rejects.toThrow(
      /S3_BUCKET|S3_ACCESS_KEY_ID|S3_SECRET_ACCESS_KEY/
    );
  });

  it("s3GetSignedUrl also fails honestly when unconfigured", async () => {
    await expect(s3GetSignedUrl("test/file.txt")).rejects.toThrow(
      /S3_BUCKET|S3_ACCESS_KEY_ID|S3_SECRET_ACCESS_KEY/
    );
  });
});
