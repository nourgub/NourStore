-- Real pricing given by the platform owner: course-scoped access plans for
-- the three priced courses (office/Bureautique, AI, e-commerce — all in
-- DZD, durationDays set to the schema's 10-year ceiling to represent a
-- one-time course purchase rather than a recurring rental), plus the
-- standalone book products (Word/Excel/PowerPoint at three tiers each, the
-- AI book, and the full-book bundle). The "الإعلام الآلي" (computing/IT)
-- course is deliberately left without a plan — the owner said its content
-- isn't priced yet (it may later split into individually-priced courses,
-- the same way Bureautique became individual books). No storageKey/fileName
-- is set on any product here — the actual PDF/ZIP files are uploaded
-- separately by an admin via the Store admin panel once available.
INSERT INTO `subscriptionPlans`
	(`slug`, `planType`, `currency`, `courseId`, `titleAr`, `titleFr`, `titleEn`, `descriptionAr`, `descriptionFr`, `descriptionEn`, `priceCents`, `durationDays`, `isActive`)
VALUES
	(
		'office-course-access', 'one_time', 'DZD',
		(SELECT id FROM `courses` WHERE `slug` = 'office-software-essentials'),
		'الوصول الكامل لدورة البيروتيك (Word, Excel, PowerPoint)',
		'Accès complet au cours de bureautique (Word, Excel, PowerPoint)',
		'Full access to the Office software course (Word, Excel, PowerPoint)',
		'وصول دائم لكل دروس واختبارات دورة إتقان برامج المكتب.',
		'Accès permanent à toutes les leçons et quiz du cours de bureautique.',
		'Permanent access to every lesson and quiz in the Office software course.',
		1000000, 3650, 1
	),
	(
		'ai-course-access', 'one_time', 'DZD',
		(SELECT id FROM `courses` WHERE `slug` = 'ai-foundations'),
		'الوصول الكامل لدورة الذكاء الاصطناعي',
		'Accès complet au cours d’intelligence artificielle',
		'Full access to the Artificial Intelligence course',
		'وصول دائم لكل دروس واختبارات دورة مدخل إلى الذكاء الاصطناعي.',
		'Accès permanent à toutes les leçons et quiz du cours d’introduction à l’IA.',
		'Permanent access to every lesson and quiz in the AI foundations course.',
		1000000, 3650, 1
	),
	(
		'ecommerce-course-access', 'one_time', 'DZD',
		(SELECT id FROM `courses` WHERE `slug` = 'ecommerce-fundamentals'),
		'الوصول الكامل لدورة المتاجر الإلكترونية',
		'Accès complet au cours de commerce électronique',
		'Full access to the E-commerce course',
		'وصول دائم لكل دروس واختبارات دورة أساسيات التجارة الإلكترونية.',
		'Accès permanent à toutes les leçons et quiz du cours de commerce électronique.',
		'Permanent access to every lesson and quiz in the e-commerce fundamentals course.',
		1500000, 3650, 1
	);
--> statement-breakpoint
INSERT INTO `products`
	(`slug`, `titleAr`, `titleFr`, `titleEn`, `descriptionAr`, `descriptionFr`, `descriptionEn`, `priceCents`, `currency`, `isActive`)
