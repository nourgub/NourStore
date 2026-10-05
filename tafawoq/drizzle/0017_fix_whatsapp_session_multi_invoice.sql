-- Fixes a real bug: phoneNumber was globally UNIQUE, so a learner with two
-- simultaneously pending invoices (e.g. re-attempting checkout, or trying a
-- different plan) would silently lose the ability to attach a receipt photo
-- to whichever invoice they referenced first — referencing the second
-- invoice via text overwrote the only session row for that phone number.
--
-- Fix: a phone number can now have one session row PER invoice it has
-- referenced (composite unique on phoneNumber+invoiceId), instead of
-- exactly one session row total. getWhatsappSession now resolves to the
-- most-recently-referenced STILL-PENDING invoice for that phone, so an
-- already-paid/failed invoice's old session doesn't shadow a newer pending
-- one, and a photo can still be correctly attributed after one of several
-- pending invoices gets resolved.
--
-- Also upgrades `updatedAt` to millisecond precision — real testing (not
-- just code inspection) caught that MySQL's default whole-second timestamp
-- precision made two references within the same second resolve the "most
-- recent" tiebreak non-deterministically.
ALTER TABLE `whatsappCheckoutSessions` DROP INDEX `whatsappCheckoutSessions_phoneNumber_unique`;
--> statement-breakpoint
ALTER TABLE `whatsappCheckoutSessions` ADD CONSTRAINT `whatsappCheckoutSessions_phoneNumber_invoiceId_unique` UNIQUE(`phoneNumber`,`invoiceId`);
--> statement-breakpoint
-- Upgrade to millisecond precision — MySQL's default `timestamp` precision
-- is whole seconds, which made two references within the same second
-- order non-deterministically (caught by real testing, not by inspection).
ALTER TABLE `whatsappCheckoutSessions` MODIFY COLUMN `updatedAt` timestamp(3) NOT NULL DEFAULT (now(3)) ON UPDATE CURRENT_TIMESTAMP(3);
