#!/usr/bin/env node

/**
 * Pre-commit JSON formatter/checker.
 * Ensures all staged .json files are stringified with 2-space indentation
 * and a trailing newline, matching existing project JSON layout.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getStagedJsonFiles() {
  const stdout = execSync('git diff --cached --name-only --diff-filter=ACM', {
    encoding: 'utf8'
  });
  return stdout
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f.endsWith('.json') && f.length > 0);
}

function formatJsonFile(filePath) {
  const abs = path.resolve(filePath);
  const original = fs.readFileSync(abs, 'utf8');
  const parsed = JSON.parse(original);
  const formatted = JSON.stringify(parsed, null, 2) + '\n';
  if (formatted !== original) {
    fs.writeFileSync(abs, formatted, 'utf8');
    console.log(`Formatted JSON: ${filePath}`);
    return true;
  }
  return false;
}

function main() {
  const files = getStagedJsonFiles();
  if (!files.length) return;

  let reformatted = false;
  for (const file of files) {
    const changed = formatJsonFile(file);
    if (changed) {
      reformatted = true;
      // Re-stage the file after formatting
      execSync(`git add ${JSON.stringify(file)}`);
    }
  }

  if (reformatted) {
    console.log('JSON files reformatted. Please review the changes.');
  }
}

try {
  main();
} catch (err) {
  console.error('JSON format check failed:', err.message);
  process.exit(1);
}