VALUES
	(
		'word-book-beginner',
		'كتاب الوورد للمبتدئين', 'Livre Word — Niveau débutant', 'Word book — Beginner level',
		'كتاب PDF لتعلم أساسيات Word خطوة بخطوة، موجه للمبتدئين تمامًا.',
		'Livre PDF pour apprendre les bases de Word étape par étape, destiné aux débutants complets.',
		'A PDF book to learn Word fundamentals step by step, for complete beginners.',
		100000, 'DZD', 1
	),
	(
		'word-book-intermediate',
		'كتاب الوورد للمتوسطين', 'Livre Word — Niveau intermédiaire', 'Word book — Intermediate level',
		'كتاب PDF للمستوى المتوسط في Word، يبني على الأساسيات نحو مهارات أكثر تقدمًا.',
		'Livre PDF de niveau intermédiaire sur Word, qui approfondit les bases vers des compétences plus avancées.',
		'A PDF book for intermediate Word skills, building on the fundamentals toward more advanced use.',
		150000, 'DZD', 1
	),
	(
		'word-book-professional',
		'كتاب الوورد للمحترفين', 'Livre Word — Niveau professionnel', 'Word book — Professional level',
		'كتاب PDF للاحتراف في Word، يغطي الأدوات والتقنيات المتقدمة للاستخدام الاحترافي.',
		'Livre PDF de niveau professionnel sur Word, couvrant les outils et techniques avancés pour un usage professionnel.',
		'A PDF book for professional-level Word skills, covering advanced tools and techniques.',
		200000, 'DZD', 1
	),
	(
		'excel-book-beginner',
		'كتاب الإكسل للمبتدئين', 'Livre Excel — Niveau débutant', 'Excel book — Beginner level',
		'كتاب PDF لتعلم أساسيات Excel خطوة بخطوة، موجه للمبتدئين تمامًا.',
		'Livre PDF pour apprendre les bases d’Excel étape par étape, destiné aux débutants complets.',
		'A PDF book to learn Excel fundamentals step by step, for complete beginners.',
		100000, 'DZD', 1
	),
	(
		'excel-book-intermediate',
		'كتاب الإكسل للمتوسطين', 'Livre Excel — Niveau intermédiaire', 'Excel book — Intermediate level',
		'كتاب PDF للمستوى المتوسط في Excel، يبني على الأساسيات نحو مهارات أكثر تقدمًا.',
		'Livre PDF de niveau intermédiaire sur Excel, qui approfondit les bases vers des compétences plus avancées.',
		'A PDF book for intermediate Excel skills, building on the fundamentals toward more advanced use.',
		150000, 'DZD', 1
	),
	(
		'excel-book-professional',
		'كتاب الإكسل للمحترفين', 'Livre Excel — Niveau professionnel', 'Excel book — Professional level',
		'كتاب PDF للاحتراف في Excel، يغطي الأدوات والتقنيات المتقدمة للاستخدام الاحترافي.',
		'Livre PDF de niveau professionnel sur Excel, couvrant les outils et techniques avancés pour un usage professionnel.',
		'A PDF book for professional-level Excel skills, covering advanced tools and techniques.',
		200000, 'DZD', 1
	),
	(
		'powerpoint-book-beginner',
		'كتاب الباوربوينت للمبتدئين', 'Livre PowerPoint — Niveau débutant', 'PowerPoint book — Beginner level',
		'كتاب PDF لتعلم أساسيات PowerPoint خطوة بخطوة، موجه للمبتدئين تمامًا.',
		'Livre PDF pour apprendre les bases de PowerPoint étape par étape, destiné aux débutants complets.',
		'A PDF book to learn PowerPoint fundamentals step by step, for complete beginners.',
		100000, 'DZD', 1
	),
	(
		'powerpoint-book-intermediate',
		'كتاب الباوربوينت للمتوسطين', 'Livre PowerPoint — Niveau intermédiaire', 'PowerPoint book — Intermediate level',
		'كتاب PDF للمستوى المتوسط في PowerPoint، يبني على الأساسيات نحو مهارات أكثر تقدمًا.',
		'Livre PDF de niveau intermédiaire sur PowerPoint, qui approfondit les bases vers des compétences plus avancées.',
		'A PDF book for intermediate PowerPoint skills, building on the fundamentals toward more advanced use.',
		150000, 'DZD', 1
	),
	(
		'powerpoint-book-professional',
		'كتاب الباوربوينت للمحترفين', 'Livre PowerPoint — Niveau professionnel', 'PowerPoint book — Professional level',
		'كتاب PDF للاحتراف في PowerPoint، يغطي الأدوات والتقنيات المتقدمة للاستخدام الاحترافي.',
		'Livre PDF de niveau professionnel sur PowerPoint, couvrant les outils et techniques avancés pour un usage professionnel.',
		'A PDF book for professional-level PowerPoint skills, covering advanced tools and techniques.',
		200000, 'DZD', 1
	),
	(
		'ai-book',
		'كتاب الذكاء الاصطناعي', 'Livre sur l’intelligence artificielle', 'Artificial Intelligence book',
		'كتاب PDF يشرح أساسيات الذكاء الاصطناعي وأدواته العملية بطريقة مبسطة.',
		'Livre PDF expliquant les bases de l’intelligence artificielle et ses outils pratiques de façon simple.',
		'A PDF book explaining AI fundamentals and practical tools in a simplified way.',
		250000, 'DZD', 1
	),
	(
		'full-book-bundle',
		'حزمة الكتب الكاملة', 'Pack complet de livres', 'Full book bundle',
		'ملف ZIP واحد يضم جميع الكتب (Word، Excel، PowerPoint، الذكاء الاصطناعي) — بسعر أقل من شرائها منفصلة.',
		'Un seul fichier ZIP regroupant tous les livres (Word, Excel, PowerPoint, IA) — à un prix inférieur à un achat séparé.',
		'A single ZIP file containing every book (Word, Excel, PowerPoint, AI) — cheaper than buying them separately.',
		1000000, 'DZD', 1
	);
