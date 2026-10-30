import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const options={bundle:true,platform:'browser',format:'iife',minify:true,target:['es2020'],legalComments:'none',define:{'process.env.NODE_ENV':'"production"'}};
await Promise.all([
 build({...options,entryPoints:['src/beacon-main.js'],outfile:'dist/app.js'}),
 build({...options,entryPoints:['src/island-main.js'],outfile:'dist/island.js'})
]);
await Promise.all(['index.html','styles.css','island.html','island.css','legacy.html'].map(name=>copyFile(name,`dist/${name}`)));
console.log('Static dual-game bundle: dist/');
