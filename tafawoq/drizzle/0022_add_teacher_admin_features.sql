-- Adds: (1) an account activation gate so an admin-created teacher/learner
-- account can be held pending until payment is confirmed, (2) a
-- teacher-authored progress report visible to a learner's linked parent(s),
-- and (3) per-teacher Google Calendar OAuth tokens so a live lesson can get
-- a real, auto-generated Google Meet link instead of a manually pasted one.
--
-- `accountStatus` defaults to 'active' so every existing row is unaffected —
-- only newly admin-created teacher/learner accounts are ever set to
-- 'pending' (see server/db/usersAuth.ts, createManagedUser).
ALTER TABLE `users` ADD COLUMN `accountStatus` ENUM('active', 'pending', 'suspended') NOT NULL DEFAULT 'active';

CREATE TABLE `learnerReports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `learnerId` INT NOT NULL,
  `teacherId` INT NOT NULL,
  `courseId` INT,
  `level` VARCHAR(40) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `notes` TEXT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`learnerId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`)
);
CREATE INDEX `learnerReports_learnerId_idx` ON `learnerReports` (`learnerId`);
CREATE INDEX `learnerReports_teacherId_idx` ON `learnerReports` (`teacherId`);

-- One row per teacher who has connected their Google account for
-- auto-generated Meet links (server/_core/googleCalendar.ts). refreshToken
-- is the only thing that must survive across server restarts — accessToken
-- is a short-lived cache refreshed on demand.
CREATE TABLE `googleCalendarConnections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL UNIQUE,
  `refreshToken` TEXT NOT NULL,
  `accessToken` TEXT,
  `accessTokenExpiresAt` TIMESTAMP NULL,
  `googleEmail` VARCHAR(320),
  `connectedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
);
