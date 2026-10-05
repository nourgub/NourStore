-- Adds the standard Algerian BEM/BAC subjects beyond the initial math/
-- computing pair (see 0005_add_dynamic_subjects.sql for the original two
-- and the reasoning: `subjects` is a real admin-editable table, not a SQL
-- enum, so a new subject never needs a schema migration — this one is
-- purely a data seed, following the exact same idempotent pattern).
--> statement-breakpoint
INSERT INTO `subjects` (`slug`, `icon`, `titleAr`, `titleFr`, `titleEn`) VALUES
	('physics', 'atom', 'الفيزياء', 'Physique', 'Physics'),
	('chemistry', 'flask', 'الكيمياء', 'Chimie', 'Chemistry'),
	('svt', 'book', 'علوم الطبيعة والحياة', 'Sciences de la vie et de la terre', 'Life & earth sciences'),
	('arabic', 'globe', 'اللغة العربية', 'Langue arabe', 'Arabic language'),
	('french', 'globe', 'اللغة الفرنسية', 'Langue française', 'French language'),
	('english', 'globe', 'اللغة الإنجليزية', 'Langue anglaise', 'English language'),
	('history_geo', 'palette', 'التاريخ والجغرافيا', 'Histoire-géographie', 'History & geography'),
	('philosophy', 'brain', 'الفلسفة', 'Philosophie', 'Philosophy')
ON DUPLICATE KEY UPDATE `slug` = `slug`;
