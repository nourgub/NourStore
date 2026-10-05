CREATE TABLE `couponRedemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`userId` int NOT NULL,
	`invoiceId` int,
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `couponRedemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `couponRedemptions_coupon_user_unique` UNIQUE(`couponId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`discountType` enum('percent','fixed') NOT NULL,
	`discountValue` int NOT NULL,
	`maxRedemptions` int,
	`timesRedeemed` int NOT NULL DEFAULT 0,
	`validFrom` timestamp NOT NULL DEFAULT (now()),
	`validUntil` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `couponRedemptions` ADD CONSTRAINT `couponRedemptions_couponId_coupons_id_fk` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couponRedemptions` ADD CONSTRAINT `couponRedemptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couponRedemptions` ADD CONSTRAINT `couponRedemptions_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;