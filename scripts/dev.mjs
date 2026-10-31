import {context} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';

await mkdir('dist',{recursive:true});
await Promise.all(['index.html','styles.css','beacon.html','beacon.css','island.html','island.css','legacy.html'].map(name=>copyFile(name,`dist/${name}`)));
const ctx=await context({
  entryPoints:{app:'src/dualkeep-main.js',beacon:'src/beacon-main.js',island:'src/island-main.js'},
  outdir:'dist',bundle:true,platform:'browser',format:'iife',target:['es2020'],
  define:{'process.env.NODE_ENV':'"development"'}
});
await ctx.watch();
const server=await ctx.serve({servedir:'dist',host:'127.0.0.1',port:5173});
console.log(`AIGameLabo dev server: http://${server.host}:${server.port}/`);
