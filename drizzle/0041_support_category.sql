-- Support tickets (tables from 0010, now used): a category, and the admin
-- reading state so a reply from the student shows as new.
-- Rollback: ALTER TABLE `supportTickets` DROP COLUMN `category`, DROP COLUMN `lastSenderRole`;
ALTER TABLE `supportTickets` ADD COLUMN `category` ENUM('account','payment','content','technical','sessions','other') NOT NULL DEFAULT 'other';
ALTER TABLE `supportTickets` ADD COLUMN `lastSenderRole` ENUM('user','staff') NOT NULL DEFAULT 'user';
