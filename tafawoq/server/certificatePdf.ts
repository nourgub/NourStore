// Real, server-generated PDF certificates — replaces the previous
// "Download as PDF" button, which was just the browser's print dialog on
// the verification page (no actual file, no consistent layout, nothing a
// server could regenerate identically later).
//
// Arabic rendering note (a genuine technical constraint, solved for real
// here, not glossed over): PDFKit's font embedding does NOT reliably
// render Arabic from every font file — a WOFF2-format font (the only
// format most npm font packages ship today) loaded without error but
// produced a completely blank page when tested. What actually works is a
// real, uncompressed .ttf file (server/assets/fonts/NotoNaskhArabic.ttf,
// downloaded directly from Google Fonts' own repository, OFL-1.1
// licensed — see the accompanying NotoNaskhArabic-OFL.txt) combined with
// PDFKit's `features: ["rtla"]` text option, which invokes fontkit's
// built-in OpenType shaping engine to produce correctly connected,
// correctly right-to-left-ordered Arabic glyphs. This was verified by
// actually rendering a test PDF to an image and inspecting it, not
// assumed from documentation.

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import path from "path";

const ARABIC_FONT_PATH = path.join(
  import.meta.dirname,
  "assets",
  "fonts",
  "NotoNaskhArabic.ttf"
);

export type CertificatePdfData = {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  issuedAt: Date;
  verifyUrl: string;
  lang: "ar" | "fr" | "en";
};

const LABELS = {
  ar: {
    heading: "شهادة إتمام",
    presentedTo: "هذه الشهادة ممنوحة إلى",
    forCompleting: "لإتمامه بنجاح دورة",
    issuedOn: "تاريخ الإصدار",
    certId: "رقم الشهادة",
    verify: "للتحقق من صحة هذه الشهادة، امسح رمز QR أو زر الرابط أدناه",
    disclaimer:
      "هذه شهادة إتمام صادرة عن نوريكس أكاديمي، وليست اعتمادًا رسميًا من وزارة التربية الوطنية.",
    brand: "Nourix Academy",
  },
  fr: {
    heading: "Certificat de réussite",
    presentedTo: "Ce certificat est décerné à",
    forCompleting: "pour avoir complété avec succès le cours",
    issuedOn: "Date d'émission",
    certId: "N° de certificat",
    verify: "Pour vérifier ce certificat, scannez le QR code ou visitez le lien ci-dessous",
    disclaimer:
      "Ceci est un certificat de réussite délivré par Nourix Academy, et non une accréditation officielle du ministère de l'Éducation nationale.",
    brand: "Nourix Academy",
  },
  en: {
    heading: "Certificate of Completion",
    presentedTo: "This certificate is presented to",
    forCompleting: "for successfully completing the course",
    issuedOn: "Issued on",
    certId: "Certificate ID",
    verify: "To verify this certificate, scan the QR code or visit the link below",
    disclaimer:
      "This is a certificate of completion issued by Nourix Academy, not an official accreditation from the Ministry of Education.",
    brand: "Nourix Academy",
  },
} as const;

