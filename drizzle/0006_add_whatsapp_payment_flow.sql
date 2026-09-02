CREATE TABLE `paymentReceipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`storageKey` varchar(512),
	`url` varchar(768),
	`mimeType` varchar(64),
	`whatsappFromNumber` varchar(32),
	`whatsappMessageId` varchar(128),
	`status` enum('pending_review','approved','rejected') NOT NULL DEFAULT 'pending_review',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentReceipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `paymentReceipts_whatsappMessageId_unique` UNIQUE(`whatsappMessageId`)
);
--> statement-breakpoint
CREATE TABLE `whatsappCheckoutSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phoneNumber` varchar(32) NOT NULL,
	`invoiceId` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsappCheckoutSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsappCheckoutSessions_phoneNumber_unique` UNIQUE(`phoneNumber`)
);
--> statement-breakpoint
ALTER TABLE `paymentReceipts` ADD CONSTRAINT `paymentReceipts_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentReceipts` ADD CONSTRAINT `paymentReceipts_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsappCheckoutSessions` ADD CONSTRAINT `whatsappCheckoutSessions_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `paymentReceipts_invoiceId_idx` ON `paymentReceipts` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `paymentReceipts_status_idx` ON `paymentReceipts` (`status`);