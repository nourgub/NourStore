-- Scheduled reminders (subscription expiry, upcoming sessions, weekly test)
-- may run on several server instances at once: a reminder carries a key, and
-- the unique (userId, dedupeKey) index lets only one copy in (INSERT IGNORE).
-- NULL keys (ordinary notifications) are not constrained.
-- Rollback: DROP INDEX `notifications_dedupe_unique` ON `notifications`;
--           ALTER TABLE `notifications` DROP COLUMN `dedupeKey`;
ALTER TABLE `notifications` ADD COLUMN `dedupeKey` VARCHAR(120) NULL;
CREATE UNIQUE INDEX `notifications_dedupe_unique` ON `notifications` (`userId`, `dedupeKey`);
