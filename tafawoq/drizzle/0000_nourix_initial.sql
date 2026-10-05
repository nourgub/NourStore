CREATE TABLE `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('learner','parent','teacher','institution','admin') NOT NULL DEFAULT 'learner',
  `country` varchar(2),
  `currency` varchar(3) DEFAULT 'DZD',
  `language` varchar(5) DEFAULT 'ar',
  `timezone` varchar(64) DEFAULT 'Africa/Algiers',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `algorithmAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exerciseId` int NOT NULL,
	`userId` int NOT NULL,
	`code` text NOT NULL,
	`status` enum('passed','failed','syntax_error','timeout') NOT NULL,
	`passedTests` int NOT NULL DEFAULT 0,
	`totalTests` int NOT NULL DEFAULT 0,
	`feedbackJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `algorithmAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `algorithmExercises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`difficulty` enum('starter','easy','medium','hard') NOT NULL DEFAULT 'starter',
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`statementAr` text NOT NULL,
	`statementFr` text NOT NULL,
	`statementEn` text NOT NULL,
	`starterCode` text NOT NULL,
	`testCasesJson` text NOT NULL,
	`hintsJson` text,
	`isPublished` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `algorithmExercises_id` PRIMARY KEY(`id`),
	CONSTRAINT `algorithmExercises_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`certificateId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_certificateId_unique` UNIQUE(`certificateId`)
);
--> statement-breakpoint
CREATE TABLE `courseEnrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`progressPercent` int NOT NULL DEFAULT 0,
	`status` enum('active','completed','paused') NOT NULL DEFAULT 'active',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courseEnrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`subject` enum('math','computing') NOT NULL,
	`level` enum('starter','foundation','intermediate','advanced','exam','professional') NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`descriptionAr` text NOT NULL,
	`descriptionFr` text NOT NULL,
	`descriptionEn` text NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 0,
	`unitCount` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 0,
	`ownerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `lessonAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lessonId` int NOT NULL,
	`uploaderId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(768) NOT NULL,
	`mimeType` varchar(160) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lessonAssets_id` PRIMARY KEY(`id`),
	CONSTRAINT `lessonAssets_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `lessonProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lessonId` int NOT NULL,
	`completed` int NOT NULL DEFAULT 0,
	`lastPositionSeconds` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessonProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unitId` int NOT NULL,
	`orderIndex` int NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`type` enum('video','article','exercise','live') NOT NULL DEFAULT 'video',
	`durationMinutes` int NOT NULL DEFAULT 10,
	`liveUrl` varchar(768),
	`liveStartsAt` bigint,
	`content` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parentInviteCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parentInviteCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `parentInviteCodes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `parentLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`childId` int NOT NULL,
	`status` enum('pending','active','revoked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parentLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `placementAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`userId` int NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`recommendedLevel` enum('starter','foundation','intermediate','advanced','exam') NOT NULL,
	`answersJson` text,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `placementAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `placementQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`promptAr` text NOT NULL,
	`promptFr` text NOT NULL,
	`promptEn` text NOT NULL,
	`optionsJson` text,
	`answerKey` text,
	`skill` varchar(160) NOT NULL,
	`difficulty` enum('starter','easy','medium','hard') NOT NULL DEFAULT 'starter',
	`orderIndex` int NOT NULL,
	CONSTRAINT `placementQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `placementTests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject` enum('math','computing','combined') NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`isPublished` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `placementTests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platformSettings` (
	`key` varchar(64) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformSettings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `quizAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizId` int NOT NULL,
	`userId` int NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`passed` int NOT NULL DEFAULT 0,
	`attemptNumber` int NOT NULL DEFAULT 1,
	`feedbackJson` text,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizId` int NOT NULL,
	`questionType` enum('choice','true_false','open','code') NOT NULL DEFAULT 'choice',
	`promptAr` text NOT NULL,
	`promptFr` text NOT NULL,
	`promptEn` text NOT NULL,
	`optionsJson` text,
	`answerKey` text,
	`explanationAr` text,
	`explanationFr` text,
	`explanationEn` text,
	`orderIndex` int NOT NULL,
	CONSTRAINT `quizQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`planType` enum('free','monthly','quarterly','yearly','one_time') NOT NULL DEFAULT 'monthly',
	`currency` varchar(3) NOT NULL DEFAULT 'DZD',
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`descriptionAr` text NOT NULL,
	`descriptionFr` text NOT NULL,
	`descriptionEn` text NOT NULL,
	`priceCents` int NOT NULL DEFAULT 0,
	`durationDays` int NOT NULL DEFAULT 30,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptionPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptionPlans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `unitQuizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unitId` int NOT NULL,
	`passScore` int NOT NULL DEFAULT 60,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `unitQuizzes_id` PRIMARY KEY(`id`),
	CONSTRAINT `unitQuizzes_unitId_unique` UNIQUE(`unitId`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`orderIndex` int NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`descriptionAr` text,
	`descriptionFr` text,
	`descriptionEn` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('trialing','active','paused','canceled','expired') NOT NULL DEFAULT 'trialing',
	`autoRenew` int NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`canceledAt` timestamp,
	`paymentProvider` varchar(64),
	`providerCustomerId` varchar(255),
	`providerSubscriptionId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
