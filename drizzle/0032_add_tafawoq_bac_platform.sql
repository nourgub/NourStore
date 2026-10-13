-- Tafawoq BAC platform: locked stream (شعبة) and second subject, the
-- 3000 DA/month subscription confirmed by an admin, placement/weekly/mock
-- tests, daily plans, the BAC topic bank, and the security/event log.
-- Every rule these tables support is enforced on the server
-- (server/tafawoq/platform/), never only in the interface.

-- The stream is locked once chosen (streamLockedAt); only an admin, by
-- approving a change request, can change it afterwards.
ALTER TABLE `tafawoqStudents` ADD COLUMN `streamLockedAt` TIMESTAMP NULL;
ALTER TABLE `tafawoqStudents` ADD COLUMN `secondSubject` VARCHAR(32) NULL;
ALTER TABLE `tafawoqStudents` ADD COLUMN `placementDoneAt` TIMESTAMP NULL;
-- Parents never see the teacher conversation unless the student opts in.
ALTER TABLE `tafawoqStudents` ADD COLUMN `shareChatsWithParent` INT NOT NULL DEFAULT 0;
-- Free days earned (referrals) not yet added to a subscription.
ALTER TABLE `tafawoqStudents` ADD COLUMN `bonusDaysCredit` INT NOT NULL DEFAULT 0;

-- Kind of mistake behind a wrong answer (rule, sign, calculation, …).
ALTER TABLE `tafawoqAttempts` ADD COLUMN `errorType` VARCHAR(24) NULL;
CREATE INDEX `tafawoqAttempts_student_created_idx` ON `tafawoqAttempts` (`studentId`, `createdAt`);

-- Teacher messages in the fixed format (title, explanation, law, example, question).
ALTER TABLE `tafawoqMessages` ADD COLUMN `structuredJson` MEDIUMTEXT NULL;

-- One table for every multi-part paper: mock BAC, weekly test, placement.
ALTER TABLE `tafawoqExams` ADD COLUMN `kind` ENUM('mock','weekly','placement') NOT NULL DEFAULT 'mock';
ALTER TABLE `tafawoqExams` ADD COLUMN `subject` VARCHAR(32) NULL;
ALTER TABLE `tafawoqExams` ADD COLUMN `weekKey` VARCHAR(10) NULL;
-- Answers saved while the paper is open, and the time spent per exercise.
ALTER TABLE `tafawoqExams` ADD COLUMN `draftJson` MEDIUMTEXT NULL;
ALTER TABLE `tafawoqExams` ADD COLUMN `timeJson` TEXT NULL;
CREATE INDEX `tafawoqExams_student_kind_idx` ON `tafawoqExams` (`studentId`, `kind`, `createdAt`);

CREATE TABLE `tafawoqStreamRequests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `userId` INT NOT NULL,
  `fromStream` VARCHAR(16) NOT NULL,
  `toStream` VARCHAR(16) NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewedBy` INT NULL,
  `reviewNote` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewedAt` TIMESTAMP NULL,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`)
);
CREATE INDEX `tafawoqStreamRequests_status_idx` ON `tafawoqStreamRequests` (`status`, `createdAt`);

-- Append-only record of every stream change an admin made.
CREATE TABLE `tafawoqStreamChanges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `studentName` VARCHAR(100) NOT NULL,
  `fromStream` VARCHAR(16) NOT NULL,
  `toStream` VARCHAR(16) NOT NULL,
  `reason` TEXT NOT NULL,
  `adminId` INT NOT NULL,
  `adminName` VARCHAR(200) NULL,
  `requestId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`),
  FOREIGN KEY (`adminId`) REFERENCES `users`(`id`)
);

CREATE TABLE `tafawoqSecondSubjectChanges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `fromSubject` VARCHAR(32) NULL,
  `toSubject` VARCHAR(32) NULL,
  `changedBy` INT NOT NULL,
  `byAdmin` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`),
  FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`)
);
CREATE INDEX `tafawoqSecondSubjectChanges_student_idx` ON `tafawoqSecondSubjectChanges` (`studentId`, `createdAt`);

