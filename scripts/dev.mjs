import { spawn } from 'node:child_process';
const p=spawn('npx',['esbuild','src/island-main.js','--bundle','--outfile=app.js','--servedir=.','--serve=127.0.0.1:5173','--watch','--define:process.env.NODE_ENV="development"'],{stdio:'inherit',shell:process.platform==='win32'});
process.on('SIGINT',()=>p.kill('SIGINT'));
