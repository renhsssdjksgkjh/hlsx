-- =============================================================================
-- hry_video：按课程文档补全 15 条视频的标题与 URL（UTF-8）。
-- 使用 UPDATE 按 id 更新，不删表，避免破坏 hry_question 外键与已有题目。
--
-- 导入方式（与 seed_hry_question_full.sql 相同）：
--   chcp 65001
--   mysql -h主机 -P3306 -u用户 -p --default-character-set=utf8mb4 库名 < seed_hry_video_titles.sql
-- =============================================================================

SET NAMES utf8mb4;

UPDATE `hry_video` SET `title` = '凤梨雪梨', `url` = 'https://xc.yofea.com/videos/001.mp4', `sort_order` = 1 WHERE `id` = 1;
UPDATE `hry_video` SET `title` = '牛油果草莓奶昔', `url` = 'https://xc.yofea.com/videos/002.mp4', `sort_order` = 2 WHERE `id` = 2;
UPDATE `hry_video` SET `title` = '牛油果雪梨', `url` = 'https://xc.yofea.com/videos/003.mp4', `sort_order` = 3 WHERE `id` = 3;
UPDATE `hry_video` SET `title` = '牛油果香蕉燕麦奇亚子', `url` = 'https://xc.yofea.com/videos/004.mp4', `sort_order` = 4 WHERE `id` = 4;
UPDATE `hry_video` SET `title` = '牛油果鲜奶', `url` = 'https://xc.yofea.com/videos/005.mp4', `sort_order` = 5 WHERE `id` = 5;
UPDATE `hry_video` SET `title` = '牛油果鲜橙雪梨', `url` = 'https://xc.yofea.com/videos/006.mp4', `sort_order` = 6 WHERE `id` = 6;
UPDATE `hry_video` SET `title` = '百香果雪梨', `url` = 'https://xc.yofea.com/videos/007.mp4', `sort_order` = 7 WHERE `id` = 7;
UPDATE `hry_video` SET `title` = '百香果橙', `url` = 'https://xc.yofea.com/videos/008.mp4', `sort_order` = 8 WHERE `id` = 8;
UPDATE `hry_video` SET `title` = '紫甘蓝凤梨雪梨', `url` = 'https://xc.yofea.com/videos/009.mp4', `sort_order` = 9 WHERE `id` = 9;
UPDATE `hry_video` SET `title` = '羽衣鲜橙雪梨', `url` = 'https://xc.yofea.com/videos/010.mp4', `sort_order` = 10 WHERE `id` = 10;
UPDATE `hry_video` SET `title` = '芒果苹果雪梨', `url` = 'https://xc.yofea.com/videos/011.mp4', `sort_order` = 11 WHERE `id` = 11;
UPDATE `hry_video` SET `title` = '芒果鲜奶', `url` = 'https://xc.yofea.com/videos/012.mp4', `sort_order` = 12 WHERE `id` = 12;
UPDATE `hry_video` SET `title` = '芒果鲜橙雪梨', `url` = 'https://xc.yofea.com/videos/013.mp4', `sort_order` = 13 WHERE `id` = 13;
UPDATE `hry_video` SET `title` = '茫茫甘露', `url` = 'https://xc.yofea.com/videos/014.mp4', `sort_order` = 14 WHERE `id` = 14;
UPDATE `hry_video` SET `title` = '莲雾雪梨', `url` = 'https://xc.yofea.com/videos/015.mp4', `sort_order` = 15 WHERE `id` = 15;
    