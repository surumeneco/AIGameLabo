// Dual Keep: deterministic, pure combat rules. No rendering or DOM dependency.
export const SIZE={width:360,height:360};
export const LANES={left:112,right:248};
export const PADS=[{x:50,y:112},{x:180,y:112},{x:310,y:112},{x:50,y:245},{x:180,y:245},{x:310,y:245}];
export const TOWERS={bolt:{name:'弓塔',cost:4,damage:3,range:111,interval:.92,detail:'単体に3ダメージ。進路を絞った迎撃向け'},frost:{name:'霜塔',cost:5,damage:1,range:120,interval:1.45,detail:'1ダメージ＋2秒間減速。密集を遅らせる'}};
export const ENEMIES={scout:{name:'歩兵',hp:5,speed:45},brute:{name:'重装',hp:11,speed:32},runner:{name:'俊足',hp:4,speed:76}};
export const WAVES=[
 [{lane:'left',kind:'scout'},{lane:'right',kind:'scout'},{lane:'left',kind:'scout'},{lane:'right',kind:'scout'}],
 [{lane:'right',kind:'brute'},{lane:'left',kind:'scout'},{lane:'right',kind:'scout'},{lane:'left',kind:'brute'},{lane:'left',kind:'scout'},{lane:'right',kind:'scout'}],
 [{lane:'left',kind:'runner'},{lane:'right',kind:'runner'},{lane:'left',kind:'brute'},{lane:'right',kind:'brute'},{lane:'left',kind:'scout'},{lane:'right',kind:'runner'},{lane:'left',kind:'runner'},{lane:'right',kind:'scout'}]
];
export const REWARDS={power:{name:'鋭い矢',detail:'弓塔のダメージ +1'},ice:{name:'凍てつく霜',detail:'霜塔の減速が強くなる'},funds:{name:'補給箱',detail:'資金 +5'}};
const intervals=[1.95,1.7,1.4];
const rand=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
export function newGame(seed=42){return {seed:(seed>>>0)||42,phase:'planning',wave:0,gold:10,core:8,towers:[],enemies:[],spawned:0,clock:0,elapsed:0,kills:0,leaks:0,upgrades:[],choices:[],nextId:1,events:[],lastResult:'次の襲撃を確認し、塔を配置しよう。'};}
export function preview(s){return WAVES[s.wave].map((x,i)=>({...x,order:i+1,hp:ENEMIES[x.kind].hp}));}
export function build(s,slot,kind){if(s.phase!=='planning')return {ok:false,reason:'準備中だけ建設できます。'};if(!Number.isInteger(slot)||!PADS[slot]||!TOWERS[kind])return {ok:false,reason:'建設場所・塔を選び直してください。'};if(s.towers.some(t=>t.slot===slot))return {ok:false,reason:'この場所には既に塔があります。撤去すると費用が戻ります。'};if(s.gold<TOWERS[kind].cost)return {ok:false,reason:`資金不足：${TOWERS[kind].name}は${TOWERS[kind].cost}必要です。`};s.gold-=TOWERS[kind].cost;s.towers.push({slot,kind,cd:0});return {ok:true,reason:`${TOWERS[kind].name}を建設した。`};}
export function remove(s,slot){if(s.phase!=='planning')return {ok:false,reason:'準備中だけ変更できます。'};const index=s.towers.findIndex(t=>t.slot===slot);if(index<0)return {ok:false,reason:'この場所は空いています。'};const [t]=s.towers.splice(index,1);s.gold+=TOWERS[t.kind].cost;return {ok:true,reason:`${TOWERS[t.kind].name}を撤去し、全額返金した。`};}
export function begin(s){if(s.phase!=='planning')return false;if(!s.towers.length)return false;s.phase='battle';s.clock=intervals[s.wave];s.elapsed=0;s.spawned=0;s.enemies=[];s.events=[];s.lastResult='敵が進軍を始めた。';return true;}
export function choose(s,id){if(s.phase!=='reward'||!s.choices.includes(id))return false;s.upgrades.push(id);if(id==='funds')s.gold+=5;s.wave++;s.phase='planning';s.choices=[];s.events=[];s.lastResult=`${REWARDS[id].name}を獲得。次の襲撃を予測して配置しよう。`;return true;}
function rewardChoices(s){const ids=Object.keys(REWARDS).filter(k=>!s.upgrades.includes(k));for(let i=ids.length-1;i>0;i--){const j=Math.floor(rand(s)*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids.slice(0,2);}
export function tick(s,dt){if(s.phase!=='battle'||!Number.isFinite(dt)||dt<=0)return;const d=Math.min(.1,dt);s.elapsed+=d;s.events=[];s.clock+=d;const wave=WAVES[s.wave];if(s.spawned<wave.length&&s.clock>=intervals[s.wave]){s.clock-=intervals[s.wave];const entry=wave[s.spawned];const stats=ENEMIES[entry.kind];s.enemies.push({id:s.nextId++,lane:entry.lane,kind:entry.kind,x:LANES[entry.lane],y:14,hp:stats.hp,slow:0});s.spawned++;}
// Towers fire first, then survivors advance: readable outcomes, no frame-order surprises.
for(const tower of s.towers){tower.cd=Math.max(0,tower.cd-d);if(tower.cd>0)continue;const pos=PADS[tower.slot],spec=TOWERS[tower.kind];const inRange=s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-pos.x,e.y-pos.y)<=spec.range).sort((a,b)=>b.y-a.y);if(!inRange.length)continue;const enemy=inRange[0];enemy.hp-=spec.damage+(tower.kind==='bolt'&&s.upgrades.includes('power')?1:0);if(tower.kind==='frost')enemy.slow=Math.max(enemy.slow,2.2);tower.cd=spec.interval;s.events.push({type:'shot',x:pos.x,y:pos.y,target:enemy.id});}
let slain=0;s.enemies=s.enemies.filter(e=>{if(e.hp>0)return true;slain++;return false;});s.kills+=slain;
for(const e of s.enemies){const speed=ENEMIES[e.kind].speed*(e.slow>0?(s.upgrades.includes('ice')?.38:.57):1);e.y+=speed*d;e.slow=Math.max(0,e.slow-d);}
const leaked=s.enemies.filter(e=>e.y>=330);s.enemies=s.enemies.filter(e=>e.y<330);if(leaked.length){s.leaks+=leaked.length;s.core=Math.max(0,s.core-leaked.length);s.events.push({type:'leak',count:leaked.length});}
if(s.core===0){s.phase='lost';s.lastResult='砦が陥落した。次は塔の位置と種類を変えよう。';return;}
if(s.spawned===wave.length&&s.enemies.length===0){if(s.wave===WAVES.length-1){s.phase='won';s.lastResult='3回の襲撃を退けた。別の配置でも挑戦できる。';}else{s.gold+=5;s.choices=rewardChoices(s);s.phase='reward';s.lastResult='防衛成功。次の一手を選ぼう。';}}
}
export function runAutoplay(strategy,seed=42){const s=newGame(seed);let loops=0;while(!['won','lost'].includes(s.phase)&&loops<9000){if(s.phase==='planning'){strategy(s);if(!begin(s))break;}else if(s.phase==='reward'){choose(s,s.choices[0]);}else tick(s,.05);loops++;}return s;}
