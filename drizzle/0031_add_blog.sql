CREATE TABLE `blogPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`titleFr` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`excerptAr` varchar(500) NOT NULL,
	`excerptFr` varchar(500) NOT NULL,
	`excerptEn` varchar(500) NOT NULL,
	`contentAr` text NOT NULL,
	`contentFr` text NOT NULL,
	`contentEn` text NOT NULL,
	`isPublished` int NOT NULL DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blogPosts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blogPosts_slug_unique` UNIQUE(`slug`)
);
