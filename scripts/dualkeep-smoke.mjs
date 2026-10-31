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
    if(width===393){
      await page.touchscreen.tap(b.x+b.width*.5,b.y+b.height*112/360);
      await page.getByRole('button',{name:'撤去（全額返金）'}).click();
      if(await page.locator('#gold').innerText()!=='10 G')throw Error('Full refund failed');
      await page.touchscreen.tap(b.x+b.width*.5,b.y+b.height*112/360);
    }
    await page.reload();await page.locator('#arena canvas').waitFor();
    if(await page.locator('#gold').innerText()!=='6 G')throw Error('Save reload failed');
    if(width===393){
      const live=page.locator('#arena canvas');
      await live.scrollIntoViewIfNeeded();
      const area=await live.boundingBox();
      await page.touchscreen.tap(area.x+area.width*.5,area.y+area.height*245/360);
      if(await page.locator('#gold').innerText()!=='2 G')throw Error('Second tower failed');
      await page.getByRole('button',{name:'防衛を開始'}).click();
      await page.getByRole('button',{name:'一時停止'}).click();
      if(await page.locator('#phase').innerText()!=='停止')throw Error('Pause failed');
      await page.getByRole('button',{name:'再開'}).click();
      await page.getByRole('button',{name:'速度 1×'}).click();
      await page.locator('#reward').waitFor({state:'visible',timeout:70000});
      await page.locator('#reward-options button').first().click();
      if(await page.locator('#wave').innerText()!=='2 / 3')throw Error('Upgrade transition failed');
      await live.scrollIntoViewIfNeeded();
      const nextArea=await live.boundingBox();
      await page.touchscreen.tap(nextArea.x+nextArea.width*50/360,nextArea.y+nextArea.height*112/360);
      await page.getByRole('button',{name:'防衛を開始'}).click();
      await page.getByRole('button',{name:'速度 1×'}).click();
      await page.locator('#reward').waitFor({state:'visible',timeout:70000});
      await page.locator('#reward-options button').first().click();
      if(await page.locator('#wave').innerText()!=='3 / 3')throw Error('Third wave not unlocked');
      await live.scrollIntoViewIfNeeded();
      const finalArea=await live.boundingBox();
      await page.touchscreen.tap(finalArea.x+finalArea.width*50/360,finalArea.y+finalArea.height*245/360);
      await page.getByRole('button',{name:'防衛を開始'}).click();
      await page.getByRole('button',{name:'速度 1×'}).click();
      await page.getByText('勝利',{exact:true}).waitFor({timeout:70000});
      if(await page.locator('#phase').innerText()!=='勝利')throw Error('Three-wave victory missing');
    }
    page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'最初から'}).click();
    if(await page.locator('#gold').innerText()!=='10 G')throw Error('Retry failed');
    if(errors.length)throw Error(errors.join(' / '));
    await page.close();
  }
  console.log('Dual Keep mobile smoke passed');
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
