// A: ecological manipulation. All transitions are deterministic and UI-agnostic.
const scenarios = [
  {name:'01 光の道しるべ',goal:'光虫を花へ導こう。灯りを置くと虫が近づきます。',player:[0,4],moth:[2,4],boar:null,flower:[4,1],exit:null,spore:null,rocks:[[1,2]],lights:2,limit:15},
  {name:'02 谷の採集',goal:'花を採って帰還。無傷クリアも試そう。獣は光虫を追います。',player:[0,4],moth:[4,4],boar:[3,4],flower:[4,3],exit:[0,4],spore:null,rocks:[[1,3],[3,2]],lights:2,limit:24},
  {name:'03 胞子の道',goal:'獣に胞子茸を踏ませ、花を採取して帰還。',player:[0,4],moth:[0,0],boar:[2,0],flower:[4,4],exit:[0,4],spore:[2,2],rocks:[[1,3],[3,3]],lights:2,limit:28}
];
export const ecologyMeta={id:'ecology',name:'野の法則',tag:'生態・環境干渉'};
export const ecologyLevels=scenarios.length;
const key=([x,y])=>`${x},${y}`;
const equals=(a,b)=>!!a&&!!b&&a[0]===b[0]&&a[1]===b[1];
const distance=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
const within=p=>p[0]>=0&&p[0]<5&&p[1]>=0&&p[1]<5;
function toward(from,to,rocks){
 const options=[[1,0],[0,-1],[-1,0],[0,1]].map(([dx,dy])=>[from[0]+dx,from[1]+dy]);
 const valid=options.filter(p=>within(p)&&!rocks.some(r=>equals(r,p)));
 valid.sort((a,b)=>distance(a,to)-distance(b,to));
 return valid.length&&distance(valid[0],to)<distance(from,to)?valid[0]:from;
}
export function ecologyStart(level=0){
 const s=scenarios[level];if(!s)throw new Error('Unknown scenario');
 return {kind:'ecology',level,turn:0,player:[...s.player],moth:[...s.moth],boar:s.boar&&[...s.boar],flower:[...s.flower],exit:s.exit&&[...s.exit],spore:s.spore&&[...s.spore],rocks:s.rocks.map(r=>[...r]),lights:s.lights,lamps:[],hp:3,damageTaken:0,stun:0,sporeTriggered:false,collected:false,limit:s.limit,phase:'playing',message:'盤面をタップして操作しましょう。'};
}
export function ecologyInfo(s){const meta=scenarios[s.level];return {name:meta.name,goal:meta.goal,help:'移動：隣のマスをタップ／灯り：2マス以内に設置（消耗品）。行動ごとに生物が1回動きます。●=主人公、✦=光虫、◆=獣、✿=花。'};}
export function ecologyAct(old,act){
 if(old.phase!=='playing')return old;
 const s=structuredClone(old), at=act.pos;
 if(!Array.isArray(at)||!within(at))return {...old,message:'盤面の中を選んでください。'};
 const blocked=s.rocks.some(r=>equals(r,at));
 if(act.type==='move'){
   if(blocked||distance(s.player,at)!==1)return {...old,message:'隣の通れるマスへ移動してください。'};
   s.player=at;
 }else if(act.type==='light'){
   if(s.lights<=0)return {...old,message:'灯りが残っていません。'};
   if(blocked||distance(s.player,at)>2||equals(s.player,at))return {...old,message:'周囲2マス以内の空いたマスに設置してください。'};
   s.lamps=[at];s.lights--;
 }else if(act.type==='wait'){
   // wait is intentional, e.g. to advance an attraction
 }else{return {...old,message:'行動が選択されていません。'};}
 s.turn++;
 if(!s.collected&&equals(s.player,s.flower))s.collected=true;
 if(s.lamps.length)s.moth=toward(s.moth,s.lamps[s.lamps.length-1],s.rocks);
 if(s.boar){
   const before=[...s.boar];
   if(s.stun>0)s.stun--;
   else s.boar=toward(s.boar,s.moth,s.rocks);
   if(s.spore&&!equals(before,s.boar)&&equals(s.boar,s.spore)){s.stun=2;s.sporeTriggered=true;}
   if(equals(s.boar,s.player)){s.hp--;s.damageTaken++;}
 }
 if(!s.exit&&equals(s.moth,s.flower))s.phase='won';
 if(s.exit&&s.collected&&equals(s.player,s.exit)&&(!s.spore||s.sporeTriggered))s.phase='won';
 if(s.hp<=0||s.turn>=s.limit&&s.phase!=='won')s.phase='lost';
 s.message=s.phase==='won'?(s.damageTaken===0?'無傷達成！生態の理解を使って危険を制御しました。':'任務達成！次は無傷の攻略にも挑戦できます。'):s.phase==='lost'?'失敗。危険を避ける別の手を試しましょう。':s.spore&&!s.sporeTriggered?'胞子茸へ獣を誘導する方法を考えましょう。':s.collected?'採集成功。出発地点へ戻りましょう。':`行動 ${s.turn}/${s.limit} · 体力 ${s.hp} · 灯り ${s.lights}`;
 return s;
}
