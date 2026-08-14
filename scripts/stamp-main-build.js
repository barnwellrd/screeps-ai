const fs = require('fs');
const path = require('path');

const mainModulePath = path.resolve(__dirname, '..', 'dist', 'main.js');

if (!fs.existsSync(mainModulePath)) {
  throw new Error(`Main module not found at ${mainModulePath}`);
}

const timestamp = new Date().toISOString();
const stampLine = `// BUILD_TIMESTAMP: ${timestamp}\n`;

let content = fs.readFileSync(mainModulePath, 'utf8');
content = content.replace(/^\/\/ BUILD_TIMESTAMP: .*\r?\n/, '');
fs.writeFileSync(mainModulePath, stampLine + content, 'utf8');

console.log(`Stamped build timestamp in ${mainModulePath}`);
