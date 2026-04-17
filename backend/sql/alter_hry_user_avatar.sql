-- 执行一次：为学员表增加头像 URL（相对站点根路径，如 /uploads/avatars/1.jpg）
ALTER TABLE `hry_user`
  ADD COLUMN `avatar_url` VARCHAR(512) NULL DEFAULT NULL COMMENT '头像相对路径' AFTER `nickname`;
