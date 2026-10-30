// B: tactical combat + three build selections, without numeric grind.
export const combatMeta={id:'combat',name:'遺物の迷宮',tag:'戦闘・装備構築'};
const enemies=[{name:'見張りの剣士',hp:3},{name:'鉄鎧の守衛',hp:4},{name:'迷宮の番人',hp:5}];
export function combatStart(){return {kind:'combat',wave:0,turn:0,player:[2,4],hp:7,maxHp:7,enemy:[2,1],enemyHp:3,intentX:2,build:[],phase:'playing',charges:2,momentum:0,guardChain:0,message:'赤い縦列が敵の次の攻撃範囲。移動や盾で対処しましょう。'};}
export function combatInfo(s){return {name:`${s.wave+1} / 3 ${enemies[s.wave]?.name||'制覇'}`,goal:s.phase==='upgrade'?'次の敵に備え、遺物を一つ選択。':s.phase==='won'?'3体の守護者を突破しました。':'予告された列へ攻撃が来ます。敵を倒して遺物を選ぼう。',help:'タップ移動：隣のマスへ。攻撃列を避けると勢いが増え、次の斬撃を強化。防御反撃は連続使用で弱まる。投擲は遠距離攻撃。'};}
const man=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
export function combatAct(old,act){
 if(old.phase!=='playing')return old;
 const s=structuredClone(old);
 let guarding=false,damage=0;
 if(act.type==='move'){
   const at=act.pos;
   if(!Array.isArray(at)||at[0]<0||at[0]>4||at[1]<0||at[1]>4||man(s.player,at)!==1||man(s.enemy,at)===0)return {...old,message:'隣の空いたマスをタップしてください。'};
   s.player=at;
   if(s.player[0]!==old.intentX)s.momentum=Math.min(2,s.momentum+1);
 }else if(act.type==='strike'){
   if(man(s.player,s.enemy)>(s.build.includes('reach')?3:2))return {...old,message:'射程外。敵へ近づいてください。'};
   damage=1+(s.build.includes('power')?1:0)+s.momentum;s.momentum=0;
 }else if(act.type==='guard')guarding=true;
 else if(act.type==='throw'){
   if(s.charges<=0)return {...old,message:'投擲道具が残っていません。'};
   s.charges--;damage=1;
 }else return old;
 s.turn++;s.guardChain=guarding?s.guardChain+1:0;s.enemyHp-=damage;
 if(s.enemyHp<=0){
   s.phase=s.wave===2?'won':'upgrade';
   s.message=s.phase==='won'?'迷宮を突破！どの遺物が役立ちましたか？':'勝利。次の戦闘に持ち込む遺物を選びましょう。';
   return s;
 }
 if(s.player[0]===s.intentX){
   if(guarding){if(old.guardChain===0&&man(s.player,s.enemy)<=2)s.enemyHp-=s.build.includes('counter')?2:1;}
   else s.hp-=s.build.includes('armor')?1:2;
 }
 if(s.enemyHp<=0){s.phase=s.wave===2?'won':'upgrade';s.message='盾の反撃で勝利！';return s;}
 s.intentX=s.player[0];
 if(s.hp<=0)s.phase='lost';
 s.message=s.phase==='lost'?'敗北。予告列の外へ移動するか防御しましょう。':`体力 ${s.hp}/${s.maxHp} · 敵HP ${s.enemyHp} · 投擲残 ${s.charges}`;
 return s;
}
export const relics=[{id:'reach',label:'長槍',desc:'斬撃射程 +1'}, {id:'counter',label:'反撃盾',desc:'防御反撃 2ダメージ'}, {id:'power',label:'鋭刃',desc:'斬撃 +1ダメージ'}, {id:'armor',label:'重装',desc:'被ダメージを1へ'}];
export function combatUpgrade(old,id){
 if(old.phase!=='upgrade'||!relics.some(r=>r.id===id)||old.build.includes(id))return old;
 const s=structuredClone(old);s.build.push(id);s.wave++;s.enemyHp=enemies[s.wave].hp;s.enemy=[2,1];s.player=[2,4];s.intentX=s.player[0];s.charges+=1;s.momentum=0;s.guardChain=0;s.hp=Math.min(s.maxHp,s.hp+2);s.phase='playing';s.message=`遺物「${relics.find(r=>r.id===id).label}」を装備。次の敵です。`;return s;
}
