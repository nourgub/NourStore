-- Persists what the teacher assistant (Claude) produces, so a lesson plan,
-- an exam, a model solution or a correction session survives closing the
-- tab — until now every one of them lived only in the browser.
--
-- Ownership: every row carries teacherId and is only ever readable by that
-- teacher or an admin (enforced in server/db/teacherAssistant.ts, which
-- scopes every query by owner — there is no unscoped read).
--
-- The generated bodies are MEDIUMTEXT rather than TEXT on purpose: a full
-- model solution with a per-step grading scale for a whole paper runs past
-- TEXT's 64 KB once Arabic is counted at ~2 bytes per character, and MySQL
-- would silently truncate it.

CREATE TABLE `lessonPlans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacherId` INT NOT NULL,
  `level` VARCHAR(80) NOT NULL,
  `topic` VARCHAR(160) NOT NULL,
  `durationMinutes` INT NOT NULL,
  `priorKnowledge` TEXT,
  `content` MEDIUMTEXT NOT NULL,
  `model` VARCHAR(64) NOT NULL,
  -- The generation hit max_tokens: the plan is incomplete and is labelled as
  -- such wherever it is shown, instead of looking finished.
  `truncated` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`)
);
CREATE INDEX `lessonPlans_teacherId_idx` ON `lessonPlans` (`teacherId`);

CREATE TABLE `examPapers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacherId` INT NOT NULL,
  `level` VARCHAR(80) NOT NULL,
  -- The requested units, newline-separated exactly as the teacher typed them.
  `topics` TEXT NOT NULL,
  `durationMinutes` INT NOT NULL,
  `totalPoints` INT NOT NULL,
  `content` MEDIUMTEXT NOT NULL,
  `model` VARCHAR(64) NOT NULL,
  `truncated` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`)
);
CREATE INDEX `examPapers_teacherId_idx` ON `examPapers` (`teacherId`);

-- One model solution + grading scale for one paper. examPaperId is NULL when
-- the teacher pasted their own exam text instead of generating it here, so
-- both routes are first-class.
CREATE TABLE `examSolutionSets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacherId` INT NOT NULL,
  `examPaperId` INT,
  `examText` MEDIUMTEXT NOT NULL,
  -- Stored even when it could not be parsed, with parseError saying why:
  -- losing a full model solution to a stray character would be worse than
  -- keeping text a human can fix.
  `solutionsJson` MEDIUMTEXT NOT NULL,
  `parseError` TEXT,
  `questionCount` INT,
  `scaleTotalPoints` INT,
  `model` VARCHAR(64) NOT NULL,
  `truncated` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`examPaperId`) REFERENCES `examPapers`(`id`)
);
CREATE INDEX `examSolutionSets_teacherId_idx` ON `examSolutionSets` (`teacherId`);
CREATE INDEX `examSolutionSets_examPaperId_idx` ON `examSolutionSets` (`examPaperId`);

-- One student's paper, graded against a solution set. Rows start as 'draft':
-- the AI report is a suggestion, finalPoints stays NULL until a teacher
-- reviews it and types a mark, and nothing reaches the learner or their
-- parents before that (see markPaperGradeReviewed).
CREATE TABLE `paperGrades` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacherId` INT NOT NULL,
  `solutionSetId` INT NOT NULL,
  -- Set when the paper belongs to a learner with an account here; NULL for a
  -- student graded off a paper roster.
  `learnerId` INT,
  `studentLabel` VARCHAR(160),
  `answerText` MEDIUMTEXT NOT NULL,
  `report` MEDIUMTEXT NOT NULL,
  `model` VARCHAR(64) NOT NULL,
  `truncated` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` ENUM('draft', 'reviewed') NOT NULL DEFAULT 'draft',
  -- The teacher's own mark, typed at review time — deliberately never
  -- scraped out of the AI report.
  `finalPoints` INT,
  `maxPoints` INT,
  `teacherNotes` TEXT,
  `reviewedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`solutionSetId`) REFERENCES `examSolutionSets`(`id`),
  FOREIGN KEY (`learnerId`) REFERENCES `users`(`id`)
);
CREATE INDEX `paperGrades_teacherId_idx` ON `paperGrades` (`teacherId`);
CREATE INDEX `paperGrades_learnerId_idx` ON `paperGrades` (`learnerId`);
CREATE INDEX `paperGrades_solutionSetId_idx` ON `paperGrades` (`solutionSetId`);
