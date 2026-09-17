-- What the teacher assistant actually consumed, request by request.
--
-- Every generation is a paid API call, and until now nothing in this codebase
-- recorded that: a teacher could not answer "how much of this have I used this
-- month", and an institution could not answer it for its teachers either. The
-- rate limits capped the damage without ever showing anyone the bill.
--
-- Tokens, not money: token counts come from the API response and are facts.
-- Prices change and differ per model, so this table stores no dinar figure —
-- inventing one in the schema would be inventing a number.
--
-- A failed call is recorded too (`ok` = FALSE), because a refused or errored
-- request still says something about how the assistant is being used, and a
-- month of failures should be visible rather than invisible.

CREATE TABLE `assistantUsage` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacherId` INT NOT NULL,
  `module` ENUM('lesson', 'exam', 'solutions', 'grading') NOT NULL,
  `model` VARCHAR(120) NOT NULL,
  `inputTokens` INT NOT NULL DEFAULT 0,
  `outputTokens` INT NOT NULL DEFAULT 0,
  -- FALSE for a refusal or a provider error: usage that produced nothing.
  `ok` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`)
);
-- The only query shape: one teacher's usage over a recent window.
CREATE INDEX `assistantUsage_teacher_date_idx` ON `assistantUsage` (`teacherId`, `createdAt`);
