// run-dev.js
const { spawn } = require('child_process');

console.log('Starting backend and frontend...');

const backend = spawn('npm', ['run', 'dev:backend'], {
    stdio: 'inherit',
    shell: true
});

const frontend = spawn('npm', ['run', 'dev:frontend'], {
    stdio: 'inherit',
    shell: true
});

process.on('SIGINT', () => {
    backend.kill();
    frontend.kill();
    process.exit();
});