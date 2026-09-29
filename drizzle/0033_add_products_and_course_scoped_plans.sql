-- Adds standalone, one-time-purchase products (book PDFs, the full-book ZIP
-- bundle) and course-scoped subscription plans — see the `subscriptionPlans`,
-- `products`, `productPurchases`, and `invoices` table comments in
-- drizzle/schema.ts for the full design. `subscriptionPlans.courseId` is
-- nullable and defaults to NULL, so every existing plan keeps its original
-- platform-wide behavior unchanged. `invoices.planId` becomes nullable
-- (paired with the new `productId`) since a product-purchase invoice has no
-- plan at all — exactly one of the two is set per invoice, enforced at the
-- application layer (see createInvoice in server/db/subscriptions/invoices.ts).
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`descriptionAr` text NOT NULL,
	`descriptionFr` text NOT NULL,
	`descriptionEn` text NOT NULL,
	`priceCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'DZD',
	`storageKey` varchar(500),
	`fileName` varchar(255),
	`fileMimeType` varchar(100),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `subscriptionPlans` ADD COLUMN `courseId` int;
--> statement-breakpoint
ALTER TABLE `subscriptionPlans` ADD CONSTRAINT `subscriptionPlans_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `planId` int;
--> statement-breakpoint
ALTER TABLE `invoices` ADD COLUMN `productId` int;
--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE `productPurchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`invoiceId` int,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productPurchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `productPurchases` ADD CONSTRAINT `productPurchases_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `productPurchases` ADD CONSTRAINT `productPurchases_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `productPurchases` ADD CONSTRAINT `productPurchases_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `productPurchases_userId_idx` ON `productPurchases` (`userId`);
--> statement-breakpoint
CREATE INDEX `productPurchases_productId_idx` ON `productPurchases` (`productId`);
