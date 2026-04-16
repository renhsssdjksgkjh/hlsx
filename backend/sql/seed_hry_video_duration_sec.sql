-- =============================================================================
-- hry_video：仅写入 id 1～15 的 duration_sec（秒），与课程顺序一致。
-- 可与 seed_hry_video_titles.sql 分开执行；已有标题数据时单独跑本文件即可。
--
--   mysql -h主机 -P3306 -u用户 -p --default-character-set=utf8mb4 库名 < seed_hry_video_duration_sec.sql
-- =============================================================================

SET NAMES utf8mb4;

UPDATE `hry_video` SET `duration_sec` = 69 WHERE `id` = 1;
UPDATE `hry_video` SET `duration_sec` = 76 WHERE `id` = 2;
UPDATE `hry_video` SET `duration_sec` = 63 WHERE `id` = 3;
UPDATE `hry_video` SET `duration_sec` = 105 WHERE `id` = 4;
UPDATE `hry_video` SET `duration_sec` = 51 WHERE `id` = 5;
UPDATE `hry_video` SET `duration_sec` = 83 WHERE `id` = 6;
UPDATE `hry_video` SET `duration_sec` = 140 WHERE `id` = 7;
UPDATE `hry_video` SET `duration_sec` = 71 WHERE `id` = 8;
UPDATE `hry_video` SET `duration_sec` = 96 WHERE `id` = 9;
UPDATE `hry_video` SET `duration_sec` = 89 WHERE `id` = 10;
UPDATE `hry_video` SET `duration_sec` = 102 WHERE `id` = 11;
UPDATE `hry_video` SET `duration_sec` = 54 WHERE `id` = 12;
UPDATE `hry_video` SET `duration_sec` = 147 WHERE `id` = 13;
UPDATE `hry_video` SET `duration_sec` = 83 WHERE `id` = 14;
UPDATE `hry_video` SET `duration_sec` = 126 WHERE `id` = 15;
