import { useEffect, useState } from "react";

/**
 * Listens for the "nourix:sw-update-available" event dispatched from
 * main.tsx once a new service worker is genuinely waiting to activate.
 * Without this, someone with the PWA installed on their home screen would
 * be silently stuck on an old build forever, with no way to know a new
 * version exists.
 */
export default function UpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("nourix:sw-update-available", handler);
    return () =>
      window.removeEventListener("nourix:sw-update-available", handler);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 16,
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#111111",
          border: "1px solid rgba(241,206,99,.35)",
          borderRadius: 12,
          padding: "12px 16px",
          boxShadow: "0 8px 30px rgba(0,0,0,.5)",
          color: "#f7f4ec",
          fontSize: 13,
          maxWidth: "92vw",
        }}
      >
        <span>نسخة جديدة من المنصة متوفرة</span>
        <button
          disabled={applying}
          onClick={() => {
            setApplying(true);
            (window as any).__nourixApplyUpdate?.();
          }}
          style={{
            background: "linear-gradient(145deg, #f1ce63, #8d6116)",
            color: "#090909",
            border: 0,
            borderRadius: 8,
            padding: "6px 14px",
            fontWeight: 700,
            fontSize: 12,
            cursor: applying ? "default" : "pointer",
            opacity: applying ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {applying ? "جارٍ التحديث…" : "تحديث الآن"}
        </button>
      </div>
    </div>
  );
}
