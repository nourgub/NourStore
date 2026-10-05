-- Phase 5 (payments): an invoice that's created but never paid (learner
-- opens WhatsApp checkout, gets the RIB, never sends a receipt; or opens
-- BaridiMob and abandons it) previously stayed "pending" forever — no way
-- to tell a genuinely abandoned checkout attempt apart from one still in
-- progress, and it would sit in admin queues and reporting indefinitely.
ALTER TABLE `invoices` MODIFY COLUMN `status` ENUM('pending', 'paid', 'failed', 'refunded', 'canceled', 'expired') NOT NULL DEFAULT 'pending';
