@echo off
echo 🚀 Starting NestJS Application...

REM Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found. Creating from env.example...
    copy env.example .env
    echo 📝 Please edit .env file with your configuration
)

REM Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the application
echo 🎯 Starting development server...
npm run start:dev
