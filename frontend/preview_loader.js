import { spawn } from 'child_process';

const isWin = process.platform === 'win32';
const cmd = isWin ? 'npm.cmd' : 'npm';

console.log(`[Preview Loader] Spawning preview server via: ${cmd} run preview`);
const preview = spawn(cmd, ['run', 'preview', '--', '--host', '--port', '8080'], {
  stdio: 'inherit',
  shell: true
});

preview.on('close', (code) => {
  console.log(`[Preview Loader] Process exited with code ${code}`);
  process.exit(code || 0);
});

preview.on('error', (err) => {
  console.error('[Preview Loader] Failed to start preview server:', err);
  process.exit(1);
});
