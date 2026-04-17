-- 执行一次：个人签名（可空）
ALTER TABLE `hry_user`
  ADD COLUMN `signature` VARCHAR(255) NULL DEFAULT NULL COMMENT '个人签名' AFTER `nickname`;
