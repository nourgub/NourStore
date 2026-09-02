CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`subscriptionId` int,
	`currency` varchar(3) NOT NULL,
	`amountCents` int NOT NULL,
	`status` enum('pending','paid','failed','refunded','canceled') NOT NULL DEFAULT 'pending',
	`provider` varchar(64) NOT NULL,
	`providerReference` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`paidAt` timestamp,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`provider` varchar(64) NOT NULL,
	`providerReference` varchar(255),
	`status` enum('pending','succeeded','failed') NOT NULL DEFAULT 'pending',
	`rawResponseJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planPrices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`priceCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planPrices_id` PRIMARY KEY(`id`),
	CONSTRAINT `planPrices_plan_currency_unique` UNIQUE(`planId`,`currency`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`amountCents` int NOT NULL,
	`reason` varchar(255),
	`status` enum('pending','succeeded','failed') NOT NULL DEFAULT 'pending',
	`provider` varchar(64) NOT NULL,
	`providerReference` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_planId_subscriptionPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `subscriptionPlans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_subscriptionId_userSubscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `userSubscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentAttempts` ADD CONSTRAINT `paymentAttempts_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `planPrices` ADD CONSTRAINT `planPrices_planId_subscriptionPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `subscriptionPlans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `invoices_userId_idx` ON `invoices` (`userId`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `paymentAttempts_invoiceId_idx` ON `paymentAttempts` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `refunds_invoiceId_idx` ON `refunds` (`invoiceId`);--> statement-breakpoint
ALTER TABLE `userSubscriptions` DROP COLUMN `stripeSubscriptionId`;