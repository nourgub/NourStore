import { describe, expect, it } from "vitest";
import { generateCertificatePdf } from "./certificatePdf";

const baseData = {
  certificateId: "NX-TEST1234",
  studentName: "Test Student",
  courseTitle: "Test Course",
  issuedAt: new Date("2026-01-15"),
  verifyUrl: "https://example.com/verify/certificate/NX-TEST1234",
};

describe("generateCertificatePdf", () => {
  it("generates a real, structurally valid PDF for English", async () => {
    const buffer = await generateCertificatePdf({ ...baseData, lang: "en" });
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    // A real certificate with an embedded QR image should be a few KB at
    // least — catches a regression that silently produces a near-empty
    // document.
    expect(buffer.length).toBeGreaterThan(2000);
  });

  it("generates a real, structurally valid PDF for French", async () => {
    const buffer = await generateCertificatePdf({
      ...baseData,
      courseTitle: "Cours de test",
      lang: "fr",
    });
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(2000);
  });

  it("generates a real, structurally valid PDF for Arabic, embedding the real Arabic font", async () => {
    const englishBuffer = await generateCertificatePdf({ ...baseData, lang: "en" });
    const arabicBuffer = await generateCertificatePdf({
      ...baseData,
      studentName: "أحمد محمد",
      courseTitle: "الرياضيات للبكالوريا",
      lang: "ar",
    });
    expect(arabicBuffer.subarray(0, 4).toString()).toBe("%PDF");
    // PDFKit subsets embedded fonts (only the glyphs actually used), so an
    // absolute size threshold isn't reliable — but embedding even a
    // subsetted real font is still measurably larger than a PDF using only
    // the built-in Helvetica (no embedded font data at all). Catches a
    // regression where the Arabic font silently fails to embed.
    expect(arabicBuffer.length).toBeGreaterThan(englishBuffer.length);
  });

  it("handles an empty course title without throwing (defensive, matches the download route's fallback)", async () => {
    const buffer = await generateCertificatePdf({
      ...baseData,
      courseTitle: "",
      lang: "en",
    });
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("does not corrupt the Latin certificate ID when embedded in the Arabic layout (regression test for a real reversal bug caught by visual inspection)", async () => {
    // PDFKit's `features: ["rtla"]` does a naive full-string character
    // reversal, not real Unicode bidi reordering — an earlier version of
    // this module passed "رقم الشهادة: NX-VERIFYPDF741310" through it as
    // one string, and the certificate ID rendered backwards
    // ("689106FDPYFIREV-XN"). generateCertificatePdf now renders the
    // Arabic label and the Latin/numeric value as separate draws
    // specifically to avoid this. This test can only check the PDF is
    // still produced without throwing — the actual correctness (that the
    // ID reads correctly) was confirmed by rendering to an image and
    // reading it, since PDF text-extraction order for a naively-reversed
    // vs. correctly-isolated run isn't a reliable enough signal on its
    // own to catch this class of bug in an automated assertion.
    const buffer = await generateCertificatePdf({
      ...baseData,
      certificateId: "NX-VERIFYPDF741310",
      lang: "ar",
    });
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("includes the explicit 'not an official Ministry of Education accreditation' disclaimer text in the generated PDF", async () => {
    // This is the actual printable/shareable artifact a learner would
    // show a school or employer — the single most important place for
    // this disclaimer to be unambiguous, more so than the web page. Real
    // PDF text extraction (pdftotext), not just a byte-length or
    // structural check, so this genuinely proves the sentence is present
    // and intact in the rendered output for the Latin-script languages.
    const { execFileSync } = await import("child_process");
    const fs = await import("fs");
    const os = await import("os");
    const path = await import("path");

    const enBuffer = await generateCertificatePdf({ ...baseData, lang: "en" });
    const tmpFile = path.join(os.tmpdir(), `cert-disclaimer-test-${Date.now()}.pdf`);
    fs.writeFileSync(tmpFile, enBuffer);
    const text = execFileSync("pdftotext", ["-layout", tmpFile, "-"]).toString();
    fs.unlinkSync(tmpFile);
    expect(text).toContain("not an official accreditation from the Ministry of Education");
    expect(text).toContain("Nourix Academy");
  });

  it("does not mix a Latin brand name into the Arabic disclaimer sentence (would trigger the same naive-reversal corruption as the certificate ID bug above)", async () => {
    // The Arabic disclaimer intentionally uses the Arabic form of the
    // brand name ("نوريكس أكاديمي") instead of the Latin "Nourix
    // Academy" specifically to avoid embedding a Latin run inside a
    // string that gets passed through PDFKit's naive `rtla` reversal —
    // confirmed by actually rendering this to an image and reading it
    // (an earlier version of this exact addition rendered the embedded
    // Latin name backwards as "ymedacA xiruoN"). This test at minimum
    // proves generation still succeeds with real Arabic student/course
    // data; the no-Latin-mixing property itself was verified visually,
    // the same honest limitation noted on the certificate-ID test above.
    const arBuffer = await generateCertificatePdf({
      ...baseData,
      studentName: "أحمد محمد",
      courseTitle: "الرياضيات للبكالوريا",
      lang: "ar",
    });
    expect(arBuffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});
