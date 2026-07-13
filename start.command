#!/bin/bash
# 工作台一键启动脚本 (Mac)
# 用法：双击这个文件，或在终端运行 ./start.command

cd "$(dirname "$0")"

echo "========== 工作台启动 =========="

# 方法1：有 Node.js 就用
if command -v node &>/dev/null; then
    echo "✅ 检测到 Node.js"
    if [ ! -d "node_modules" ]; then
        echo "📦 首次使用，安装依赖中..."
        npm install
    fi
    echo "🚀 启动中..."
    npx vite --port 5174
    exit 0
fi

# 方法2：用 Python（Mac 自带）
echo "⚠️  未检测到 Node.js，尝试 Python..."
if [ -d "dist" ]; then
    echo "🚀 用 Python 启动..."
    cd dist
    python3 -m http.server 8080
    exit 0
fi

# 都不行
echo "❌ 需要先构建项目，或用 Node.js 运行"
echo "安装 Node.js：brew install node"
read -p "按回车退出..."
