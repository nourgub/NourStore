-- "Your road to your mark": the maths mark (out of 20) the student aims for
-- at the BAC; the platform shows the predicted mark and the daily plan to it.
ALTER TABLE `tafawoqStudents` ADD COLUMN `targetMark` DOUBLE NULL;
