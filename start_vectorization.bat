@echo off
echo 开始为naming_classics表生成BGE-M3嵌入向量...
echo 开始时间: %date% %time%
echo.

cd /d "C:\seekname"

echo 启动向量化进程...
python vectorize_naming_classics.py

echo.
echo 结束时间: %date% %time%
echo 向量化完成!
pause