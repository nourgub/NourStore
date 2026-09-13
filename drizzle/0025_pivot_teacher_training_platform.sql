-- Pivots Nourix Academy into a single-audience platform for math teachers
-- preparing for "الترسيم" (post-probation tenure confirmation): removes
-- every K-12-student/parent-specific and computer-science-specific table,
-- narrows the role enum, drops the now-meaningless courses.stage column,
-- and replaces the K-12 subject catalog with the six real training
-- categories this platform now offers.
--
-- Any existing "parent" or "institution" account is reassigned to
-- "learner" first (never left orphaned by the enum change below) — an
-- admin can re-promote a real teacher/mentor account to "teacher"
-- afterward via the admin panel.
--> statement-breakpoint
UPDATE `users` SET `role` = 'learner' WHERE `role` IN ('parent', 'institution');
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('learner','teacher','admin') NOT NULL DEFAULT 'learner';
--> statement-breakpoint
ALTER TABLE `courses` DROP COLUMN `stage`;
--> statement-breakpoint
DROP TABLE IF EXISTS `algorithmAttempts`;
--> statement-breakpoint
DROP TABLE IF EXISTS `algorithmExercises`;
--> statement-breakpoint
DROP TABLE IF EXISTS `parentLinks`;
--> statement-breakpoint
DROP TABLE IF EXISTS `parentInviteCodes`;
--> statement-breakpoint
-- The old K-12 subject catalog (math/computing/physics/.../philosophy,
-- seeded in 0005 and 0023) is deactivated rather than deleted — no course
-- rows are touched, and an admin can reactivate one later if ever needed.
UPDATE `subjects` SET `isActive` = 0 WHERE `slug` IN
	('math', 'computing', 'physics', 'chemistry', 'svt', 'arabic', 'french', 'english', 'history_geo', 'philosophy');
--> statement-breakpoint
INSERT INTO `subjects` (`slug`, `icon`, `titleAr`, `titleFr`, `titleEn`) VALUES
	('lesson-prep', 'file-text', 'تحضير المذكرات', 'Préparation des fiches', 'Lesson-plan preparation'),
	('didactics', 'book', 'شرح الدروس وديداكتيك الرياضيات', 'Didactique des mathématiques', 'Lesson explanations & math didactics'),
	('legislation', 'scale', 'التشريع المدرسي', 'Législation scolaire', 'School legislation'),
	('psychology', 'brain', 'علم النفس التربوي', 'Psychologie éducative', 'Educational psychology'),
	('training', 'graduation-cap', 'تكوين', 'Formation', 'Structured training'),
	('exam-samples', 'clipboard-check', 'نماذج امتحانات الترسيم', 'Sujets d''examen de titularisation', 'Past tenure-exam samples')
ON DUPLICATE KEY UPDATE `slug` = `slug`;
