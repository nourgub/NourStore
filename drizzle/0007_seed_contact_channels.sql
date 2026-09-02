-- Seeds the platform's real contact channels so they're live immediately
-- after deployment, while remaining fully editable afterward from
-- StaffSpace → Contact channels (admin.setWhatsapp / admin.setSocialLinks).
-- Safe to re-run: ON DUPLICATE KEY UPDATE means it never overwrites a value
-- an admin has since changed with a *different* seed run, it just keeps
-- these as the initial values.
INSERT INTO `platformSettings` (`key`, `value`) VALUES
	('whatsapp_number', '213794941251'),
	('social_instagram_url', 'https://www.instagram.com/nourix_academy/'),
	('social_facebook_url', 'https://www.facebook.com/share/1QnVFMJFin/?mibextid=wwXIfr')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
