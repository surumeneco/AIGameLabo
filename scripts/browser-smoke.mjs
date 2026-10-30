import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer(async (req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const clean=normalize(pathname).replace(/^\/+/, '');
 if(clean.includes('..')){res.writeHead(403).end();return;}
 const path=join(process.cwd(),'dist',clean||'index.html');
 try{const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404).end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:393,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/island.html`,{waitUntil:'networkidle'});
 await page.locator('#game canvas').waitFor();
 const goal=await page.locator('#goal').innerText();if(!goal.includes('木材を3個'))throw Error('First-screen goal missing: '+goal);
 // Tap actual Phaser canvas at the same coordinates used to render the objects.
 async function tap(x,y){const canvas=page.locator('#game canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();if(!box)throw Error('Canvas missing');const cx=box.x+box.width*x/420,cy=box.y+box.height*y/570;if(cx<0||cy<0||cx>=393||cy>=844)throw Error(`Canvas tap outside viewport: ${cx},${cy}`);await page.touchscreen.tap(cx,cy);}
 async function assertCounter(id,expected){const v=await page.locator('#'+id).innerText();if(v!==String(expected))throw Error(`${id} expected ${expected}, observed ${v}`);}
 for(const [i,[x,y]] of [[88,212],[202,141],[308,236]].entries()){await tap(x,y);await assertCounter('wood',i+1);}
 await page.getByRole('button',{name:/橋を架ける/}).click();
 if(!(await page.locator('#goal').innerText()).includes('花を2輪'))throw Error('Bridge did not unlock next stage');
 for(const [i,[x,y]] of [[91,397],[261,379]].entries()){await tap(x,y);await assertCounter('flowers',i+1);}
 await page.getByRole('button',{name:/水色の庭を作る/}).click();
 if(!(await page.locator('#goal').innerText()).includes('光る石を2個'))throw Error('Garden did not unlock next stage');
 for(const [i,[x,y]] of [[104,488],[293,468]].entries()){await tap(x,y);await assertCounter('crystals',i+1);}
 await page.getByRole('button',{name:/灯台を灯す/}).click();
 if(!(await page.locator('#goal').innerText()).includes('島に明かりが戻った'))throw Error('Ending missing');
 await page.getByRole('button',{name:/夕焼け色の花を植える/}).click();
 await tap(150,500);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('aigamelabo:komorebi-island:v3')));
 if(saved?.decorations?.length!==1){const toast=await page.locator('#toast').innerText();throw Error('Flower placement was not saved: '+JSON.stringify({phase:saved?.phase,beacon:saved?.beacon,decorations:saved?.decorations,toast}));}
 await page.reload({waitUntil:'networkidle'});
 if(!(await page.locator('#goal').innerText()).includes('島に明かりが戻った'))throw Error('Save not retained');
 await page.getByRole('button',{name:'遊び方'}).click();
 if(!await page.locator('#guide').isVisible())throw Error('Help not accessible');
 if(errors.length)throw Error('Page errors: '+errors.join(' / '));
 await page.screenshot({path:'island-mobile-smoke.png',fullPage:true});
 console.log('Browser smoke passed: canvas touch x7, three crafts, save/reload, help, no page errors');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
