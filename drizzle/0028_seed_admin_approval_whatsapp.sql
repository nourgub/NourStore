-- Seeds the admin-approval WhatsApp number (used for the "قبول/رفض <id>"
-- registration-approval commands — see server/whatsappBot.ts) with the same
-- real number as the public contact/payment channel (platformSettings.
-- whatsapp_number, drizzle/0007_seed_contact_channels.sql), per explicit
-- user confirmation that one number covers both roles for this deployment.
-- Fully editable afterward from StaffSpace → WhatsApp admin. Safe to
-- re-run: ON DUPLICATE KEY UPDATE never overwrites a value an admin has
-- since changed with a *different* seed run, it just keeps this as the
-- initial value.
INSERT INTO `platformSettings` (`key`, `value`) VALUES
	('admin_approval_whatsapp_number', '213794071995')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
