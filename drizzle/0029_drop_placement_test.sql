-- Removes the placement-test feature entirely, per user request: the
-- platform pivoted away from CEFR-style language levels (A1-B2) to
-- IT/office-software/AI/e-commerce training, where that scoring model no
-- longer applies. Dropped in FK-safe order: attempts and questions both
-- reference placementTests.id, so they go first.
DROP TABLE IF EXISTS `placementAttempts`;
DROP TABLE IF EXISTS `placementQuestions`;
DROP TABLE IF EXISTS `placementTests`;
