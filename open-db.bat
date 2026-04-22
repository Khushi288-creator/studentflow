@echo off
echo Opening Prisma Studio...
cd /d "%~dp0backend"
npx prisma studio
pause
