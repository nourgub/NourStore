-- "ارفع تمرينك": a student submits an exercise (typed and/or a photo); the
-- free solver answers typed BAC exercises at once (status 'auto'), and any
-- other one waits ('open') for a teacher's detailed solution ('answered').
CREATE TABLE `tafawoqExercises` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `lessonKey` VARCHAR(64),
  `text` MEDIUMTEXT,
  `note` TEXT,
  `imageKey` VARCHAR(255),
  `imageMime` VARCHAR(32),
  `status` ENUM('auto','open','answered') NOT NULL,
  `autoJson` MEDIUMTEXT,
  `answer` MEDIUMTEXT,
  `answeredBy` INT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `answeredAt` TIMESTAMP NULL,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`),
  FOREIGN KEY (`answeredBy`) REFERENCES `users`(`id`)
);
CREATE INDEX `tafawoqExercises_student_idx` ON `tafawoqExercises` (`studentId`, `createdAt`);
CREATE INDEX `tafawoqExercises_status_idx` ON `tafawoqExercises` (`status`, `createdAt`);
