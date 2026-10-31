import test from 'node:test';
import assert from 'node:assert/strict';
import {runAutoplay,build,TOWERS} from '../src/games/dualkeep.js';

test('mixed frost and bolt strategy wins all three waves without leaks',()=>{
  for(const seed of [1,7,42,99,911]){
    const s=runAutoplay(state=>{
      for(const [slot,kind] of [[1,'frost'],[4,'bolt'],[0,'bolt'],[3,'bolt'],[2,'bolt']]){
        if(!state.towers.some(t=>t.slot===slot)&&state.gold>=TOWERS[kind].cost)build(state,slot,kind);
      }
    },seed);
    assert.equal(s.phase,'won',`seed ${seed}`);
    assert.equal(s.leaks,0,`seed ${seed}`);
  }
});
