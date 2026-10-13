-- Foreign-languages stream (شعبة اللغات الأجنبية): the student's third
-- language — German, Spanish or Italian — chosen with the stream and locked
-- with it; a change goes through the same admin request as a stream change.
ALTER TABLE `tafawoqStudents` ADD COLUMN `thirdLanguage` VARCHAR(16) NULL;
ALTER TABLE `tafawoqStreamRequests` ADD COLUMN `fromLanguage` VARCHAR(16) NULL;
ALTER TABLE `tafawoqStreamRequests` ADD COLUMN `toLanguage` VARCHAR(16) NULL;
ALTER TABLE `tafawoqStreamChanges` ADD COLUMN `fromLanguage` VARCHAR(16) NULL;
ALTER TABLE `tafawoqStreamChanges` ADD COLUMN `toLanguage` VARCHAR(16) NULL;
