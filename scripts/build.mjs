import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints:['src/main.js'], bundle:true, outfile:'dist/app.js', platform:'browser', format:'iife', minify:true, target:['es2020'], legalComments:'none', define: { 'process.env.NODE_ENV':'"production"' } });
await Promise.all(['index.html','styles.css'].map(name => copyFile(name, `dist/${name}`)));
console.log('Static bundle: dist/');
