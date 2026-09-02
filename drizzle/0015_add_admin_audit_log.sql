CREATE TABLE `adminAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`targetType` varchar(40),
	`targetId` varchar(64),
	`detailsJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `adminAuditLog` ADD CONSTRAINT `adminAuditLog_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `adminAuditLog_actorId_idx` ON `adminAuditLog` (`actorId`);--> statement-breakpoint
CREATE INDEX `adminAuditLog_action_idx` ON `adminAuditLog` (`action`);--> statement-breakpoint
CREATE INDEX `adminAuditLog_createdAt_idx` ON `adminAuditLog` (`createdAt`);