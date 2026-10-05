import type { Express, Request, Response } from "express";
import { verifyCertificate } from "./db";
import { generateCertificatePdf } from "./certificatePdf";
import { checkRateLimit } from "./rateLimit";

/**
 * Public, matching the existing /verify/certificate/:id page — a
 * certificate's content is already meant to be publicly verifiable by
 * anyone holding its ID (that's the whole point of the QR/verify flow), so
 * requiring auth here would be inconsistent with that and would break the
 * "anyone can verify this certificate" use case (e.g. an employer
 * checking a candidate's certificate without an account).
 */
export function registerCertificateDownload(app: Express) {
  app.get(
    "/api/certificates/:certificateId/pdf",
    async (req: Request, res: Response) => {
      // Same protection as the tRPC certificates.verify procedure — this
      // route does real PDF-generation work per request (not just a cheap
      // DB read) and is just as public/unauthenticated, so it's at least
      // as important not to leave unlimited.
      if (
        !(await checkRateLimit(
          `certificate-pdf:${req.ip || "unknown"}`,
          60,
          60 * 60 * 1000
        ))
      ) {
        res.status(429).json({ error: "Too many requests, please try again later" });
        return;
      }
      const { certificateId } = req.params;
      const lang =
        req.query.lang === "fr" || req.query.lang === "en"
          ? req.query.lang
          : "ar";

      const certificate = await verifyCertificate(certificateId);
      if (!certificate) {
        res.status(404).json({ error: "Certificate not found." });
        return;
      }
      if (certificate.status === "revoked") {
        res.status(410).json({
          error: "This certificate has been revoked and is no longer downloadable.",
        });
        return;
      }
      if (!certificate.studentName) {
        res.status(500).json({ error: "Certificate is missing required data." });
        return;
      }

      const courseTitle =
        lang === "ar"
          ? certificate.courseTitleAr
          : lang === "fr"
            ? certificate.courseTitleFr
            : certificate.courseTitleEn;

      try {
        const pdfBuffer = await generateCertificatePdf({
          certificateId: certificate.certificateId,
          studentName: certificate.studentName,
          courseTitle: courseTitle || "",
          issuedAt: certificate.issuedAt,
          verifyUrl: `${req.protocol}://${req.get("host")}/verify/certificate/${certificate.certificateId}`,
          lang,
        });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${certificate.certificateId}.pdf"`
        );
        res.send(pdfBuffer);
      } catch (error) {
        console.error("[certificateDownload] PDF generation failed:", error);
        res.status(500).json({ error: "Failed to generate certificate PDF." });
      }
    }
  );
}
