CREATE TABLE `quizAttemptAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int NOT NULL,
	`questionType` enum('choice','true_false','open','code') NOT NULL,
	`submittedAnswer` text,
	`isCorrect` int,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizAttemptAnswers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `unitQuizzes` MODIFY COLUMN `unitId` int;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD `status` enum('graded','pending_review') DEFAULT 'graded' NOT NULL;--> statement-breakpoint
ALTER TABLE `unitQuizzes` ADD `kind` enum('unit_quiz','final_exam') DEFAULT 'unit_quiz' NOT NULL;--> statement-breakpoint
ALTER TABLE `unitQuizzes` ADD `courseId` int;--> statement-breakpoint
ALTER TABLE `unitQuizzes` ADD CONSTRAINT `unitQuizzes_courseId_unique` UNIQUE(`courseId`);--> statement-breakpoint
ALTER TABLE `quizAttemptAnswers` ADD CONSTRAINT `quizAttemptAnswers_attemptId_quizAttempts_id_fk` FOREIGN KEY (`attemptId`) REFERENCES `quizAttempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttemptAnswers` ADD CONSTRAINT `quizAttemptAnswers_questionId_quizQuestions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `quizQuestions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttemptAnswers` ADD CONSTRAINT `quizAttemptAnswers_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `quizAttemptAnswers_attemptId_idx` ON `quizAttemptAnswers` (`attemptId`);--> statement-breakpoint
CREATE INDEX `quizAttemptAnswers_questionId_idx` ON `quizAttemptAnswers` (`questionId`);--> statement-breakpoint
ALTER TABLE `unitQuizzes` ADD CONSTRAINT `unitQuizzes_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;