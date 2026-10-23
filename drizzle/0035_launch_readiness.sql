-- Launch readiness: session revocation, self-service password reset, data
-- export / account deletion requests, usage metering, a per-cycle session
-- allowance, payment reconciliation and the pedagogical review status of
-- lessons. Additive only: new tables, new nullable or defaulted columns.

-- Bumped on every password change/reset: sessions signed with an older
-- version stop working (server/_core/session.ts).
ALTER TABLE `users` ADD COLUMN `sessionVersion` INT NOT NULL DEFAULT 0;

-- One-time, short-lived password reset codes. Only a SHA-256 of the code is
-- stored; the code itself is sent by email and never kept.
CREATE TABLE IF NOT EXISTS `passwordResetTokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` TIMESTAMP NOT NULL,
  `usedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `passwordResetTokens_hash_unique` (`tokenHash`),
  KEY `passwordResetTokens_user_idx` (`userId`, `createdAt`),
  CONSTRAINT `passwordResetTokens_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
);

-- A user's request to export their data or delete their account, handled by
-- an admin (what is kept, and for how long, is the owner's retention policy).
CREATE TABLE IF NOT EXISTS `accountRequests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `kind` ENUM('export', 'delete') NOT NULL,
  `status` ENUM('open', 'done', 'rejected') NOT NULL DEFAULT 'open',
  `note` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolvedAt` TIMESTAMP NULL,
  `resolvedBy` INT NULL,
  KEY `accountRequests_status_idx` (`status`, `createdAt`),
  KEY `accountRequests_user_idx` (`userId`),
  CONSTRAINT `accountRequests_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
);

-- Daily counters of what costs money or capacity (AI calls and tokens,
-- emails, sessions booked): numbers only, never content or user data.
CREATE TABLE IF NOT EXISTS `tafawoqUsage` (
  `day` DATE NOT NULL,
  `metric` VARCHAR(48) NOT NULL,
  `amount` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`day`, `metric`)
);

-- The subscription a booking was counted against (the per-cycle allowance).
ALTER TABLE `tafawoqBookings` ADD COLUMN `subscriptionId` INT NULL;
ALTER TABLE `tafawoqBookings` ADD KEY `tafawoqBookings_subscription_idx` (`subscriptionId`, `status`);

-- What the admin actually received when confirming a manual payment.
ALTER TABLE `tafawoqSubscriptions` ADD COLUMN `paidAmountDa` INT NULL;
ALTER TABLE `tafawoqSubscriptions` ADD COLUMN `paidReference` VARCHAR(120) NULL;

-- Pedagogical review of each lesson by a human teacher. Automated checks
-- never set "approved".
CREATE TABLE IF NOT EXISTS `tafawoqContentReviews` (
  `lessonKey` VARCHAR(80) NOT NULL PRIMARY KEY,
  `status` ENUM('unreviewed', 'in_review', 'approved', 'needs_changes') NOT NULL DEFAULT 'unreviewed',
  `reviewerName` VARCHAR(120) NULL,
  `note` TEXT NULL,
  `updatedBy` INT NULL,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sessions with a teacher: a monthly allowance per subscription cycle and a
-- cap on sessions booked ahead. Trial values — the owner decides the
-- commercial ones (Admin → Settings).
INSERT INTO `platformSettings` (`key`, `value`) VALUES ('bac.sessionsPerMonth', '2')
  ON DUPLICATE KEY UPDATE `value` = `value`;
INSERT INTO `platformSettings` (`key`, `value`) VALUES ('bac.maxUpcomingSessions', '3')
  ON DUPLICATE KEY UPDATE `value` = `value`;
