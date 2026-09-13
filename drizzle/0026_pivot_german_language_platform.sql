-- Second content pivot: Nourix Academy becomes a German-language learning
-- platform — for general learners and language teachers/tutors, and for
-- preparation toward the international German-language exam. No schema
-- change is needed here (unlike 0025): the existing learner/teacher/admin
-- roles and the generic subjects/courses/level model already fit this
-- audience directly (learner = language learner, teacher = language
-- instructor). This migration only reseeds the subject catalog.
--
-- The six teacher-training categories from 0025 are deactivated rather
-- than deleted — no course row is touched, and an admin can reactivate
-- one later if ever needed.
--> statement-breakpoint
UPDATE `subjects` SET `isActive` = 0 WHERE `slug` IN
	('lesson-prep', 'didactics', 'legislation', 'psychology', 'training', 'exam-samples');
--> statement-breakpoint
INSERT INTO `subjects` (`slug`, `icon`, `titleAr`, `titleFr`, `titleEn`) VALUES
	('grammar', 'book', 'القواعد', 'Grammaire', 'Grammar'),
	('vocabulary', 'globe', 'المفردات', 'Vocabulaire', 'Vocabulary'),
	('listening-speaking', 'music', 'الاستماع والمحادثة', 'Écoute et expression orale', 'Listening & speaking'),
	('reading-writing', 'file-text', 'القراءة والكتابة', 'Lecture et écriture', 'Reading & writing'),
	('exam-prep', 'clipboard-check', 'التحضير للامتحان الدولي', 'Préparation à l''examen international', 'International exam preparation'),
	('culture', 'palette', 'الثقافة والحياة في ألمانيا', 'Culture et vie en Allemagne', 'Culture & life in Germany')
ON DUPLICATE KEY UPDATE `slug` = `slug`;
