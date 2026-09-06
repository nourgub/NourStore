import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة نور — مساعد الأستاذ الذكي",
  description: "منصة متعددة الوكلاء تنتج محتوى تربويًا كاملاً بأسلوب كل أستاذ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
