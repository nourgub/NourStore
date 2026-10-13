-- Mock BAC exams ("بكالوريا تجريبية"): a full paper for the student's stream,
-- made of one practice assessment per exercise; marked out of 20 once, on
-- hand-in, and kept so the student and their parent can follow the marks.
CREATE TABLE `tafawoqExams` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `stream` VARCHAR(16),
  `paperJson` MEDIUMTEXT NOT NULL,
  `status` ENUM('open','graded') NOT NULL DEFAULT 'open',
  `score` DOUBLE,
  `resultJson` MEDIUMTEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gradedAt` TIMESTAMP NULL,
  FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents`(`id`)
);
CREATE INDEX `tafawoqExams_student_idx` ON `tafawoqExams` (`studentId`, `createdAt`);
