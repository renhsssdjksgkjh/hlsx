@echo off
REM 在「本文件所在目录」打开 cmd，修改下面三行后双击运行（或 cmd 里执行）。
REM 不要用 mysql 里逐行粘贴中文 SQL，请用本脚本重定向导入 UTF-8 文件。

chcp 65001 >nul

set DB_HOST=127.0.0.1
set DB_USER=root
set DB_NAME=你的库名

mysql -h%DB_HOST% -u%DB_USER% -p --default-character-set=utf8mb4 %DB_NAME% < "%~dp0seed_hry_question_full.sql"

echo.
echo 若提示外键无法 TRUNCATE，请在 MySQL 里先处理子表记录或改用 DELETE FROM hry_question;
pause
