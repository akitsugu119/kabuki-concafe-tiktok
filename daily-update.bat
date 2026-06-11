@echo off
rem Daily auto-update for kabuki-concafe-tiktok (run by Task Scheduler at 07:00)
cd /d "%~dp0"
if not exist data\logs mkdir data\logs
node scripts\daily-update.mjs >> data\logs\task-output.log 2>&1
