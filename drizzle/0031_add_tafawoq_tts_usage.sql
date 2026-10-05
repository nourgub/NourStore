-- Natural teacher voice: characters sent to a paid speech service (Google
-- Cloud Text-to-Speech) per month, so a monthly cap keeps it in the free
-- quota; the free local voice (Piper) takes over beyond it.
CREATE TABLE `tafawoqTtsUsage` (
  `month` VARCHAR(7) PRIMARY KEY,
  `characters` BIGINT NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
