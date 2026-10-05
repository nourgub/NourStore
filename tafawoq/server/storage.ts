// Storage dispatch: STORAGE_PROVIDER=local (default) writes to this
// server's own disk — zero external service, zero account with any
// company. STORAGE_PROVIDER=s3 switches to any real S3-compatible object
// storage (see storageProviders/s3.ts) for production-scale deployments
// that want object storage instead of local disk.

import { ENV } from "./_core/env";
import { s3Put, s3Get, s3GetSignedUrl } from "./storageProviders/s3";
import {
  localPut,
  localGet,
  localGetSignedUrl,
} from "./storageProviders/local";

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (ENV.storageProvider === "s3") return s3Put(relKey, data, contentType);
  return localPut(relKey, data, contentType);
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  if (ENV.storageProvider === "s3") return s3Get(relKey);
  return localGet(relKey);
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  if (ENV.storageProvider === "s3") return s3GetSignedUrl(relKey);
  return localGetSignedUrl(relKey);
}
