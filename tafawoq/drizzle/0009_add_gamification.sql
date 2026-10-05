CREATE TABLE `badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`icon` varchar(40) NOT NULL DEFAULT 'award',
	`criteriaKey` enum('first_lesson','five_lessons','twenty_lessons','first_quiz_pass','perfect_quiz_score','first_certificate','three_certificates') NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`descriptionAr` varchar(500) NOT NULL,
	`descriptionFr` varchar(500) NOT NULL,
	`descriptionEn` varchar(500) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `badges_id` PRIMARY KEY(`id`),
	CONSTRAINT `badges_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `pointsLedger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`points` int NOT NULL,
	`reason` enum('lesson_completed','quiz_passed','certificate_earned','algorithm_lab_passed') NOT NULL,
	`refId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pointsLedger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userBadges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`badgeId` int NOT NULL,
	`awardedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userBadges_id` PRIMARY KEY(`id`),
	CONSTRAINT `userBadges_user_badge_unique` UNIQUE(`userId`,`badgeId`)
);
--> statement-breakpoint
ALTER TABLE `pointsLedger` ADD CONSTRAINT `pointsLedger_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userBadges` ADD CONSTRAINT `userBadges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userBadges` ADD CONSTRAINT `userBadges_badgeId_badges_id_fk` FOREIGN KEY (`badgeId`) REFERENCES `badges`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pointsLedger_userId_idx` ON `pointsLedger` (`userId`);