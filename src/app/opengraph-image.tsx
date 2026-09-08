import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { ogWords } from "@/lib/og-words";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
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
        {ogWords("نور ستور", { fontSize: 76, fontWeight: 700 })}
        {ogWords("خدمات أتمتة جاهزة للتجار", { fontSize: 34, marginTop: 28, opacity: 0.92 })}
        {ogWords("واتساب · السلات المتروكة · تنبيهات المخزون وأكثر", {
          fontSize: 26,
          marginTop: 16,
          opacity: 0.75,
        })}
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Cairo", data: fontData, weight: 700, style: "normal" }],
    },
  );
}
