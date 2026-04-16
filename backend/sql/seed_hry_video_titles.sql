-- =============================================================================
-- hry_video：按课程文档补全 15 条视频的标题、URL、排序与时长 duration_sec（秒）。
-- 使用 UPDATE 按 id 更新，不删表，避免破坏 hry_question 外键与已有题目。
--
-- 导入方式（与 seed_hry_question_full.sql 相同）：
--   chcp 65001
--   mysql -h主机 -P3306 -u用户 -p --default-character-set=utf8mb4 库名 < seed_hry_video_titles.sql
-- =============================================================================

SET NAMES utf8mb4;

UPDATE `hry_video` SET `title` = '凤梨雪梨', `url` = 'https://xc.yofea.com/videos/001.mp4', `sort_order` = 1, `duration_sec` = 69 WHERE `id` = 1;
UPDATE `hry_video` SET `title` = '牛油果草莓奶昔', `url` = 'https://xc.yofea.com/videos/002.mp4', `sort_order` = 2, `duration_sec` = 76 WHERE `id` = 2;
UPDATE `hry_video` SET `title` = '牛油果雪梨', `url` = 'https://xc.yofea.com/videos/003.mp4', `sort_order` = 3, `duration_sec` = 63 WHERE `id` = 3;
UPDATE `hry_video` SET `title` = '牛油果香蕉燕麦奇亚子', `url` = 'https://xc.yofea.com/videos/004.mp4', `sort_order` = 4, `duration_sec` = 105 WHERE `id` = 4;
UPDATE `hry_video` SET `title` = '牛油果鲜奶', `url` = 'https://xc.yofea.com/videos/005.mp4', `sort_order` = 5, `duration_sec` = 51 WHERE `id` = 5;
UPDATE `hry_video` SET `title` = '牛油果鲜橙雪梨', `url` = 'https://xc.yofea.com/videos/006.mp4', `sort_order` = 6, `duration_sec` = 83 WHERE `id` = 6;
UPDATE `hry_video` SET `title` = '百香果雪梨', `url` = 'https://xc.yofea.com/videos/007.mp4', `sort_order` = 7, `duration_sec` = 140 WHERE `id` = 7;
UPDATE `hry_video` SET `title` = '百香果橙', `url` = 'https://xc.yofea.com/videos/008.mp4', `sort_order` = 8, `duration_sec` = 71 WHERE `id` = 8;
UPDATE `hry_video` SET `title` = '紫甘蓝凤梨雪梨', `url` = 'https://xc.yofea.com/videos/009.mp4', `sort_order` = 9, `duration_sec` = 96 WHERE `id` = 9;
UPDATE `hry_video` SET `title` = '羽衣鲜橙雪梨', `url` = 'https://xc.yofea.com/videos/010.mp4', `sort_order` = 10, `duration_sec` = 89 WHERE `id` = 10;
UPDATE `hry_video` SET `title` = '芒果苹果雪梨', `url` = 'https://xc.yofea.com/videos/011.mp4', `sort_order` = 11, `duration_sec` = 102 WHERE `id` = 11;
UPDATE `hry_video` SET `title` = '芒果鲜奶', `url` = 'https://xc.yofea.com/videos/012.mp4', `sort_order` = 12, `duration_sec` = 54 WHERE `id` = 12;
UPDATE `hry_video` SET `title` = '芒果鲜橙雪梨', `url` = 'https://xc.yofea.com/videos/013.mp4', `sort_order` = 13, `duration_sec` = 147 WHERE `id` = 13;
UPDATE `hry_video` SET `title` = '茫茫甘露', `url` = 'https://xc.yofea.com/videos/014.mp4', `sort_order` = 14, `duration_sec` = 83 WHERE `id` = 14;
UPDATE `hry_video` SET `title` = '莲雾雪梨', `url` = 'https://xc.yofea.com/videos/015.mp4', `sort_order` = 15, `duration_sec` = 126 WHERE `id` = 15;
    