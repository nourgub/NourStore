-- Content quality: students report a mistake or an unclear question
-- (one report per student, question and kind); the admin reviews them.
-- A lesson approval records the fingerprint of the content it approved, so a
-- later change to the lesson shows as "changed since approval".
-- Rollback: DROP TABLE `tafawoqContentFlags`;
--           ALTER TABLE `tafawoqContentReviews` DROP COLUMN `contentHash`, DROP COLUMN `source`;
CREATE TABLE `tafawoqContentFlags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `lessonKey` VARCHAR(64) NOT NULL,
  `questionId` VARCHAR(64) NOT NULL,
  `kind` ENUM('error','unclear') NOT NULL,
  `prompt` TEXT NOT NULL,
  `note` TEXT NULL,
  `status` ENUM('open','reviewing','resolved','dismissed') NOT NULL DEFAULT 'open',
  `adminNote` TEXT NULL,
  `resolvedBy` INT NULL,
  `resolvedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `tafawoqContentFlags_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  UNIQUE INDEX `tafawoqContentFlags_once` (`userId`, `questionId`, `kind`),
  INDEX `tafawoqContentFlags_status` (`status`, `createdAt`),
  INDEX `tafawoqContentFlags_question` (`questionId`)
);
ALTER TABLE `tafawoqContentReviews` ADD COLUMN `contentHash` VARCHAR(64) NULL;
ALTER TABLE `tafawoqContentReviews` ADD COLUMN `source` VARCHAR(255) NULL;
CREATE INDEX `tafawoqAttempts_question_idx` ON `tafawoqAttempts` (`questionId`);
