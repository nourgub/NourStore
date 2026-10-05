CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`subject` enum('math','computing') NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skills_id` PRIMARY KEY(`id`),
	CONSTRAINT `skills_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `lessons` ADD `skillId` int;--> statement-breakpoint
ALTER TABLE `quizQuestions` ADD `skillId` int;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_skillId_skills_id_fk` FOREIGN KEY (`skillId`) REFERENCES `skills`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizQuestions` ADD CONSTRAINT `quizQuestions_skillId_skills_id_fk` FOREIGN KEY (`skillId`) REFERENCES `skills`(`id`) ON DELETE no action ON UPDATE no action;