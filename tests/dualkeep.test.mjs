import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,build,remove,begin,choose,tick,runAutoplay,TOWERS,WAVES,preview,advanceBattle,isValidSave} from '../src/games/dualkeep.js';
test('new game offers a preview of both lanes and a budget',()=>{const s=newGame();assert.equal(s.phase,'planning');assert.equal(s.gold,10);assert.deepEqual(new Set(preview(s).map(x=>x.lane)),new Set(['left','right']));});
test('building requires a free slot and sufficient budget',()=>{const s=newGame();assert.equal(build(s,0,'bolt').ok,true);assert.equal(s.gold,6);assert.equal(build(s,0,'frost').ok,false);assert.equal(build(s,1,'frost').ok,true);assert.equal(s.gold,1);assert.equal(build(s,2,'bolt').ok,false);});
test('planning permits full-refund repositioning without loss',()=>{const s=newGame();build(s,0,'bolt');assert.equal(remove(s,0).ok,true);assert.equal(s.gold,10);assert.equal(s.towers.length,0);assert.equal(begin(s),false);});
test('battle cannot be mutated with build/remove and cannot start empty',()=>{const s=newGame();assert.equal(begin(s),false);build(s,0,'bolt');assert.equal(begin(s),true);assert.equal(build(s,1,'bolt').ok,false);assert.equal(remove(s,0).ok,false);});
test('waves are deterministic and eventually terminate even with no damage output',()=>{const s=newGame();build(s,0,'bolt');begin(s);for(let i=0;i<5000&&s.phase==='battle';i++)tick(s,.05);assert.notEqual(s.phase,'battle');assert.equal(s.spawned,WAVES[0].length);});
test('a fully defensive midlane setup completes all three waves under multiple seeds',()=>{for(const seed of [1,7,42,99,911]){const r=runAutoplay(s=>{for(const slot of [1,4,0,3,2,5]){if(s.towers.some(t=>t.slot===slot))continue;if(s.gold>=TOWERS.bolt.cost)build(s,slot,'bolt');}},seed);assert.equal(r.phase,'won',`seed ${seed}: ${JSON.stringify({phase:r.phase,core:r.core,kills:r.kills,leaks:r.leaks,towers:r.towers})}`);}});
test('failure can be understood and a fresh run resets all resources',()=>{const a=newGame();const b=newGame();assert.deepEqual(a,b);build(a,0,'bolt');assert.notDeepEqual(a,newGame());assert.equal(newGame().core,8);});
test('reward selection is exclusive and transitions to next planned wave',()=>{const s=newGame();s.phase='reward';s.choices=['power','funds'];assert.equal(choose(s,'ice'),false);assert.equal(choose(s,'funds'),true);assert.equal(s.gold,15);assert.equal(s.wave,1);assert.equal(s.phase,'planning');assert.equal(choose(s,'power'),false);});
test('tick ignores invalid timing and does not advance while planning',()=>{const s=newGame();tick(s,10);tick(s,-1);assert.equal(s.elapsed,0);});
test('side-only investment cannot handle all waves, showing location consequence',()=>{const s=runAutoplay(x=>{if(!x.towers.length)build(x,0,'bolt');},9);assert.equal(s.phase,'lost');assert.ok(s.leaks>=8);});

test('frost towers slow their target and ice upgrades increase the slowdown',()=>{
  const plain=newGame(),upgraded=newGame();
  for(const s of [plain,upgraded]){build(s,1,'frost');begin(s);}
  upgraded.upgrades.push('ice');
  tick(plain,.05);tick(upgraded,.05);
  assert.equal(plain.enemies.length,1);
  assert.equal(plain.enemies[0].hp,4);
  assert.ok(plain.enemies[0].slow>0);
  assert.ok(upgraded.enemies[0].y<plain.enemies[0].y);
});

test('frame batching preserves combat progression at low FPS and at 2x speed',()=>{
  const fast=newGame(42),slow=newGame(42),double=newGame(42);
  for(const s of [fast,slow,double]){
    build(s,1,'bolt');build(s,4,'bolt');assert.equal(begin(s),true);
  }
  for(let i=0;i<40;i++)tick(fast,.05);
  for(let i=0;i<8;i++)advanceBattle(slow,.25);
  for(let i=0;i<4;i++)advanceBattle(double,.25,2);
  for(const s of [slow,double]){
    assert.ok(Math.abs(s.elapsed-fast.elapsed)<1e-9);
    assert.equal(s.spawned,fast.spawned);
    assert.equal(s.kills,fast.kills);
    assert.equal(s.core,fast.core);
    assert.equal(s.enemies.length,fast.enemies.length);
  }
});
test('frame batching ignores invalid elapsed time and caps one overloaded frame',()=>{
  const s=newGame();build(s,1,'bolt');begin(s);
  advanceBattle(s,NaN);advanceBattle(s,-1);advanceBattle(s,.25,0);
  assert.equal(s.elapsed,0);
  advanceBattle(s,5);
  assert.ok(s.elapsed>.49&&s.elapsed<.51);
});

test('save validation accepts live battle and completed run snapshots',()=>{
  const s=newGame();assert.equal(isValidSave(s),true);
  build(s,1,'bolt');begin(s);tick(s,.05);
  assert.equal(isValidSave(JSON.parse(JSON.stringify(s))),true);
  const won=runAutoplay(x=>{for(const slot of [1,4,0,3,2,5])if(!x.towers.some(t=>t.slot===slot)&&x.gold>=TOWERS.bolt.cost)build(x,slot,'bolt');});
  assert.equal(won.phase,'won');assert.equal(isValidSave(won),true);
});
test('save validation rejects malformed counters, IDs and impossible terminal states',()=>{
  const s=newGame();build(s,1,'bolt');begin(s);tick(s,.05);
  for(const patch of [
    {nextId:undefined},{kills:undefined},{leaks:-1},{seed:-1},
    {towers:[{slot:1,kind:'bolt',cd:-1}]},
    {enemies:[{id:999,lane:'left',kind:'scout',x:112,y:14,hp:5,slow:0}]},
    {phase:'won',wave:0},{phase:'lost',core:8},
    {phase:'reward',choices:[]},{phase:'planning',choices:['power']}
  ]){
    const corrupted={...s,...patch};
    assert.equal(isValidSave(corrupted),false,JSON.stringify(patch));
  }
});
