-- BAC stream (شعبة) on the Tafawoq student profile, so each student is
-- only offered the lessons of their own stream's programme. Nullable:
-- students below BAC have no stream, and existing BAC profiles keep seeing
-- every lesson until they pick one.
ALTER TABLE `tafawoqStudents` ADD COLUMN `stream` ENUM('sciences','math','techmath','gestion','lettres','langues') NULL AFTER `schoolLevel`;
