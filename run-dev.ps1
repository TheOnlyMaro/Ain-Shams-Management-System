<#
run-dev.ps1
Starts MongoDB (via Docker), the backend server, and the frontend (Vite)

Usage: Open PowerShell in the project root and run:
  .\run-dev.ps1

Notes:
- This script prefers Docker for Mongo. If you don't have Docker installed
  or want to run a local mongod instead, skip the Docker section and
  start mongod manually before running the script.
#>

Write-Host "Starting development environment..."

# 1) Start MongoDB using Docker (container name: ainshams-mongo)
Write-Host "Checking for Docker and starting MongoDB container..."
try {
  $docker = Get-Command docker -ErrorAction Stop
  $existing = docker ps -a --filter "name=^/ainshams-mongo$" --format "{{.Names}}" 2>$null
  if (-not $existing) {
    Write-Host "Creating and running MongoDB container 'ainshams-mongo' (exposes port 27017)"
    docker run --name ainshams-mongo -p 27017:27017 -e MONGO_INITDB_DATABASE=ainshams_db -d mongo:6.0 | Out-Null
    Start-Sleep -Seconds 2
  } else {
    Write-Host "Starting existing container 'ainshams-mongo'"
    docker start ainshams-mongo | Out-Null
  }
} catch {
  Write-Warning "Docker not available or failed to run; please ensure MongoDB is running locally or in Atlas. Skipping Docker start."
}

# 2) Start backend server in a new PowerShell window
Write-Host "Starting backend server (server/index.js) in a new PowerShell window..."
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location -LiteralPath '$PSScriptRoot\server'; if (!(Test-Path node_modules)) { npm install } ; npm start"

# 3) Start frontend in another new PowerShell window
Write-Host "Starting frontend (Vite) in a new PowerShell window..."
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location -LiteralPath '$PSScriptRoot'; if (!(Test-Path node_modules)) { npm install } ; npm run dev"

Write-Host "All processes launched. Check the new windows for logs."

Write-Host "Stop MongoDB (Docker) with: docker stop ainshams-mongo"
Write-Host "Remove container with: docker rm -f ainshams-mongo"