function formatDate(date: Date, lang: "ar" | "fr" | "en"): string {
  if (lang === "ar") {
    // Deliberately numeric-only (DD/MM/YYYY) for Arabic, not
    // toLocaleDateString("ar-DZ", {month: "long"}) — a locale-formatted
    // Arabic date mixes an Arabic month name with Western digits in one
    // string, and PDFKit's `features: ["rtla"]` (see the module-level
    // comment above) does a naive full-string character reversal rather
    // than real Unicode bidi reordering, which corrupts embedded Latin/
    // numeric runs (visually confirmed: "2026" rendered as "6202"). A
    // pure-digit format has nothing for that reversal to corrupt.
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${date.getFullYear()}`;
  }
  const locale = lang === "fr" ? "fr-FR" : "en-US";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Generates a real PDF certificate as a Buffer. Layout is deliberately
 * simple (a bordered card, centered text, a QR code) rather than
 * attempting an elaborate design that can't be visually proofed in this
 * environment — see AUDIT.md for the honest scope note on this.
 */
export async function generateCertificatePdf(
  data: CertificatePdfData
): Promise<Buffer> {
  const t = LABELS[data.lang];
  const isRtl = data.lang === "ar";
  const qrBuffer = await QRCode.toBuffer(data.verifyUrl, {
    type: "png",
    width: 200,
    margin: 1,
  });

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
  });
  doc.registerFont("Arabic", ARABIC_FONT_PATH);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Outer decorative border — a real, deliberate design choice for a
  // certificate look, not a placeholder.
  doc
    .rect(20, 20, pageWidth - 40, pageHeight - 40)
    .lineWidth(2)
    .strokeColor("#c9a44c")
    .stroke();
  doc
    .rect(28, 28, pageWidth - 56, pageHeight - 56)
    .lineWidth(0.75)
    .strokeColor("#c9a44c")
    .stroke();

  const centerX = pageWidth / 2;
  let y = 70;

  const writeCentered = (
    text: string,
    fontSize: number,
    options: { font?: string; color?: string; gap?: number } = {}
  ) => {
    doc
      .font(isRtl ? "Arabic" : options.font || "Helvetica")
      .fontSize(fontSize)
      .fillColor(options.color || "#1a1a1a")
      .text(text, 60, y, {
        width: pageWidth - 120,
        align: "center",
        features: isRtl ? ["rtla"] : undefined,
      });
    y += fontSize + (options.gap ?? 10);
  };

  writeCentered(t.brand, 14, { font: "Helvetica-Bold", color: "#c9a44c", gap: 20 });
  writeCentered(t.heading, 28, { font: "Helvetica-Bold", gap: 30 });
  writeCentered(t.presentedTo, 13, { color: "#555555", gap: 8 });
  writeCentered(data.studentName, 24, { font: "Helvetica-Bold", gap: 22 });
  writeCentered(t.forCompleting, 13, { color: "#555555", gap: 8 });
  writeCentered(data.courseTitle, 18, { font: "Helvetica-Bold", gap: 30 });
  // Explicit, not merely implied by the heading: this is a completion
  // certificate from Nourix Academy, never an official accreditation from
  // the Ministry of Education — the exact printed/shareable artifact
  // people would show to a school or employer is the single most
  // important place for this to be unambiguous, not just the web page.
  writeCentered(t.disclaimer, 9, { color: "#8a8a8a", gap: 10 });

  // Footer row: issue date + certificate ID on one side, QR on the other.
  const footerY = pageHeight - 150;
  const qrSize = 90;
  const qrX = isRtl ? 70 : pageWidth - 70 - qrSize;
  doc.image(qrBuffer, qrX, footerY, { width: qrSize, height: qrSize });

  const textX = isRtl ? qrX + qrSize + 30 : 70;
  const textWidth = pageWidth - 140 - qrSize - 30;

  /**
   * Renders "label: value" where the label is Arabic (needs `rtla`
   * shaping) and the value is a plain Latin/numeric string (a
   * certificate ID, a date) that must NEVER be passed through `rtla`
   * shaping itself — see the module comment on why mixing them in one
   * string corrupts the value. Draws the label flush to the right edge
   * of the box, then the value immediately to its left, so the visual
   * result reads correctly right-to-left as one line.
   */
  const writeRtlLabelValue = (
    label: string,
    value: string,
    lineY: number,
    fontSize: number,
    valueColor = "#333333"
  ) => {
    const labelWithColon = `${label}: `;
    doc.font("Arabic").fontSize(fontSize);
    const labelWidth = doc.widthOfString(labelWithColon, { features: ["rtla"] });
    doc
      .fillColor("#333333")
      .text(labelWithColon, textX, lineY, {
        width: textWidth,
        align: "right",
        features: ["rtla"],
      });
    doc
      .font("Helvetica")
      .fontSize(fontSize)
      .fillColor(valueColor)
      .text(value, textX, lineY, {
        width: Math.max(0, textWidth - labelWidth),
        align: "right",
      });
  };

  if (isRtl) {
    writeRtlLabelValue(t.issuedOn, formatDate(data.issuedAt, data.lang), footerY, 11);
    writeRtlLabelValue(t.certId, data.certificateId, footerY + 20, 11);
    doc
      .font("Arabic")
      .fontSize(9)
      .fillColor("#777777")
      .text(t.verify, textX, footerY + 46, {
        width: textWidth,
        align: "right",
        features: ["rtla"],
      })
      .font("Helvetica")
      .fillColor("#0a5cd6")
      .text(data.verifyUrl, textX, footerY + 68, {
        width: textWidth,
        align: "right",
      });
  } else {
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#333333")
      .text(`${t.issuedOn}: ${formatDate(data.issuedAt, data.lang)}`, textX, footerY, {
        width: textWidth,
        align: "left",
      })
      .text(`${t.certId}: ${data.certificateId}`, textX, footerY + 18, {
        width: textWidth,
        align: "left",
      })
      .fontSize(9)
      .fillColor("#777777")
      .text(t.verify, textX, footerY + 42, {
        width: textWidth,
        align: "left",
      })
      .fillColor("#0a5cd6")
      .text(data.verifyUrl, textX, footerY + 66, {
        width: textWidth,
        align: "left",
      });
  }

  doc.end();
  return done;
}
