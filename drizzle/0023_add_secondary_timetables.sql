-- Secondary-school weekly timetables (جدول التوقيت في الثانوي).
--
-- One row per timetable. `config` keeps the generator's input (the working
-- grid, the classes with their ministerial weekly loads, the staff with
-- their ranks) and `sessions` keeps the resulting week. Both are JSON
-- documents, validated by zod before they are written (server/routers.ts)
-- and interpreted by the pure engine in shared/secondaryTimetable.ts.
--
-- They are stored together rather than as session rows because a timetable
-- is generated, read, printed and replaced as a single unit — no query ever
-- asks for one session on its own — and because keeping the input beside
-- the result is what lets the same timetable be re-validated, or
-- regenerated, exactly as it was produced.
CREATE TABLE `secondaryTimetables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ownerId` INT NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `schoolYear` VARCHAR(16) NOT NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `config` LONGTEXT NOT NULL,
  `sessions` LONGTEXT NOT NULL,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`)
);
CREATE INDEX `secondaryTimetables_ownerId_idx` ON `secondaryTimetables` (`ownerId`);
