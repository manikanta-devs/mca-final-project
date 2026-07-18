const path = require('path');

module.exports = {
  apps: [
    {
      name: "talentforge-backend",
      script: "run_production.py",
      cwd: "./backend",
      // Resolve absolute path to virtual environment python interpreter dynamically
      interpreter: process.platform === "win32" 
        ? path.resolve(__dirname, "backend", "venv", "Scripts", "python.exe") 
        : path.resolve(__dirname, "backend", "venv", "bin", "python"),
      env: {
        FLASK_ENV: "production",
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M"
    },
    {
      name: "talentforge-frontend",
      script: "./preview_loader.js",
      cwd: "./frontend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M"
    }
  ]
};
