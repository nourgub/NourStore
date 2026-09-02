CREATE TABLE `supportTicketMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supportTicketMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportTickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subject` varchar(255) NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supportTickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `supportTicketMessages` ADD CONSTRAINT `supportTicketMessages_ticketId_supportTickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `supportTickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportTicketMessages` ADD CONSTRAINT `supportTicketMessages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD CONSTRAINT `supportTickets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `supportTicketMessages_ticketId_idx` ON `supportTicketMessages` (`ticketId`);--> statement-breakpoint
CREATE INDEX `supportTickets_userId_idx` ON `supportTickets` (`userId`);--> statement-breakpoint
CREATE INDEX `supportTickets_status_idx` ON `supportTickets` (`status`);