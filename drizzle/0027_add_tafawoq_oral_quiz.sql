-- Oral quiz: the tutor asks one generated question in conversation (often
-- by voice) and grades the spoken answer; stored like any assessment so it
-- updates the student's knowledge-tracing state.
ALTER TABLE `tafawoqAssessments` MODIFY COLUMN `kind` ENUM('placement','practice','oral') NOT NULL;
