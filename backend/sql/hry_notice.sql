-- 群公告主表 + 指定用户关联表（执行一次）
CREATE TABLE IF NOT EXISTS `hry_notice` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `body` MEDIUMTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `published_at` DATETIME NULL DEFAULT NULL COMMENT 'NULL 表示草稿未发布',
  `admin_id` INT UNSIGNED NOT NULL COMMENT '创建/发布管理员 hry_admin.id',
  `target_type` ENUM('all', 'selected') NOT NULL DEFAULT 'all',
  PRIMARY KEY (`id`),
  KEY `idx_published_at` (`published_at`),
  KEY `idx_admin_id` (`admin_id`),
  CONSTRAINT `fk_notice_admin` FOREIGN KEY (`admin_id`) REFERENCES `hry_admin` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hry_notice_user` (
  `notice_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`notice_id`, `user_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_notice_user_notice` FOREIGN KEY (`notice_id`) REFERENCES `hry_notice` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
