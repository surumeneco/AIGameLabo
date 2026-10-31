import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,extname,normalize} from 'node:path';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer(async (req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const clean=normalize(pathname).replace(/^\/+/, '');if(clean.includes('..')){res.writeHead(403).end();return;}try{const body=await readFile(join(process.cwd(),'dist',clean||'index.html'));res.writeHead(200,{'Content-Type':mime[extname(clean)]||'text/html'});res.end(body);}catch{res.writeHead(404).end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:393,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/beacon.html`,{waitUntil:'networkidle'});
 await page.locator('#arena canvas').waitFor();
 if(!(await page.locator('#objective').innerText()).includes('灯火'))throw Error('First objective is missing');
 await page.getByRole('button',{name:'遊び方'}).click();if(!await page.locator('#instructions').isVisible())throw Error('Help unavailable');
 await page.getByRole('button',{name:'防衛を始める'}).click();
 if(await page.locator('#phase-panel').isVisible())throw Error('Start screen did not close');
 async function tap(x,y){const canvas=page.locator('#arena canvas');await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox();if(!b)throw Error('Missing Phaser canvas');await page.touchscreen.tap(b.x+b.width*x/420,b.y+b.height*y/480);}
 await tap(276,301);if(!(await page.locator('#notice').innerText()).includes('移動先'))throw Error('Tap-to-move did not work');
 await page.getByRole('button',{name:'斬撃',exact:true}).click();await page.getByRole('button',{name:'盾を構える',exact:true}).click();
 if(await page.locator('#guard').isEnabled())throw Error('Guard cooldown missing');
 await page.waitForTimeout(2100);
 if((await page.locator('#clock').innerText()).includes('準備中'))throw Error('Combat time never advanced');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'最初から'}).click();
 if(!(await page.getByRole('button',{name:'防衛を始める'}).isVisible()))throw Error('Restart unavailable');
 if(errors.length)throw Error('Page errors: '+errors.join(' / '));
 console.log('Beacon browser smoke passed: initial goal, help, real Phaser touch, attack, guard cooldown, restart');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
