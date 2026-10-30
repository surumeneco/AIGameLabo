// A new game prototype. Pure state transitions for deterministic verification.
export const GAME_VERSION = 3;
export const NODES = Object.freeze([
  {id:'oak-1',kind:'wood',x:88,y:212,label:'左の木'},
  {id:'oak-2',kind:'wood',x:202,y:141,label:'真ん中の木'},
  {id:'oak-3',kind:'wood',x:308,y:236,label:'右の木'},
  {id:'flower-1',kind:'flower',x:91,y:397,label:'青い花'},
  {id:'flower-2',kind:'flower',x:261,y:379,label:'黄色い花'},
  {id:'crystal-1',kind:'crystal',x:104,y:488,label:'光る石'},
  {id:'crystal-2',kind:'crystal',x:293,y:468,label:'もう一つの光る石'}
]);
const startHero={x:196,y:250};
export function newIsland(){return {version:GAME_VERSION,phase:0,wood:0,flowers:0,crystals:0,used:[],bridge:false,garden:null,beacon:false,hero:{...startHero},decorations:[],events:[],last:'光っている木をタップして、木材を集めよう。'};}
export function objective(s){
 if(!s.bridge)return {chapter:'第1章 / 橋を直そう',title:'木材を3個集めて、橋を架けよう',detail:`木材 ${s.wood}/3。島にある光る木をタップします。`,hint:s.wood>=3?'準備完了！「橋を架ける」を押そう。':'光る木をタップ → 木材が増える。',action:s.wood>=3?'bridge':null};
 if(!s.garden)return {chapter:'第2章 / 花の庭',title:'橋の先で花を2輪集めよう',detail:`花 ${s.flowers}/2。橋の向こうの花をタップします。`,hint:s.flowers>=2?'好きな色の庭を選んで植えよう。':'橋の向こうの光る花をタップしよう。',action:s.flowers>=2?'garden':null};
 if(!s.beacon)return {chapter:'第3章 / 灯台に明かりを',title:'光る石を2個集めて、灯台を灯そう',detail:`光る石 ${s.crystals}/2。橋の先で集められます。`,hint:s.crystals>=2?'準備完了！「灯台を灯す」を押そう。':'キラキラ光る石をタップしよう。',action:s.crystals>=2?'beacon':null};
 return {chapter:'開拓記 完了',title:'島に明かりが戻った！',detail:'橋も庭も灯台も完成。ここからは好きな色の花で島を飾れます。',hint:'好きな花の色を選び、下の島の地面をタップして植えよう。',action:'decorate'};
}
export function available(s,node){
 if(!node)return false;
 if(node.kind==='wood')return !s.used.includes(node.id) && !s.bridge;
 if(node.kind==='flower')return s.bridge&&!s.garden&&!s.used.includes(node.id);
 if(node.kind==='crystal')return !!s.garden&&!s.beacon&&!s.used.includes(node.id);
 return false;
}
export function interact(s,id){
 const n=NODES.find(item=>item.id===id);
 if(!n||!available(s,n))return {state:s,changed:false,reason:'今は集められません。画面上の「次にすること」を確認してください。'};
 const next=structuredClone(s);next.used.push(id);next.hero={x:n.x,y:n.y+35};
 if(n.kind==='wood'){next.wood++;next.last='木材を1個手に入れた！　橋の修理に使える。';}
 if(n.kind==='flower'){next.flowers++;next.last='花を1輪手に入れた！　庭を作るのに使おう。';}
 if(n.kind==='crystal'){next.crystals++;next.last='光る石を1個手に入れた！　灯台を灯す材料だ。';}
 next.events.push({type:'collect',id,resource:n.kind});return {state:next,changed:true,reason:next.last};
}
export function craft(s,type,palette){
 const next=structuredClone(s);
 if(type==='bridge'&&!s.bridge&&s.wood>=3){next.bridge=true;next.wood-=3;next.phase=1;next.last='橋ができた！　向こう岸に行けるようになった。';}
 else if(type==='garden'&&s.bridge&&!s.garden&&s.flowers>=2&&['sky','sunset'].includes(palette)){next.garden=palette;next.flowers-=2;next.phase=2;next.last=palette==='sky'?'青い花の庭ができた！':'夕焼け色の花の庭ができた！';}
 else if(type==='beacon'&&s.garden&&!s.beacon&&s.crystals>=2){next.beacon=true;next.crystals-=2;next.phase=3;next.last='灯台が輝いた！　島の開拓は大成功。';}
 else return {state:s,changed:false,reason:'材料が足りないか、まだ作れる段階ではありません。'};
 next.events.push({type:'craft',id:type});return {state:next,changed:true,reason:next.last};
}
export function validSave(x){
 if(!x || x.version!==GAME_VERSION || !Number.isInteger(x.phase) || x.phase<0 || x.phase>3)return false;
 if(typeof x.bridge!=='boolean'||typeof x.beacon!=='boolean'||![null,'sky','sunset'].includes(x.garden))return false;
 if(!Array.isArray(x.used)||new Set(x.used).size!==x.used.length||x.used.some(id=>!NODES.some(n=>n.id===id)))return false;
 if(!['wood','flowers','crystals'].every(k=>Number.isInteger(x[k])&&x[k]>=0&&x[k]<=3))return false;
 if(!x.hero||![x.hero.x,x.hero.y].every(Number.isFinite)||!Array.isArray(x.events))return false;
 if(!Array.isArray(x.decorations)||x.decorations.length>30||x.decorations.some(d=>!d||![d.x,d.y].every(Number.isFinite)||!['sky','sunset'].includes(d.color)))return false;
 if(x.beacon&&!x.garden||x.garden&&!x.bridge||x.phase!==(x.beacon?3:x.garden?2:x.bridge?1:0))return false;
 return true;
}
export function progress(s){return (Number(s.bridge)+Number(!!s.garden)+Number(s.beacon))/3;}

export function decorate(s,x,y,color){
 if(!s.beacon||!['sky','sunset'].includes(color)||!Number.isFinite(x)||!Number.isFinite(y))return {state:s,changed:false,reason:'島の完成後に花の色を選んでください。'};
 // Keep flowers on the lower island, away from the lighthouse, dock and water.
 const onIsland=((x-209)**2+(y-450)**2)<=138**2&&y>=388;
 const farFromTower=Math.hypot(x-347,y-412)>42;
 if(!onIsland||!farFromTower)return {state:s,changed:false,reason:'下の島の草地をタップすると花を植えられます。'};
 const next=structuredClone(s);next.decorations??=[];
 if(next.decorations.length>=30)return {state:s,changed:false,reason:'花は30輪まで。今の庭を眺めたり、もう一度初めから遊べます。'};
 next.decorations.push({x:Math.round(x),y:Math.round(y),color});next.last='好きな場所に花を植えた！';
 next.events.push({type:'decorate',color});return {state:next,changed:true,reason:next.last};
}
