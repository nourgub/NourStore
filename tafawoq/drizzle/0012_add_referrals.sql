CREATE TABLE `referralCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referralCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `referralCodes_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `referralCodes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `referralRedemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referralCodeId` int NOT NULL,
	`referredUserId` int NOT NULL,
	`rewardGranted` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referralRedemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `referralRedemptions_referredUserId_unique` UNIQUE(`referredUserId`)
);
--> statement-breakpoint
ALTER TABLE `pointsLedger` MODIFY COLUMN `reason` enum('lesson_completed','quiz_passed','certificate_earned','algorithm_lab_passed','referral_reward') NOT NULL;--> statement-breakpoint
ALTER TABLE `referralCodes` ADD CONSTRAINT `referralCodes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralRedemptions` ADD CONSTRAINT `referralRedemptions_referralCodeId_referralCodes_id_fk` FOREIGN KEY (`referralCodeId`) REFERENCES `referralCodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralRedemptions` ADD CONSTRAINT `referralRedemptions_referredUserId_users_id_fk` FOREIGN KEY (`referredUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;