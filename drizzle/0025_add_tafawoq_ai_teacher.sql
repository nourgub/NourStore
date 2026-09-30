-- Tafawoq AI Teacher (server/tafawoq/): a personal AI teacher per learner.
--
-- tafawoqStudents    one teacher profile per user (name, age, school level, goals)
-- tafawoqSkillStates Bayesian-knowledge-tracing state per (student, lesson, skill)
-- tafawoqAssessments placement tests and practice sets, with their server-only answer keys
-- tafawoqAttempts    one row per answered question: the evidence behind mastery,
--                    learning speed and recurring-error detection
-- tafawoqLessons / tafawoqVideos / tafawoqMessages
--                    generated personal lessons, video scripts and tutor dialogue
CREATE TABLE `tafawoqStudents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL UNIQUE,
  `displayName` VARCHAR(100) NOT NULL,
  `age` INT NOT NULL,
  `schoolLevel` ENUM('primary','middle','bem','secondary','bac') NOT NULL,
  `goals` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
);

CREATE TABLE `tafawoqSkillStates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `lessonKey` VARCHAR(64) NOT NULL,
  `skillKey` VARCHAR(64) NOT NULL,
  `pKnown` DOUBLE NOT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `correct` INT NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`),
  UNIQUE KEY `tafawoqSkillStates_student_lesson_skill` (`studentId`, `lessonKey`, `skillKey`)
);

CREATE TABLE `tafawoqAssessments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `lessonKey` VARCHAR(64) NOT NULL,
  `kind` ENUM('placement','practice') NOT NULL,
  `itemsJson` MEDIUMTEXT NOT NULL,
  `source` ENUM('ai','template','bank') NOT NULL,
  `status` ENUM('open','graded') NOT NULL DEFAULT 'open',
  `score` INT,
  `resultJson` MEDIUMTEXT,
  `masteryBefore` DOUBLE,
  `masteryAfter` DOUBLE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gradedAt` TIMESTAMP NULL,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`)
);
CREATE INDEX `tafawoqAssessments_student_lesson_idx` ON `tafawoqAssessments` (`studentId`, `lessonKey`);

CREATE TABLE `tafawoqAttempts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `assessmentId` INT NOT NULL,
  `lessonKey` VARCHAR(64) NOT NULL,
  `skillKey` VARCHAR(64) NOT NULL,
  `questionId` VARCHAR(64) NOT NULL,
  `difficulty` INT NOT NULL,
  `correct` INT NOT NULL,
  `misconception` VARCHAR(200),
  `responseMs` INT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`),
  FOREIGN KEY (`assessmentId`) REFERENCES `tafawoqAssessments`(`id`)
);
CREATE INDEX `tafawoqAttempts_student_lesson_idx` ON `tafawoqAttempts` (`studentId`, `lessonKey`);

CREATE TABLE `tafawoqLessons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `lessonKey` VARCHAR(64) NOT NULL,
  `tier` ENUM('weak','intermediate','advanced') NOT NULL,
  `contentJson` MEDIUMTEXT NOT NULL,
  `source` ENUM('ai','template') NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`)
);
CREATE INDEX `tafawoqLessons_student_lesson_idx` ON `tafawoqLessons` (`studentId`, `lessonKey`);

CREATE TABLE `tafawoqVideos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `lessonKey` VARCHAR(64) NOT NULL,
  `personalLessonId` INT,
  `scriptJson` MEDIUMTEXT NOT NULL,
  `source` ENUM('ai','template') NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`),
  FOREIGN KEY (`personalLessonId`) REFERENCES `tafawoqLessons`(`id`)
);
CREATE INDEX `tafawoqVideos_student_lesson_idx` ON `tafawoqVideos` (`studentId`, `lessonKey`);

CREATE TABLE `tafawoqMessages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `lessonKey` VARCHAR(64) NOT NULL,
  `role` ENUM('tutor','student') NOT NULL,
  `content` TEXT NOT NULL,
  `source` ENUM('ai','template'),
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`)
);
CREATE INDEX `tafawoqMessages_student_lesson_idx` ON `tafawoqMessages` (`studentId`, `lessonKey`);
