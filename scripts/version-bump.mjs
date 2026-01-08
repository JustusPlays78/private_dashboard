#!/usr/bin/env node
/**
 * Version bump script for automated versioning
 * Usage: node scripts/version-bump.mjs [patch|minor|major]
 * 
 * - patch: 1.0.0 -> 1.0.1 (default for regular builds)
 * - minor: 1.0.0 -> 1.1.0 (new features)
 * - major: 1.0.0 -> 2.0.0 (breaking changes)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePath = path.join(__dirname, '..', 'package.json');
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');

// Get version type from args (default: patch)
const versionType = process.argv[2] || 'patch';
const validTypes = ['patch', 'minor', 'major'];

if (!validTypes.includes(versionType)) {
  console.error(`❌ Invalid version type: ${versionType}`);
  console.error(`   Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const oldVersion = packageJson.version;

// Parse version
const versionParts = oldVersion.split('.').map(Number);
let [major, minor, patch] = versionParts;

// Bump version
switch (versionType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor++;
    patch = 0;
    break;
  case 'patch':
  default:
    patch++;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;
packageJson.version = newVersion;

// Write updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 4) + '\n');

// Get current date
const now = new Date();
const dateStr = now.toISOString().split('T')[0];

// Update or create CHANGELOG.md
let changelogContent = '';
const changelogEntry = `\n## [${newVersion}] - ${dateStr}\n\n### Changed\n- Build ${newVersion}\n`;

if (fs.existsSync(changelogPath)) {
  changelogContent = fs.readFileSync(changelogPath, 'utf8');
  
  // Find the position after the header to insert new entry
  const headerEnd = changelogContent.indexOf('\n## ');
  if (headerEnd !== -1) {
    changelogContent = 
      changelogContent.slice(0, headerEnd) + 
      changelogEntry + 
      changelogContent.slice(headerEnd);
  } else {
    changelogContent += changelogEntry;
  }
} else {
  changelogContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
${changelogEntry}`;
}

fs.writeFileSync(changelogPath, changelogContent);

console.log(`✅ Version bumped: ${oldVersion} → ${newVersion}`);
console.log(`📝 CHANGELOG.md updated`);

// Output the new version for use in CI/CD
console.log(`\n::set-output name=version::${newVersion}`);
