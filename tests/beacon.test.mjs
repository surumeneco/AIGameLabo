import test from 'node:test';import assert from 'node:assert/strict';
import {newRun,start,aim,slash,guard,choose,tick,attackRadius,moveSpeed,PERKS} from '../src/games/beacon.js';
function step(s,t){for(let i=0;i<t*40;i++)tick(s,.025);}
test('start reveals a clear game objective and restarts from a clean run',()=>{const s=newRun(23);assert.equal(s.phase,'ready');assert.equal(s.beaconHp,12);assert.equal(start(s),true);assert.equal(start(s),false);assert.equal(s.phase,'fighting');assert.notEqual(newRun(23),s);});
test('tap movement is clamped to arena and traverses toward target',()=>{const s=newRun(1);start(s);assert.equal(aim(s,600,-300),true);assert.deepEqual([s.player.tx,s.player.ty],[403,20]);const y=s.player.y;step(s,.5);assert.ok(s.player.y<y);});
test('slash affects only nearby enemies, cooldown cannot be bypassed',()=>{const s=newRun(3);start(s);s.enemies=[{id:1,kind:'shade',x:210,y:350,hp:3,maxHp:3,speed:0,stun:0,hit:0,attackCd:0},{id:2,kind:'heavy',x:350,y:400,hp:5,maxHp:5,speed:0,stun:0,hit:0,attackCd:0}];assert.equal(slash(s),1);assert.equal(s.enemies[0].hp,1);assert.equal(slash(s),0);assert.equal(s.enemies[1].hp,5);step(s,.8);assert.equal(slash(s),1);assert.equal(s.kills,1);});
test('guard interrupts an incoming enemy and is cooldown limited',()=>{const s=newRun(4);start(s);s.enemies=[{id:1,kind:'shade',x:215,y:340,hp:3,maxHp:3,speed:0,stun:0,hit:0,attackCd:0}];const hp=s.player.hp;assert.equal(guard(s),true);assert.ok(s.enemies[0].stun>0);assert.equal(guard(s),false);step(s,.5);assert.equal(s.player.hp,hp);});
test('idle play loses the beacon; doing nothing is not a valid strategy',()=>{const s=newRun(8);start(s);for(let i=0;i<4500&&s.phase==='fighting';i++)tick(s,.05);assert.equal(s.phase,'lost');assert.ok(s.beaconHp<=0||s.player.hp<=0);});
test('upgrade choice is gated; options vary and change combat rules',()=>{const s=newRun(2);start(s);s.phase='choice';s.offers=['edge','reach','stride'];assert.equal(choose(s,'not-offered'),false);assert.equal(choose(s,'edge'),true);assert.deepEqual(s.perks,['edge']);assert.equal(s.wave,1);assert.equal(attackRadius(s),76);assert.equal(choose(s,'reach'),false);const another=newRun(2);start(another);another.phase='choice';another.offers=['stride'];choose(another,'stride');assert.equal(moveSpeed(another),235);});
test('repair and vitality perks have finite caps',()=>{const s=newRun(4);start(s);s.phase='choice';s.beaconHp=10;s.player.hp=14;s.offers=['repair'];choose(s,'repair');assert.equal(s.beaconHp,12);s.phase='choice';s.offers=['vitality'];choose(s,'vitality');assert.equal(s.player.hp,15);});
test('three-wave defense can be won by responding to ranged enemies',()=>{const s=newRun(7);start(s);
 for(let i=0;i<6000&&!['won','lost'].includes(s.phase);i++){
  if(s.phase==='choice'){const preference=['edge','reach','repair','rhythm','bulwark','pulse'];choose(s,preference.find(k=>s.offers.includes(k))||s.offers[0]);}
  if(s.phase==='fighting'){
   const caster=s.enemies.find(e=>e.kind==='shooter');aim(s,caster?.x??210,caster?.y??239);
   if(s.attackCd<=0)slash(s);
   if(s.guardCd<=0&&s.enemies.some(e=>Math.hypot(e.x-s.player.x,e.y-s.player.y)<65))guard(s);
   tick(s,.04);
  }
 }
 assert.equal(s.phase,'won',`Expected a reachable winning route: ${JSON.stringify({wave:s.wave,kills:s.kills,beacon:s.beaconHp,hp:s.player.hp})}`);assert.equal(s.wave,2);assert.equal(s.perks.length,2);
});
test('passive camping fails against ranged threats in a seeded run',()=>{const s=newRun(7);start(s);for(let i=0;i<6000&&!['won','lost'].includes(s.phase);i++){if(s.phase==='choice')choose(s,s.offers[0]);if(s.phase==='fighting'){aim(s,210,239);if(s.attackCd<=0)slash(s);tick(s,.04);}}assert.equal(s.phase,'lost');});
test('seeded generation is repeatable',()=>{const s1=newRun(100),s2=newRun(100);start(s1);start(s2);for(let i=0;i<80;i++){tick(s1,.04);tick(s2,.04);}assert.deepEqual(s1.enemies,s2.enemies);});
test('all perks are descriptively named',()=>{for(const [k,v] of Object.entries(PERKS)){assert.ok(k.length&&v.name&&v.detail);}});
