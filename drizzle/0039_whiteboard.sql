-- The lesson whiteboard: one board per student and lesson (free drawing,
-- text and equations, axes and curves, the teacher's current step), saved as
-- validated JSON. The device keeps its own copy too, so nothing is lost
-- while offline. Rollback: DROP TABLE `tafawoqBoards`;
CREATE TABLE `tafawoqBoards` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `lessonKey` VARCHAR(64) NOT NULL,
  `stateJson` MEDIUMTEXT NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tafawoqBoards_student_fk` FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents` (`id`),
  UNIQUE INDEX `tafawoqBoards_student_lesson` (`studentId`, `lessonKey`)
);
