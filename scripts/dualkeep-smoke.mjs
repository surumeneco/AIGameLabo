import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css'};
const server=createServer(async(req,res)=>{
  const name=files[new URL(req.url,'http://localhost').pathname];
  if(!name){res.writeHead(404).end();return;}
  const body=await readFile('dist/'+name);
  res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'}).end(body);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [393,320]){
    const page=await browser.newPage({viewport:{width,height:width===393?844:568},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    const canvas=page.locator('#arena canvas');await canvas.waitFor();
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Horizontal overflow');
    await canvas.scrollIntoViewIfNeeded();
    const b=await canvas.boundingBox();
    await page.touchscreen.tap(b.x+b.width*.5,b.y+b.height*112/360);
    if(await page.locator('#gold').innerText()!=='6 G')throw Error('Tower placement failed');
    await page.reload();await page.locator('#arena canvas').waitFor();
    if(await page.locator('#gold').innerText()!=='6 G')throw Error('Save reload failed');
    page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'最初から'}).click();
    if(await page.locator('#gold').innerText()!=='10 G')throw Error('Retry failed');
    if(errors.length)throw Error(errors.join(' / '));
    await page.close();
  }
  console.log('Dual Keep mobile smoke passed');
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
