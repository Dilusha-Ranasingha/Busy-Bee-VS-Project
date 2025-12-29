#!/usr/bin/env node

/**
 * Build Dashboard for Extension
 * Cross-platform script to build dashboard and copy to extension
 * Works on Windows, Mac, and Linux
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    // Read all files/folders in directory
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    // Copy file
    fs.copyFileSync(src, dest);
  }
}

function cleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

try {
  // Get paths
  const rootDir = path.resolve(__dirname, '..');
  const dashboardDir = path.join(rootDir, 'packages', 'dashboard');
  const extensionDir = path.join(rootDir, 'packages', 'extension');
  const dashboardDistDir = path.join(dashboardDir, 'dist');
  const extensionDashboardDir = path.join(extensionDir, 'dist', 'dashboard');

  log('\n🔨 Building Dashboard for Extension...', colors.bright);
  
  // Step 1: Build dashboard
  log('\n📦 Step 1/3: Building dashboard...', colors.cyan);
  process.chdir(dashboardDir);
  execSync('npm run build', { stdio: 'inherit' });
  
  // Step 2: Clean old dashboard files in extension
  log('\n🧹 Step 2/3: Cleaning old dashboard files...', colors.cyan);
  if (fs.existsSync(extensionDashboardDir)) {
    cleanDirectory(extensionDashboardDir);
    log('  ✓ Cleaned old files', colors.green);
  }
  
  // Step 3: Copy new dashboard files
  log('\n📋 Step 3/3: Copying dashboard to extension...', colors.cyan);
  
  if (!fs.existsSync(dashboardDistDir)) {
    throw new Error(`Dashboard dist folder not found at: ${dashboardDistDir}`);
  }
  
  // Create destination directory
  fs.mkdirSync(extensionDashboardDir, { recursive: true });
  
  // Copy all files
  copyRecursiveSync(dashboardDistDir, extensionDashboardDir);
  
  // Count copied files
  const files = fs.readdirSync(extensionDashboardDir);
  log(`  ✓ Copied ${files.length} items to extension`, colors.green);
  
  // Success message
  log('\n✅ Success! Dashboard built and copied to extension.', colors.green);
  log('\n📝 Next steps:', colors.yellow);
  log('  1. Reload your VS Code extension (Cmd+R / Ctrl+R)', colors.yellow);
  log('  2. Or run: npm run compile (in extension folder)\n', colors.yellow);
  
} catch (error) {
  log('\n❌ Error building dashboard:', colors.red);
  log(error.message, colors.red);
  process.exit(1);
}
