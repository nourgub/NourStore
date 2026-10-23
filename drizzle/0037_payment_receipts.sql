-- Manual payments: the student's receipt (photo or PDF of the CCP/BaridiMob
-- slip), kept privately (owner and admins only). Payment references are
-- indexed so a reference already used on another subscription is spotted.
ALTER TABLE `tafawoqSubscriptions` ADD COLUMN `receiptKey` VARCHAR(255) NULL;
ALTER TABLE `tafawoqSubscriptions` ADD COLUMN `receiptMime` VARCHAR(40) NULL;
ALTER TABLE `tafawoqSubscriptions` ADD COLUMN `receiptUploadedAt` TIMESTAMP NULL;
CREATE INDEX `tafawoqSubscriptions_reference_idx` ON `tafawoqSubscriptions` (`paymentReference`);
CREATE INDEX `tafawoqSubscriptions_paid_reference_idx` ON `tafawoqSubscriptions` (`paidReference`);
