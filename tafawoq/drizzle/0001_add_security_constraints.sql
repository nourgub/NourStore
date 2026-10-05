ALTER TABLE `certificates` ADD `status` enum('active','revoked') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `certificates` ADD `revokedAt` timestamp;--> statement-breakpoint
ALTER TABLE `courses` ADD `isFree` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `lessonProgress` ADD `studySeconds` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `lessonProgress` ADD `lastActivityAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `parentInviteCodes` ADD `canceledAt` timestamp;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_user_course_unique` UNIQUE(`userId`,`courseId`);--> statement-breakpoint
ALTER TABLE `courseEnrollments` ADD CONSTRAINT `courseEnrollments_user_course_unique` UNIQUE(`userId`,`courseId`);--> statement-breakpoint
ALTER TABLE `lessonProgress` ADD CONSTRAINT `lessonProgress_user_lesson_unique` UNIQUE(`userId`,`lessonId`);--> statement-breakpoint
ALTER TABLE `parentLinks` ADD CONSTRAINT `parentLinks_parent_child_unique` UNIQUE(`parentId`,`childId`);--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_quiz_user_attempt_unique` UNIQUE(`quizId`,`userId`,`attemptNumber`);--> statement-breakpoint
ALTER TABLE `algorithmAttempts` ADD CONSTRAINT `algorithmAttempts_exerciseId_algorithmExercises_id_fk` FOREIGN KEY (`exerciseId`) REFERENCES `algorithmExercises`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `algorithmAttempts` ADD CONSTRAINT `algorithmAttempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courseEnrollments` ADD CONSTRAINT `courseEnrollments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courseEnrollments` ADD CONSTRAINT `courseEnrollments_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessonAssets` ADD CONSTRAINT `lessonAssets_lessonId_lessons_id_fk` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessonAssets` ADD CONSTRAINT `lessonAssets_uploaderId_users_id_fk` FOREIGN KEY (`uploaderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessonProgress` ADD CONSTRAINT `lessonProgress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessonProgress` ADD CONSTRAINT `lessonProgress_lessonId_lessons_id_fk` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parentInviteCodes` ADD CONSTRAINT `parentInviteCodes_childId_users_id_fk` FOREIGN KEY (`childId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parentLinks` ADD CONSTRAINT `parentLinks_parentId_users_id_fk` FOREIGN KEY (`parentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parentLinks` ADD CONSTRAINT `parentLinks_childId_users_id_fk` FOREIGN KEY (`childId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `placementAttempts` ADD CONSTRAINT `placementAttempts_testId_placementTests_id_fk` FOREIGN KEY (`testId`) REFERENCES `placementTests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `placementAttempts` ADD CONSTRAINT `placementAttempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `placementQuestions` ADD CONSTRAINT `placementQuestions_testId_placementTests_id_fk` FOREIGN KEY (`testId`) REFERENCES `placementTests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_quizId_unitQuizzes_id_fk` FOREIGN KEY (`quizId`) REFERENCES `unitQuizzes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizQuestions` ADD CONSTRAINT `quizQuestions_quizId_unitQuizzes_id_fk` FOREIGN KEY (`quizId`) REFERENCES `unitQuizzes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unitQuizzes` ADD CONSTRAINT `unitQuizzes_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `units` ADD CONSTRAINT `units_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userSubscriptions` ADD CONSTRAINT `userSubscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userSubscriptions` ADD CONSTRAINT `userSubscriptions_planId_subscriptionPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `subscriptionPlans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `algorithmAttempts_exerciseId_idx` ON `algorithmAttempts` (`exerciseId`);--> statement-breakpoint
CREATE INDEX `algorithmAttempts_userId_idx` ON `algorithmAttempts` (`userId`);--> statement-breakpoint
CREATE INDEX `courseEnrollments_courseId_idx` ON `courseEnrollments` (`courseId`);--> statement-breakpoint
CREATE INDEX `courses_ownerId_idx` ON `courses` (`ownerId`);--> statement-breakpoint
CREATE INDEX `courses_isPublished_idx` ON `courses` (`isPublished`);--> statement-breakpoint
CREATE INDEX `lessonAssets_lessonId_idx` ON `lessonAssets` (`lessonId`);--> statement-breakpoint
CREATE INDEX `lessonProgress_lessonId_idx` ON `lessonProgress` (`lessonId`);--> statement-breakpoint
CREATE INDEX `lessons_unitId_idx` ON `lessons` (`unitId`);--> statement-breakpoint
CREATE INDEX `notifications_userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `parentInviteCodes_childId_idx` ON `parentInviteCodes` (`childId`);--> statement-breakpoint
CREATE INDEX `parentLinks_childId_idx` ON `parentLinks` (`childId`);--> statement-breakpoint
CREATE INDEX `placementAttempts_userId_idx` ON `placementAttempts` (`userId`);--> statement-breakpoint
CREATE INDEX `placementQuestions_testId_idx` ON `placementQuestions` (`testId`);--> statement-breakpoint
CREATE INDEX `quizAttempts_userId_idx` ON `quizAttempts` (`userId`);--> statement-breakpoint
CREATE INDEX `quizQuestions_quizId_idx` ON `quizQuestions` (`quizId`);--> statement-breakpoint
CREATE INDEX `units_courseId_idx` ON `units` (`courseId`);--> statement-breakpoint
CREATE INDEX `userSubscriptions_userId_idx` ON `userSubscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `userSubscriptions_planId_idx` ON `userSubscriptions` (`planId`);