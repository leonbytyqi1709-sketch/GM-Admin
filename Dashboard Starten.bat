@echo off
title GMCUTZ — Barber Studio Terminal Dashboard
color 06
echo =====================================================================
echo           GMCUTZ BARBER STUDIO TERMINAL DASHBOARD
echo                     Fuer Giovanni
echo =====================================================================
echo.
echo [1/2] Dashboard-Server wird auf Port 3001 gestartet...
echo [2/2] Browser wird in Kuerze geoeffnet (http://localhost:3001)...
echo.
echo Druecke Strg + C, um das Dashboard zu beenden.
echo =====================================================================
echo.

start "" "http://localhost:3001"
npm run dev

pause
