import fs from 'node:fs';
import path from 'node:path';
import babel from '@babel/core';
import assert from 'node:assert';

function runFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const transformed = babel.transformSync(code, {
    filename: filePath,
    presets: ['@babel/preset-typescript'],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });

  const moduleObj = { exports: {} };
  const customRequire = (specifier) => {
    if (specifier === 'node:assert' || specifier === 'assert') return assert;
    let resolved = path.resolve(path.dirname(filePath), specifier);
    if (!fs.existsSync(resolved)) {
      if (fs.existsSync(resolved + '.ts')) resolved += '.ts';
      else if (fs.existsSync(resolved + '.tsx')) resolved += '.tsx';
      else if (fs.existsSync(resolved + '.js')) resolved += '.js';
      else if (fs.existsSync(resolved + '/index.ts')) resolved += '/index.ts';
    }
    return runFile(resolved);
  };

  const fn = new Function('require', 'module', 'exports', '__dirname', '__filename', transformed.code);
  fn(customRequire, moduleObj, moduleObj.exports, path.dirname(filePath), filePath);
  return moduleObj.exports;
}

const testFiles = [
  './src/core/load/calculateLoad.test.ts',
  './src/core/circuitBreaker/circuitBreakerEngine.test.ts',
  './src/loadtree/planner.test.ts',
  './src/loadtree/load.test.ts',
  './src/loadtree/calendarDates.test.ts',
];

let failed = false;
for (const testFile of testFiles) {
  try {
    console.log(`[TEST RUNNER] Running: ${testFile}`);
    runFile(path.resolve(testFile));
    console.log(`[TEST RUNNER] PASSED: ${testFile}\n`);
  } catch (err) {
    console.error(`[TEST RUNNER] FAILED: ${testFile}`);
    console.error(err);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('[TEST RUNNER] All tests passed.');
}
