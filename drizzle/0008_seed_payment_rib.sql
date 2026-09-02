-- Seeds the real RIP (BaridiMob/CCP) account details the WhatsApp bot sends
-- to a learner after they reference a pending invoice. Editable afterward
-- from StaffSpace → WhatsApp payments (admin.setPaymentRib). Safe to re-run.
INSERT INTO `platformSettings` (`key`, `value`) VALUES
	('payment_rib_details', 'التحويل عبر BaridiMob إلى الحساب الجاري البريدي (RIP):\n00799999004157719936\n\nبعد التحويل، أرسل صورة وصل العملية في هذه المحادثة مباشرة.')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
