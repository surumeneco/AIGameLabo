// C: rotate/place slash and backslash mirrors to redirect deterministic rays.
export const machineryMeta={id:'machinery',name:'機構工房',tag:'組立・試行錯誤'};
const levels=[
  {name:'01 光を曲げる',source:[0,2],target:[2,0],slots:[[2,2]],parts:1,walls:[]},
  {name:'02 二度曲がる光',source:[0,4],target:[4,1],slots:[[2,4],[2,1]],parts:2,walls:[[3,3]]},
  {name:'03 光の回廊',source:[0,4],target:[4,0],slots:[[1,4],[1,1],[4,1]],parts:3,walls:[[3,3],[3,4]]}
];
export const machineryLevels=levels.length;
const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
const key=([x,y])=>`${x},${y}`;
export function machineryStart(level=0){const l=levels[level];if(!l)throw Error('Unknown level');return {kind:'machinery',level,source:l.source,target:l.target,slots:l.slots,walls:l.walls,parts:l.parts,mirrors:{},beam:[],turn:0,phase:'playing',message:'光源から受光器まで光を導こう。灰色の台座をタップして鏡を置けます。'};}
export function machineryInfo(s){return {name:levels[s.level].name,goal:'光源から受光器へ光を到達させよう。鏡の角度はタップで変更。',help:'台座をタップ：空 → ／ → ＼ → 空。使える鏡の数は限られています。光線は瞬時に再計算されます。'};}
export function traceBeam(s){
 let x=s.source[0],y=s.source[1],dx=1,dy=0;
 const path=[],visited=new Set();
 for(let step=0;step<80;step++){
   x+=dx;y+=dy;
   if(x<0||y<0||x>=5||y>=5)break;
   if(s.walls.some(w=>same(w,[x,y])))break;
   const state=`${x},${y},${dx},${dy}`;
   if(visited.has(state))break;
   visited.add(state);path.push([x,y]);
   if(same([x,y],s.target))return {path,hit:true};
   const mirror=s.mirrors[key([x,y])];
   if(mirror==='/') [dx,dy]=[-dy,-dx];
   else if(mirror==='\\') [dx,dy]=[dy,dx];
 }
 return {path,hit:false};
}
export function machineryAct(old,pos){
 if(old.phase!=='playing')return old;
 if(!old.slots.some(p=>same(p,pos)))return {...old,message:'灰色の台座をタップしてください。'};
 const s=structuredClone(old),k=key(pos),cur=s.mirrors[k];
 const used=Object.values(s.mirrors).length;
 if(!cur&&used>=s.parts)return {...old,message:'すべての鏡を設置済み。他の鏡を外してください。'};
 if(!cur)s.mirrors[k]='/';else if(cur==='/')s.mirrors[k]='\\';else delete s.mirrors[k];
 s.turn++;
 const t=traceBeam(s);s.beam=t.path;s.phase=t.hit?'won':'playing';
 s.message=t.hit?`接続成功！ ${s.turn}回の操作で達成。`:`光を追跡中。鏡 ${Object.keys(s.mirrors).length}/${s.parts} · 操作 ${s.turn}回`;
 return s;
}
