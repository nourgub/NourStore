import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Renders a QR code entirely client-side — no network call to any
 * third-party image service (unlike the previous implementation, which
 * sent every certificate's verification URL to api.qrserver.com just to
 * get a QR image back). The `qrcode` library generates the image locally
 * in the browser; nothing about which certificate is being viewed is ever
 * sent anywhere.
 */
export function QrCode({
  value,
  size = 120,
}: {
  value: string;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then(url => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (failed || !dataUrl) return null;
  return (
    <img
      src={dataUrl}
      alt="QR"
      width={size}
      height={size}
      style={{ marginTop: 12, borderRadius: 8 }}
    />
  );
}
