-- The teacher's voice the student chose (male | female), kept with the
-- student so it follows them from one device to another. NULL = not chosen
-- yet (the device's last choice, then "male").
ALTER TABLE `tafawoqStudents` ADD COLUMN `teacherVoice` VARCHAR(8) NULL;
