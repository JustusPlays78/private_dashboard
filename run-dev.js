// run-dev.js
import { spawn } from 'child_process';

console.log('Starting backend and frontend...');

const backend = spawn('cd', ['backend', '&&', 'bun', 'run', 'dev'], {
    stdio: 'inherit',
    shell: true
});

const frontend = spawn('cd', ['frontend', '&&', 'bun', 'run', 'dev'], {
    stdio: 'inherit',
    shell: true
});

process.on('SIGINT', () => {
    backend.kill();
    frontend.kill();
    process.exit();
});