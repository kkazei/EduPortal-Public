#!/usr/bin/env node

/**
 * Compatibility prestart step for production hosts (e.g. Render).
 *
 * This project used to call this script from package.json. If the file is
 * missing, deployment fails before the server starts. Keep this script in repo
 * and make it safe/no-op if no action is needed.
 */

const path = require('path');

function resolveOrNull(specifier) {
  try {
    return require.resolve(specifier);
  } catch {
    return null;
  }
}

const validatorEntry = resolveOrNull('validator');

if (!validatorEntry) {
  console.warn('[prestart] "validator" package is not resolvable.');
  console.warn('[prestart] The app may fail later if validator is required at runtime.');
  process.exit(0);
}

const validatorDir = path.dirname(validatorEntry);
console.log(`[prestart] validator resolved: ${validatorDir}`);
console.log('[prestart] Validator check complete.');
