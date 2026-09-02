CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(40) NOT NULL,
	`icon` varchar(40) NOT NULL DEFAULT 'book',
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `courses` MODIFY COLUMN `subject` varchar(40) NOT NULL;--> statement-breakpoint
ALTER TABLE `placementTests` MODIFY COLUMN `subject` varchar(40) NOT NULL;--> statement-breakpoint
ALTER TABLE `skills` MODIFY COLUMN `subject` varchar(40) NOT NULL;--> statement-breakpoint
INSERT INTO `subjects` (`slug`, `icon`, `titleAr`, `titleFr`, `titleEn`) VALUES
	('math', 'sigma', 'الرياضيات', 'Mathématiques', 'Mathematics'),
	('computing', 'code', 'الإعلام الآلي', 'Informatique', 'Computing')
ON DUPLICATE KEY UPDATE `slug` = `slug`;