-- The subscription: requested by the student, activated only once an admin
-- confirms the payment (no payment is ever simulated).
CREATE TABLE `tafawoqSubscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `plan` VARCHAR(16) NOT NULL,
  `months` INT NOT NULL,
  `priceDa` INT NOT NULL,
  `amountDa` INT NOT NULL,
  `couponId` INT NULL,
  `referralCodeId` INT NULL,
  `paymentMethod` VARCHAR(16) NOT NULL,
  `paymentReference` VARCHAR(120) NULL,
  `status` ENUM('pending_payment','active','rejected','canceled') NOT NULL DEFAULT 'pending_payment',
  `startsAt` TIMESTAMP NULL,
  `endsAt` TIMESTAMP NULL,
  `bonusDays` INT NOT NULL DEFAULT 0,
  `reviewedBy` INT NULL,
  `reviewNote` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewedAt` TIMESTAMP NULL,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`),
  FOREIGN KEY (`referralCodeId`) REFERENCES `referralCodes`(`id`),
  FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`)
);
CREATE INDEX `tafawoqSubscriptions_user_idx` ON `tafawoqSubscriptions` (`userId`, `createdAt`);
CREATE INDEX `tafawoqSubscriptions_status_idx` ON `tafawoqSubscriptions` (`status`, `endsAt`);

-- Admin switches: "subject:<key>" or "lesson:<key>" hidden from students.
CREATE TABLE `tafawoqContentSettings` (
  `contentKey` VARCHAR(80) PRIMARY KEY,
  `enabled` INT NOT NULL,
  `updatedBy` INT NULL,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `tafawoqDailyPlans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `day` VARCHAR(10) NOT NULL,
  `planJson` MEDIUMTEXT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`),
  UNIQUE KEY `tafawoqDailyPlans_student_day` (`studentId`, `day`)
);

-- Real BAC topics an admin publishes (year, unit, model solution…).
CREATE TABLE `tafawoqBankTopics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `subject` VARCHAR(32) NOT NULL,
  `streams` VARCHAR(64) NOT NULL,
  `year` INT NULL,
  `unit` VARCHAR(120) NOT NULL,
  `difficulty` INT NOT NULL,
  `questionType` VARCHAR(16) NOT NULL,
  `kind` ENUM('full','single') NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `statement` MEDIUMTEXT NOT NULL,
  `solution` MEDIUMTEXT NOT NULL,
  `methodology` TEXT NULL,
  `points` DOUBLE NULL,
  `commonMistakes` TEXT NULL,
  `published` INT NOT NULL DEFAULT 0,
  `createdBy` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`)
);

CREATE TABLE `tafawoqTopicAnswers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `topicId` INT NOT NULL,
  `answer` MEDIUMTEXT NOT NULL,
  `selfScore` DOUBLE NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`),
  FOREIGN KEY (`topicId`) REFERENCES `tafawoqBankTopics`(`id`)
);
CREATE INDEX `tafawoqTopicAnswers_student_idx` ON `tafawoqTopicAnswers` (`studentId`, `topicId`);

CREATE TABLE `tafawoqSavedTopics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `topicId` VARCHAR(120) NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`),
  UNIQUE KEY `tafawoqSavedTopics_student_topic` (`studentId`, `topicId`)
);

-- Security / product events (sign-in, stream choice, denied access…).
-- Never holds a password, a token or a payment secret.
CREATE TABLE `tafawoqEvents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NULL,
  `event` VARCHAR(48) NOT NULL,
  `detailsJson` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `tafawoqEvents_event_idx` ON `tafawoqEvents` (`event`, `createdAt`);
CREATE INDEX `tafawoqEvents_user_idx` ON `tafawoqEvents` (`userId`, `createdAt`);

-- Second-subject changes during a subscription cycle (admin can turn off).
INSERT INTO `platformSettings` (`key`, `value`) VALUES ('bac.secondSubjectChange', '1')
  ON DUPLICATE KEY UPDATE `value` = `value`;
INSERT INTO `platformSettings` (`key`, `value`) VALUES ('bac.referralBonusDays', '7')
  ON DUPLICATE KEY UPDATE `value` = `value`;
