#!/usr/bin/env node

/**
 * Setup Node-RED Configuration
 * 
 * This script configures Node-RED to automatically load Redflow plugins.
 * It updates or creates a settings.js file in your Node-RED directory.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// Detect Node-RED directory
function getNodeRedDir() {
  const homeDir = os.homedir();
  const nodeRedDir = path.join(homeDir, '.node-red');
  
  if (fs.existsSync(nodeRedDir)) {
    return nodeRedDir;
  }
  
  // Try alternate locations
  const alternates = [
    path.join(homeDir, 'node-red'),
    '/usr/local/lib/node_modules/node-red'
  ];
  
  for (const dir of alternates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  
  return null;
}

// Get absolute paths to plugins
function getPluginPaths() {
  const projectRoot = path.resolve(__dirname, '..');
  return {
    observability: path.join(projectRoot, 'plugins', 'node-red-runtime-observability'),
    agentCore: path.join(projectRoot, 'plugins', 'agent-core')
  };
}

// Check if plugins exist
function verifyPlugins(pluginPaths) {
  const errors = [];
  
  for (const [name, pluginPath] of Object.entries(pluginPaths)) {
    if (!fs.existsSync(pluginPath)) {
      errors.push(`Plugin not found: ${name} at ${pluginPath}`);
    } else {
      const packageJson = path.join(pluginPath, 'package.json');
      if (!fs.existsSync(packageJson)) {
        errors.push(`Missing package.json in ${name}`);
      }
    }
  }
  
  return errors;
}

// Create settings configuration snippet
function createSettingsSnippet(pluginPaths) {
  return `
// ============================================
// REDFLOW PLUGINS AUTO-CONFIGURATION
// ============================================
// Auto-load Redflow plugins on startup
nodesDir: [
    '${pluginPaths.observability}',
    '${pluginPaths.agentCore}'
],

// Observability plugin configuration
observability: {
    enabled: true,
    websocket: {
        port: 3001,
        path: '/observability'
    },
    sampling: {
        enabled: true,
        rate: 0.1,
        maxSamplesPerNode: 100
    }
},

// Agent Core plugin configuration
agentCore: {
    enabled: true,
    maxIterations: 5,
    debug: false
},
// ============================================
`;
}

// Main setup function
async function setup() {
  log('\n🚀 Redflow Node-RED Setup\n', 'blue');
  
  // 1. Detect Node-RED directory
  log('1️⃣  Detecting Node-RED directory...', 'yellow');
  const nodeRedDir = getNodeRedDir();
  
  if (!nodeRedDir) {
    log('❌ Could not find Node-RED directory', 'red');
    log('\nPlease ensure Node-RED is installed:', 'yellow');
    log('  npm install -g node-red\n', 'blue');
    process.exit(1);
  }
  
  log(`   Found: ${nodeRedDir}`, 'green');
  
  // 2. Get plugin paths
  log('\n2️⃣  Locating plugins...', 'yellow');
  const pluginPaths = getPluginPaths();
  
  const errors = verifyPlugins(pluginPaths);
  if (errors.length > 0) {
    log('❌ Plugin verification failed:', 'red');
    errors.forEach(err => log(`   ${err}`, 'red'));
    process.exit(1);
  }
  
  log(`   ✓ Runtime Observability: ${pluginPaths.observability}`, 'green');
  log(`   ✓ Agent Core: ${pluginPaths.agentCore}`, 'green');
  
  // 3. Check for existing settings.js
  log('\n3️⃣  Checking settings.js...', 'yellow');
  const settingsPath = path.join(nodeRedDir, 'settings.js');
  const settingsExists = fs.existsSync(settingsPath);
  
  if (settingsExists) {
    log(`   Found existing: ${settingsPath}`, 'yellow');
    log('   Creating backup...', 'yellow');
    
    const backupPath = path.join(nodeRedDir, `settings.js.backup.${Date.now()}`);
    fs.copyFileSync(settingsPath, backupPath);
    log(`   Backup saved: ${backupPath}`, 'green');
  } else {
    log('   No existing settings.js found', 'yellow');
  }
  
  // 4. Offer to use settings.redflow.js or update existing
  log('\n4️⃣  Configuration options:', 'yellow');
  log('   A) Copy settings.redflow.js to Node-RED directory', 'blue');
  log('   B) Add plugin configuration to existing settings.js', 'blue');
  log('   C) Show manual instructions', 'blue');
  
  // For now, show instructions (interactive prompts would need readline)
  log('\n📝 Manual Setup Instructions:\n', 'yellow');
  
  log('Option A: Use settings.redflow.js (Recommended)', 'green');
  log('  Run Node-RED with:', 'blue');
  log(`    node-red --settings ${path.join(__dirname, '..', 'settings.redflow.js')}\n`, 'blue');
  
  log('Option B: Update your settings.js', 'green');
  log(`  Edit: ${settingsPath}`, 'blue');
  log('  Add this configuration:', 'blue');
  log(createSettingsSnippet(pluginPaths), 'blue');
  
  log('\n✅ Setup complete!\n', 'green');
  log('To start Node-RED with Redflow plugins:', 'yellow');
  log(`  node-red --settings ${path.join(__dirname, '..', 'settings.redflow.js')}\n`, 'blue');
}

// Run setup
setup().catch(err => {
  log(`\n❌ Setup failed: ${err.message}`, 'red');
  process.exit(1);
});

