-- Sessions with a human teacher (حجز حصة مع أستاذ): teacher profiles an
-- admin creates (linked to a "teacher" account when there is one), the time
-- slots they open, and students' bookings of those slots. New tables only.
CREATE TABLE IF NOT EXISTS `tafawoqTutors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NULL,
  `displayName` VARCHAR(120) NOT NULL,
  `subjects` VARCHAR(255) NOT NULL,
  `bio` TEXT NULL,
  `priceDa` INT NOT NULL DEFAULT 0,
  `active` INT NOT NULL DEFAULT 1,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `tafawoqTutors_user_unique` (`userId`),
  CONSTRAINT `tafawoqTutors_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
);

CREATE TABLE IF NOT EXISTS `tafawoqTutorSlots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tutorId` INT NOT NULL,
  `startsAt` TIMESTAMP NOT NULL,
  `durationMin` INT NOT NULL DEFAULT 45,
  `status` ENUM('open', 'booked', 'cancelled') NOT NULL DEFAULT 'open',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `tafawoqTutorSlots_tutor_idx` (`tutorId`, `startsAt`),
  KEY `tafawoqTutorSlots_status_idx` (`status`, `startsAt`),
  CONSTRAINT `tafawoqTutorSlots_tutor_fk` FOREIGN KEY (`tutorId`) REFERENCES `tafawoqTutors` (`id`)
);

CREATE TABLE IF NOT EXISTS `tafawoqBookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slotId` INT NOT NULL,
  `tutorId` INT NOT NULL,
  `studentId` INT NOT NULL,
  `userId` INT NOT NULL,
  `subject` VARCHAR(32) NOT NULL,
  `note` TEXT NULL,
  `status` ENUM('requested', 'confirmed', 'declined', 'cancelled', 'done') NOT NULL DEFAULT 'requested',
  `meetingUrl` VARCHAR(255) NULL,
  `tutorNote` TEXT NULL,
  `cancelledBy` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NULL,
  KEY `tafawoqBookings_user_idx` (`userId`, `status`),
  KEY `tafawoqBookings_tutor_idx` (`tutorId`, `status`),
  KEY `tafawoqBookings_slot_idx` (`slotId`),
  CONSTRAINT `tafawoqBookings_slot_fk` FOREIGN KEY (`slotId`) REFERENCES `tafawoqTutorSlots` (`id`),
  CONSTRAINT `tafawoqBookings_tutor_fk` FOREIGN KEY (`tutorId`) REFERENCES `tafawoqTutors` (`id`),
  CONSTRAINT `tafawoqBookings_student_fk` FOREIGN KEY (`studentId`) REFERENCES `tafawoqStudents` (`id`),
  CONSTRAINT `tafawoqBookings_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
);
