import {ecologyStart,ecologyAct} from '../src/games/ecology.js';
import {combatStart,combatAct,combatUpgrade,relics} from '../src/games/combat.js';
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const valid=([x,y])=>x>=0&&x<5&&y>=0&&y<5;
function ecologyActions(s){let actions=[{type:'wait',pos:s.player}];for(const [dx,dy] of dirs){let p=[s.player[0]+dx,s.player[1]+dy];if(valid(p))actions.push({type:'move',pos:p});}if(s.lights)for(let y=0;y<5;y++)for(let x=0;x<5;x++){const p=[x,y];if(Math.abs(x-s.player[0])+Math.abs(y-s.player[1])<=2)actions.push({type:'light',pos:p});}return actions;}
function key(s){const c={...s};delete c.turn;delete c.message;delete c.limit;return JSON.stringify(c);}
function findEcology(level, cap=250000){const start=ecologyStart(level);let q=[{s:start,path:[]}],visited=new Set([key(start)]);for(let i=0;i<q.length&&i<cap;i++){
 const {s,path}=q[i];if(s.phase==='won')return {found:true,nodes:i,steps:path.length,path,explored:q.length};if(s.phase==='lost')continue;
 for(const a of ecologyActions(s)){const n=ecologyAct(s,a);if(n.turn===s.turn)continue;const k=key(n);if(visited.has(k))continue;visited.add(k);q.push({s:n,path:[...path,a]});}
}return {found:false,explored:q.length};}
for(let lvl=0;lvl<3;lvl++){const r=findEcology(lvl);console.log('ECO',lvl,{...r,path:JSON.stringify(r.path?.map(p=>[p.type,p.pos]))});if(!r.found)process.exitCode=1;}
function acts(s){if(s.phase==='upgrade')return relics.filter(r=>!s.build.includes(r.id)).map(r=>({type:'relic',id:r.id}));const v=[{type:'strike'},{type:'guard'},{type:'throw'}];for(const [dx,dy] of dirs){const p=[s.player[0]+dx,s.player[1]+dy];if(valid(p))v.push({type:'move',pos:p});}return v;}
function findCombat(cap=100000){const start=combatStart();let q=[{s:start,path:[]}],seen=new Set([key(start)]);for(let i=0;i<q.length&&i<cap;i++){
 const {s,path}=q[i];if(s.phase==='won')return {found:true,nodes:i,path,explored:q.length};if(s.phase==='lost')continue;
 for(const a of acts(s)){const n=a.type==='relic'?combatUpgrade(s,a.id):combatAct(s,a);if(n===s||n.turn===s.turn&&a.type!=='relic')continue;const k=key(n);if(seen.has(k))continue;seen.add(k);q.push({s:n,path:[...path,a]});}
}return {found:false,explored:q.length};}
const c=findCombat();console.log('COMBAT', {...c,path:JSON.stringify(c.path)});if(!c.found)process.exitCode=1;
