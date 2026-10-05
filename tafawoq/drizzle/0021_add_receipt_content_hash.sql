-- Real anti-fraud protection: a payment receipt image's exact content
-- (SHA-256 of the actual bytes, not the filename or metadata) is now
-- recorded and constrained UNIQUE — the same screenshot can never be
-- accepted twice, whether resubmitted against the same invoice or a
-- completely different one. This is enforced at the database level, not
-- just in application logic, so it holds even under concurrent uploads.
-- NULL is allowed (existing WhatsApp-sourced receipts predate this column
-- and are never backfilled with a guessed hash), and MySQL's UNIQUE index
-- correctly permits any number of NULLs — only real, matching hash values
-- collide.
ALTER TABLE `paymentReceipts` ADD COLUMN `contentHash` VARCHAR(64);
ALTER TABLE `paymentReceipts` ADD UNIQUE INDEX `paymentReceipts_contentHash_unique` (`contentHash`);
