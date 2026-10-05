-- Adds Algeria's three school stages (primary/middle/secondary) as a real
-- column on courses, orthogonal to the existing `level` (a difficulty tier
-- within a stage, not a stage itself). Existing rows default to "middle"
-- (this platform's original focus was BEM/BAC, i.e. middle+secondary) — an
-- admin should review and correct any existing course whose real stage
-- isn't middle via the course-edit panel.
--> statement-breakpoint
ALTER TABLE `courses` ADD COLUMN `stage` ENUM('primary','middle','secondary') NOT NULL DEFAULT 'middle';
