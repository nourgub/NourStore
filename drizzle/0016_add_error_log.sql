CREATE TABLE `errorLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('backend','frontend') NOT NULL,
	`message` text NOT NULL,
	`stack` text,
	`context` varchar(255),
	`userId` int,
	`userAgent` text,
	`resolved` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `errorLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `errorLog` ADD CONSTRAINT `errorLog_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `errorLog_createdAt_idx` ON `errorLog` (`createdAt`);
--> statement-breakpoint
CREATE INDEX `errorLog_source_idx` ON `errorLog` (`source`);
--> statement-breakpoint
CREATE INDEX `errorLog_resolved_idx` ON `errorLog` (`resolved`);
