-- Seeds one starter-level course "skeleton" per active training subject
-- (computing / office / ai / ecommerce) — a real title, description and
-- level, but no units/lessons yet and left unpublished (isPublished = 0,
-- status = 'draft'). This is a container to fill in once real content
-- (the user's own books/references) is added as lessons — never shown to
-- a real visitor as-is, exactly like every other "not really ready yet"
-- state in this codebase (an unconfigured payment provider, an empty
-- placement test used to be, etc.): honest emptiness, not a fake course.
-- `ownerId` is left NULL (nullable in schema.ts) since no specific
-- teacher/admin account is being assigned yet; an admin can claim/reassign
-- ownership later from the admin panel.
INSERT INTO `courses`
	(`slug`, `subject`, `level`, `titleAr`, `titleFr`, `titleEn`, `descriptionAr`, `descriptionFr`, `descriptionEn`, `isPublished`, `status`)
VALUES
	(
		'computing-fundamentals', 'computing', 'starter',
		'أساسيات الإعلام الآلي', 'Fondamentaux de l''informatique', 'IT Fundamentals',
		'دورة شاملة تؤسسك في عالم الإعلام الآلي: مكونات الحاسوب، أنظمة التشغيل، الإنترنت، والأمن الرقمي — خطوة بخطوة من الصفر.',
		'Une formation complète pour vous initier à l''informatique : composants de l''ordinateur, systèmes d''exploitation, Internet et sécurité numérique — étape par étape, à partir de zéro.',
		'A comprehensive course to build your IT foundations: computer components, operating systems, the internet, and digital security — step by step, starting from zero.',
		0, 'draft'
	),
	(
		'office-software-essentials', 'office', 'starter',
		'إتقان برامج المكتب (Word, Excel, PowerPoint)', 'Maîtriser les logiciels bureautiques (Word, Excel, PowerPoint)', 'Mastering Office Software (Word, Excel, PowerPoint)',
		'تعلّم استخدام Word وExcel وPowerPoint باحتراف لإنجاز مستنداتك وجداولك وعروضك التقديمية بكفاءة، سواء للعمل الإداري أو الدراسة.',
		'Apprenez à utiliser Word, Excel et PowerPoint avec professionnalisme pour réaliser vos documents, tableaux et présentations efficacement, que ce soit pour le travail administratif ou les études.',
		'Learn to use Word, Excel and PowerPoint professionally to produce your documents, spreadsheets and presentations efficiently, whether for administrative work or study.',
		0, 'draft'
	),
	(
		'ai-foundations', 'ai', 'starter',
		'مدخل إلى الذكاء الاصطناعي', 'Introduction à l''intelligence artificielle', 'Introduction to Artificial Intelligence',
		'افهم أساسيات الذكاء الاصطناعي ومجالاته وأدواته العملية، واكتشف كيف يمكن استخدامه لتطوير مهاراتك وإنتاجيتك اليومية.',
		'Comprenez les bases de l''intelligence artificielle, ses domaines et ses outils pratiques, et découvrez comment l''utiliser pour développer vos compétences et votre productivité au quotidien.',
		'Understand the basics of artificial intelligence, its fields and practical tools, and discover how to use it to develop your skills and everyday productivity.',
		0, 'draft'
	),
	(
		'ecommerce-fundamentals', 'ecommerce', 'starter',
		'أساسيات التجارة الإلكترونية', 'Fondamentaux du e-commerce', 'E-commerce Fundamentals',
		'تعلّم كيفية إنشاء وإدارة متجر إلكتروني ناجح: من اختيار المنتج إلى التسويق الرقمي وإدارة الطلبات والدفع الإلكتروني.',
		'Apprenez à créer et gérer une boutique en ligne performante : du choix du produit au marketing digital, en passant par la gestion des commandes et le paiement en ligne.',
		'Learn how to build and run a successful online store: from choosing a product to digital marketing, order management, and online payment.',
		0, 'draft'
	)
ON DUPLICATE KEY UPDATE `slug` = `slug`;
