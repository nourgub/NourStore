-- Third content pivot: Nourix Academy becomes a training platform for IT
-- (informatique), office software (bureautique), artificial intelligence,
-- and e-commerce — for general learners and instructors/trainers. No
-- schema change is needed here: the existing learner/teacher/institution/
-- admin roles and the generic subjects/courses/level model already fit
-- this audience directly. This migration only reseeds the subject
-- catalog.
--
-- The six German-learning categories from 0026 are deactivated rather
-- than deleted — no course row is touched, and an admin can reactivate
-- one later if ever needed.
--> statement-breakpoint
UPDATE `subjects` SET `isActive` = 0 WHERE `slug` IN
	('grammar', 'vocabulary', 'listening-speaking', 'reading-writing', 'exam-prep', 'culture');
--> statement-breakpoint
-- Unlike every prior pivot's subject seed, "computing" here collides with a
-- real pre-existing row: it was one of the two original K-12 subjects
-- (0005_add_dynamic_subjects.sql, math + computing), later deactivated by
-- 0025's teacher-training pivot and left dormant (isActive = 0) ever
-- since. A no-op `ON DUPLICATE KEY UPDATE slug = slug` (the pattern every
-- earlier subjects migration used, safe there only because every slug it
-- touched was genuinely new) would silently leave that old row inactive
-- and with stale titles — so this one actually reactivates and
-- re-titles it.
INSERT INTO `subjects` (`slug`, `icon`, `titleAr`, `titleFr`, `titleEn`, `isActive`) VALUES
	('computing', 'code', 'الإعلام الآلي', 'Informatique', 'Computing / IT', 1),
	('office', 'briefcase', 'البيروتيك', 'Bureautique', 'Office software', 1),
	('ai', 'brain', 'الذكاء الاصطناعي', 'Intelligence artificielle', 'Artificial intelligence', 1),
	('ecommerce', 'shopping-cart', 'التجارة الإلكترونية', 'E-commerce', 'E-commerce', 1)
ON DUPLICATE KEY UPDATE
	`icon` = VALUES(`icon`),
	`titleAr` = VALUES(`titleAr`),
	`titleFr` = VALUES(`titleFr`),
	`titleEn` = VALUES(`titleEn`),
	`isActive` = VALUES(`isActive`);
