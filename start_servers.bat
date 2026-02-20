@echo off
chcp 65001 > nul
echo ===================================================
echo   ChannelAI [React/Vite] 통합 서버 실행기
echo ===================================================

:: 백엔드 실행 (Port: 5000)
start cmd /k "cd backend && echo [Backend] 서버(Port: 5000) 시작 중... && npm run dev"

:: 프런트엔드 실행 (Port: 5173)
start cmd /k "cd frontend && echo [Frontend] 리액트(Port: 5173) 시작 중... && npm run dev"

echo.
echo 백엔드(5000)와 프런트엔드(5173)가 각각 새로운 창에서 실행되었습니다.
echo 테스트 중에는 창을 닫지 마세요.
pause
