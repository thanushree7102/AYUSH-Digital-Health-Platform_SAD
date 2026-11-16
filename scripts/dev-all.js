// One command for development: backend on :4000 and the React app on :5173.
const { spawn } = require('child_process');
const path = require('path');
const run = (cmd, args, name, cwd) => {
  const c = spawn(cmd, args, { stdio: 'inherit', cwd: path.join(__dirname, '..', cwd), shell: process.platform === 'win32' });
  c.on('exit', (code) => { console.log(`${name} stopped (${code})`); process.exit(code || 0); });
  return c;
};
run('node', ['server.js'], 'backend', 'backend');
run('npx', ['vite', '--host', '0.0.0.0'], 'frontend', 'frontend');
