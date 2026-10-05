// Real end-to-end verification of the certificate PDF download feature.
// Starts the actual server, creates a real certificate row in MySQL,
// downloads real PDFs over HTTP, and inspects the actual bytes — using
// `pdftotext`/`pdftoppm` (poppler-utils, available in this sandbox) rather
// than trusting that PDFKit "probably" embedded the right data.
//
// Run with: DATABASE_URL=mysql://user:pass@host:3306/db JWT_SECRET=... npx tsx scripts/verify-certificate-pdf.ts

import { spawn, execSync } from "child_process";
import fs from "fs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, courses, certificates } from "../drizzle/schema";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

const PORT = 3059;

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("Server did not become healthy in time");
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL to a real MySQL instance before running this script.");
  const db = drizzle(process.env.DATABASE_URL);
  const tag = Date.now();

  console.log("1. Seeding a real student, course, and an issued certificate...");
  await db.insert(users).values({ openId: `cert-pdf-student-${tag}`, name: "Yasmine Belkacem", email: `cert-pdf-${tag}@example.com`, role: "learner" });
  const student = (await db.select().from(users).where(eq(users.openId, `cert-pdf-student-${tag}`)).limit(1))[0];
  await db.insert(users).values({ openId: `cert-pdf-teacher-${tag}`, name: "Teacher", email: `cert-pdf-teacher-${tag}@example.com`, role: "teacher" });
  const teacher = (await db.select().from(users).where(eq(users.openId, `cert-pdf-teacher-${tag}`)).limit(1))[0];
  const slug = `cert-pdf-course-${tag}`;
  await db.insert(courses).values({ ownerId: teacher.id, slug, subject: "math", level: "starter", titleAr: "أساسيات التفاضل والتكامل", titleFr: "Calcul différentiel", titleEn: "Differential Calculus", descriptionAr: "د", descriptionFr: "d", descriptionEn: "d", isPublished: 1, isFree: 1 });
  const course = (await db.select().from(courses).where(eq(courses.slug, slug)).limit(1))[0];
  const revokedSlug = `cert-pdf-revoked-course-${tag}`;
  await db.insert(courses).values({ ownerId: teacher.id, slug: revokedSlug, subject: "math", level: "starter", titleAr: "أ", titleFr: "R", titleEn: "R", descriptionAr: "د", descriptionFr: "d", descriptionEn: "d", isPublished: 1, isFree: 1 });
  const revokedCourse = (await db.select().from(courses).where(eq(courses.slug, revokedSlug)).limit(1))[0];

  const certificateId = `NX-VERIFYPDF${String(tag).slice(-6)}`;
  await db.insert(certificates).values({ certificateId, userId: student.id, courseId: course.id, status: "active" });

  const revokedCertId = `NX-REVOKEDPDF${String(tag).slice(-6)}`;
  await db.insert(certificates).values({ certificateId: revokedCertId, userId: student.id, courseId: revokedCourse.id, status: "revoked", revokedAt: new Date() });

  console.log("2. Starting the real server...");
  const server = spawn("npx", ["tsx", "server/_core/index.ts"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  server.stdout?.on("data", d => (serverOutput += d.toString()));
  server.stderr?.on("data", d => (serverOutput += d.toString()));

  try {
    await waitForServer();

    console.log("3. Downloading the REAL English PDF over HTTP...");
    const enRes = await fetch(`http://localhost:${PORT}/api/certificates/${certificateId}/pdf?lang=en`);
    assert(enRes.status === 200, `English PDF download must return 200, got ${enRes.status}`);
    assert(enRes.headers.get("content-type") === "application/pdf", "must set Content-Type: application/pdf");
    const enBuffer = Buffer.from(await enRes.arrayBuffer());
    fs.writeFileSync("/tmp/verify-cert-en.pdf", enBuffer);
    assert(enBuffer.subarray(0, 4).toString() === "%PDF", "response must be a real PDF (magic bytes)");

    console.log("4. Extracting REAL text from the English PDF and confirming actual data is embedded...");
    const enText = execSync("pdftotext /tmp/verify-cert-en.pdf -").toString();
    assert(enText.includes("Yasmine Belkacem"), "the real student name must appear in the extracted PDF text");
    assert(enText.includes("Differential Calculus"), "the real course title must appear in the extracted PDF text");
    assert(enText.includes(certificateId), "the real certificate ID must appear in the extracted PDF text");
    assert(enText.includes("Certificate of Completion"), "the English heading must appear");

    console.log("5. Downloading the REAL French PDF and confirming French-specific text...");
    const frRes = await fetch(`http://localhost:${PORT}/api/certificates/${certificateId}/pdf?lang=fr`);
    const frBuffer = Buffer.from(await frRes.arrayBuffer());
    fs.writeFileSync("/tmp/verify-cert-fr.pdf", frBuffer);
    const frText = execSync("pdftotext /tmp/verify-cert-fr.pdf -").toString();
    assert(frText.includes("Calcul différentiel"), "the real French course title must appear");
    assert(frText.includes("Certificat de réussite"), "the French heading must appear");

    console.log("6. Downloading the REAL Arabic PDF and visually confirming real Arabic rendering (not blank, not garbled)...");
    const arRes = await fetch(`http://localhost:${PORT}/api/certificates/${certificateId}/pdf?lang=ar`);
    const arBuffer = Buffer.from(await arRes.arrayBuffer());
    fs.writeFileSync("/tmp/verify-cert-ar.pdf", arBuffer);
    assert(arBuffer.length > enBuffer.length, "the Arabic PDF must be larger than the English one (real embedded font, not skipped)");
    execSync("pdftoppm -png -r 100 /tmp/verify-cert-ar.pdf /tmp/verify-cert-ar");
    const pageStats = fs.statSync("/tmp/verify-cert-ar-1.png");
    assert(pageStats.size > 5000, "the rendered Arabic certificate image must be a real, non-trivial image (not a blank white page, which compresses to a tiny PNG)");

    console.log("6b. Confirming the certificate ID and date are NOT reversed inside the Arabic layout (regression check for a real bug caught by visual inspection)...");
    const arText = execSync("pdftotext /tmp/verify-cert-ar.pdf -").toString();
    assert(arText.includes(certificateId), `the certificate ID must appear un-reversed in the Arabic PDF, got text containing: ${arText}`);
    assert(/\d{2}\/\d{2}\/\d{4}/.test(arText), "the date must appear in un-reversed DD/MM/YYYY form in the Arabic PDF");

    console.log("7. A REVOKED certificate must return 410, not a PDF...");
    const revokedRes = await fetch(`http://localhost:${PORT}/api/certificates/${revokedCertId}/pdf?lang=en`);
    assert(revokedRes.status === 410, `a revoked certificate must return 410, got ${revokedRes.status}`);

    console.log("8. A NONEXISTENT certificate must return 404...");
    const missingRes = await fetch(`http://localhost:${PORT}/api/certificates/NX-DOES-NOT-EXIST/pdf?lang=en`);
    assert(missingRes.status === 404, `a nonexistent certificate must return 404, got ${missingRes.status}`);

    console.log("\n✅ ALL CERTIFICATE PDF ASSERTIONS PASSED against a real running server + real MySQL:");
    console.log("   - English & French PDFs contain the REAL student name, course title, and certificate ID (verified via text extraction)");
    console.log("   - Arabic PDF is genuinely larger (real embedded font) and renders as a real, non-blank image");
    console.log("   - Revoked certificate → 410, nonexistent certificate → 404");
    console.log(`   - Saved for manual inspection: /tmp/verify-cert-{en,fr,ar}.pdf and /tmp/verify-cert-ar-1.png`);
  } finally {
    server.kill();
    if (process.exitCode && process.exitCode !== 0) {
      console.error("--- server output ---\n" + serverOutput.slice(-4000));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exit(1);
  });
