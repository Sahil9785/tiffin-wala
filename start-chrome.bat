@echo off
echo ========================================================
echo Starting TiffinWala Server with Razorpay on http://localhost:8000
echo ========================================================

start "TiffinWala Server" cmd /k "node server.js"
timeout /t 2 >nul
start chrome http://localhost:8000
echo Running in Google Chrome!
