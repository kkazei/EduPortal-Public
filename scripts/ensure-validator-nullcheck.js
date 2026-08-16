import fs from 'node:fs';
import path from 'node:path';

const targetFile = path.join(
  process.cwd(),
  'node_modules',
  'validator',
  'lib',
  'util',
  'nullUndefinedCheck.js'
);

if (fs.existsSync(targetFile)) {
  console.log('[prestart] validator util/nullUndefinedCheck.js is present');
  process.exit(0);
}

const fallbackSource = `"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isNullOrUndefined;

function isNullOrUndefined(value) {
  return value === null || value === undefined;
}

module.exports = exports.default;
module.exports.default = exports.default;
`;

try {
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, fallbackSource, 'utf8');
  console.warn('[prestart] Restored missing validator util/nullUndefinedCheck.js fallback');
} catch (error) {
  console.error('[prestart] Failed to restore validator fallback:', error);
  process.exit(1);
}
