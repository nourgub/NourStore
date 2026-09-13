-- Reintroduces a third account type: "institution" — a language-center
-- manager who oversees a group of teachers/learners (their own courses +
-- learner count), distinct from "admin" (no platform-wide revenue/
-- analytics access, no ability to change other users' roles). This is
-- the same role/semantics 0025 removed, restored on user request.
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('learner','teacher','institution','admin') NOT NULL DEFAULT 'learner';
