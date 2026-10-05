// Real, standard S3-compatible object storage — works against actual AWS
// S3 and any S3-compatible provider (Cloudflare R2, Backblaze B2, MinIO,
// DigitalOcean Spaces) since they all implement the same S3 API. This is
// the option for production-scale deployments that want object storage
// instead of local disk (server/storageProviders/local.ts, the default).
//
// Setup required (see DEPLOYMENT.md): create a bucket with whichever
// provider you choose, an access key pair scoped to it, and set
// STORAGE_PROVIDER=s3 plus S3_BUCKET / S3_REGION / S3_ACCESS_KEY_ID /
// S3_SECRET_ACCESS_KEY (and S3_ENDPOINT for anything other than real AWS
// S3). Set S3_PUBLIC_BASE_URL if the bucket/CDN is publicly readable;
// otherwise every download goes through a time-limited presigned URL.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { ENV } from "../_core/env";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  if (!ENV.s3Bucket || !ENV.s3AccessKeyId || !ENV.s3SecretAccessKey) {
    throw new Error(
      "S3 storage config missing: set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY."
    );
  }
  _client = new S3Client({
    region: ENV.s3Region || "auto",
    endpoint: ENV.s3Endpoint || undefined, // undefined = real AWS S3; set for R2/B2/MinIO
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  });
  return _client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function s3Put(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getClient();
  const key = appendHashSuffix(normalizeKey(relKey));
  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  );
  const url = ENV.s3PublicBaseUrl
    ? `${ENV.s3PublicBaseUrl.replace(/\/+$/, "")}/${key}`
    : await s3GetSignedUrl(key);
  return { key, url };
}

export async function s3Get(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const url = ENV.s3PublicBaseUrl
    ? `${ENV.s3PublicBaseUrl.replace(/\/+$/, "")}/${key}`
    : await s3GetSignedUrl(key);
  return { key, url };
}

export async function s3GetSignedUrl(
  relKey: string,
  expiresInSeconds = 3600
): Promise<string> {
  const client = getClient();
  const key = normalizeKey(relKey);
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}
