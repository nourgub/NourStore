import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/products";
import { ogWords, truncate } from "@/lib/og-words";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ProductOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const fontData = await readFile(path.join(process.cwd(), "src/assets/cairo-bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2f6f5e 0%, #1c453b 100%)",
          color: "#ffffff",
          fontFamily: "Cairo",
          direction: "rtl",
          textAlign: "center",
          padding: "0 80px",
        }}
      >
        <div style={{ fontSize: 96 }}>{product?.icon ?? "🤖"}</div>
        {ogWords(truncate(product?.name ?? "نور ستور", 28), {
          fontSize: 52,
          fontWeight: 700,
          marginTop: 24,
        })}
        {ogWords(truncate(product?.tagline ?? "خدمات أتمتة جاهزة للتجار", 45), {
          fontSize: 26,
          marginTop: 20,
          opacity: 0.9,
        })}
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Cairo", data: fontData, weight: 700, style: "normal" }],
    },
  );
}
