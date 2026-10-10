-- The monthly speech quota is now kept per service ("google:2026-10",
-- "azure:2026-10"): each paid service has its own free allowance. Existing
-- rows ("2026-10") were Google's and stay readable as such.
ALTER TABLE `tafawoqTtsUsage` MODIFY `month` VARCHAR(32) NOT NULL;
