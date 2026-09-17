-- The teacher's reference library: files uploaded once and attached to every
-- generation of the teacher assistant automatically — the official syllabus,
-- a past paper, a textbook chapter.
--
-- This is what "the assistant learns from my files" means in this codebase:
-- the model READS them on each request. Nothing is trained or fine-tuned on
-- them, and a reference can be switched off (`active`) or deleted at any
-- time — a promise a trained model could not keep.
--
-- Two storage shapes, one per row:
--   * Word/Excel/text are unpacked once here, at upload, and kept as
--     `extractedText` — re-parsing the same file on every request is waste.
--   * Images and PDFs keep the file itself (`storageKey` in whichever storage
--     provider is configured), because Claude reads those formats directly
--     and needs the bytes each time.

CREATE TABLE `teacherReferences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacherId` INT NOT NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `mimeType` VARCHAR(150) NOT NULL,
  `sizeBytes` INT NOT NULL,
  `storageKey` VARCHAR(512),
  `extractedText` MEDIUMTEXT,
  -- Which modules the reference applies to; "all" is the default.
  `scope` ENUM('all', 'lesson', 'exam', 'solutions', 'grading') NOT NULL DEFAULT 'all',
  -- Switched off rather than deleted: kept for later without being paid for
  -- on every request.
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`)
);
CREATE INDEX `teacherReferences_teacherId_idx` ON `teacherReferences` (`teacherId`);
