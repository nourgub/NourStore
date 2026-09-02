-- Phase 4 (content & admin quality): a course previously had only a
-- binary isPublished flag — no way to tell "never finished authoring"
-- (draft) apart from "was live, then intentionally taken down"
-- (archived); both looked identical (isPublished = 0). `status` is the
-- new source of truth going forward. isPublished is kept, unchanged in
-- meaning and in every existing query that reads it (archived courses
-- correctly still have isPublished = 0, same as draft), so no other file
-- needs to change just to stay correct — only the admin UI and the
-- publish/archive actions need to know about the third state.
ALTER TABLE `courses` ADD COLUMN `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft';
UPDATE `courses` SET `status` = 'published' WHERE `isPublished` = 1;

-- Learning objectives, prerequisites, and target audience — requested
-- content fields with no prior column to hold them. Nullable: existing
-- courses (and the createCourse flow) work unchanged without them: a
-- course missing these simply doesn't show that section on its page,
-- never a fake placeholder value.
ALTER TABLE `courses` ADD COLUMN `objectivesAr` text;
ALTER TABLE `courses` ADD COLUMN `objectivesFr` text;
ALTER TABLE `courses` ADD COLUMN `objectivesEn` text;
ALTER TABLE `courses` ADD COLUMN `prerequisitesAr` text;
ALTER TABLE `courses` ADD COLUMN `prerequisitesFr` text;
ALTER TABLE `courses` ADD COLUMN `prerequisitesEn` text;
ALTER TABLE `courses` ADD COLUMN `targetAudienceAr` varchar(255);
ALTER TABLE `courses` ADD COLUMN `targetAudienceFr` varchar(255);
ALTER TABLE `courses` ADD COLUMN `targetAudienceEn` varchar(255);
