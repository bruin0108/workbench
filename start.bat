@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========== 工作台启动 ==========

:: 有 Node 就用 Node
where node >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ 检测到 Node.js
    if not exist "node_modules" (
        echo 📦 首次使用，安装依赖...
        npm install
    )
    echo 🚀 启动中... 浏览器打开 http://localhost:5174
    npx vite --port 5174
    pause
    exit
)

:: 用 Python 启动 dist
if exist "dist" (
    echo 🚀 用 Python 启动... 浏览器打开 http://localhost:8080
    cd dist
    python -m http.server 8080
    pause
    exit
)

echo ❌ 没找到 Node.js 也没 dist 文件夹
echo 安装 Node：https://nodejs.org
pause
