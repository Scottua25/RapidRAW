import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const baseRef = process.argv[2] || 'upstream/main';
const repoRoot = process.cwd();
const eslintEntry = path.join(repoRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');
const lintableExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function isLintableFile(filePath) {
  const normalized = normalizePath(filePath);
  return lintableExtensions.has(path.extname(normalized)) || normalized.endsWith('.d.ts');
}

function getChangedFiles() {
  const diffResult = run('git', ['diff', '--name-only', '--diff-filter=ACMR', baseRef, '--']);
  if (diffResult.status !== 0) {
    process.stderr.write(diffResult.stderr);
    process.exit(diffResult.status || 1);
  }

  return diffResult.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(isLintableFile);
}

function getChangedLines(files) {
  const patchResult = run('git', ['diff', '--unified=0', '--no-color', baseRef, '--', ...files]);
  if (patchResult.status !== 0) {
    process.stderr.write(patchResult.stderr);
    process.exit(patchResult.status || 1);
  }

  const changedLines = new Map();
  let currentFile = null;
  let currentNewLine = null;

  for (const line of patchResult.stdout.split(/\r?\n/)) {
    if (line.startsWith('+++ b/')) {
      currentFile = normalizePath(line.slice(6));
      if (!changedLines.has(currentFile)) {
        changedLines.set(currentFile, new Set());
      }
      currentNewLine = null;
      continue;
    }

    if (line.startsWith('@@')) {
      const match = line.match(/\+(\d+)(?:,(\d+))?/);
      currentNewLine = match ? Number.parseInt(match[1], 10) : null;
      continue;
    }

    if (!currentFile || currentNewLine === null) {
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      changedLines.get(currentFile).add(currentNewLine);
      currentNewLine += 1;
      continue;
    }

    if (line.startsWith('-') && !line.startsWith('---')) {
      continue;
    }

    currentNewLine += 1;
  }

  return changedLines;
}

function runEslint(files) {
  const eslintResult = run(process.execPath, [eslintEntry, '-f', 'json', ...files]);

  if (!eslintResult.stdout.trim()) {
    if (eslintResult.stderr.trim()) {
      process.stderr.write(eslintResult.stderr);
    }
    process.exit(eslintResult.status || 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(eslintResult.stdout);
  } catch (error) {
    process.stderr.write(eslintResult.stdout);
    process.stderr.write(eslintResult.stderr);
    throw error;
  }

  return { parsed, status: eslintResult.status ?? 0, stderr: eslintResult.stderr };
}

function formatMessage(message) {
  const severity = message.severity === 2 ? 'error' : 'warning';
  const ruleId = message.ruleId || 'unknown';
  return `  ${message.line}:${message.column}  ${severity}  ${message.message}  ${ruleId}`;
}

const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
  process.stdout.write(`No changed lintable files relative to ${baseRef}.\n`);
  process.exit(0);
}

const changedLines = getChangedLines(changedFiles);
const { parsed, stderr } = runEslint(changedFiles);

const relevantResults = parsed
  .map((fileResult) => {
    const relativePath = normalizePath(path.relative(repoRoot, fileResult.filePath));
    const fileChangedLines = changedLines.get(relativePath) || new Set();
    const messages = fileResult.messages.filter((message) => fileChangedLines.has(message.line));
    return { relativePath, messages };
  })
  .filter((entry) => entry.messages.length > 0);

if (relevantResults.length === 0) {
  process.stdout.write(`No ESLint issues on changed lines relative to ${baseRef}.\n`);
  process.exit(0);
}

for (const result of relevantResults) {
  process.stdout.write(`\n${result.relativePath}\n`);
  for (const message of result.messages) {
    process.stdout.write(`${formatMessage(message)}\n`);
  }
}

const errorCount = relevantResults.reduce(
  (count, result) => count + result.messages.filter((message) => message.severity === 2).length,
  0,
);
const warningCount = relevantResults.reduce(
  (count, result) => count + result.messages.filter((message) => message.severity === 1).length,
  0,
);

process.stdout.write(`\nChanged-line ESLint summary: ${errorCount} error(s), ${warningCount} warning(s).\n`);

if (stderr.trim()) {
  process.stderr.write(stderr);
}

process.exit(errorCount > 0 ? 1 : 0);
