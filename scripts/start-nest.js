const { spawn } = require('node:child_process');

const args = process.argv.slice(2);
const env = { ...process.env };

if (process.platform === 'win32') {
  const system32 = 'C:\\Windows\\System32';
  const pathKeys = Object.keys(env).filter((key) => key.toLowerCase() === 'path');
  const pathKey = pathKeys.find((key) => key === 'Path') || pathKeys[0] || 'Path';
  const pathParts = pathKeys.flatMap((key) => (env[key] || '').split(';')).filter(Boolean);
  const hasSystem32 = pathParts.some((part) => part.toLowerCase() === system32.toLowerCase());

  pathKeys
    .filter((key) => key !== pathKey)
    .forEach((key) => {
      delete env[key];
    });

  if (!hasSystem32) {
    env[pathKey] = [system32, ...pathParts].join(';');
  } else {
    env[pathKey] = pathParts.join(';');
  }
}

const nestBin = require.resolve('@nestjs/cli/bin/nest.js');
const child = spawn(process.execPath, [nestBin, ...args], {
  env,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
