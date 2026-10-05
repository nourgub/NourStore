-- Supports a new automatic reminder: a learner who got RIB details via
-- WhatsApp but never sent a receipt photo was previously never followed
-- up with at all — the invoice just sat "pending" silently forever.
-- remindedAt tracks whether this exact session has already been reminded,
-- so the sweep (server/whatsappBot.ts remindStaleCheckoutSessions) never
-- sends the same reminder twice.
ALTER TABLE `whatsappCheckoutSessions` ADD COLUMN `remindedAt` timestamp;
