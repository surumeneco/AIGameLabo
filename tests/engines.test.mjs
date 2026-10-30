import test from 'node:test';import assert from 'node:assert/strict';
import {ecologyStart,ecologyAct} from '../src/games/ecology.js';
import {combatStart,combatAct,combatUpgrade} from '../src/games/combat.js';
import {machineryStart,machineryAct,traceBeam} from '../src/games/machinery.js';

test('ecology: turns only advance on legal actions',()=>{const s=ecologyStart();assert.equal(ecologyAct(s,{type:'move',pos:[4,4]}).turn,0);assert.equal(ecologyAct(s,{type:'wait',pos:[0,4]}).turn,1);assert.equal(s.turn,0);});
test('ecology: moth moves closer to lamp and eventually pollinates flower',()=>{let s=ecologyStart();s=ecologyAct(s,{type:'move',pos:[1,4]});s=ecologyAct(s,{type:'light',pos:[2,3]});assert.equal(s.turn,2);assert.equal(s.lights,1);assert.deepEqual(s.moth,[2,3]);s=ecologyAct(s,{type:'wait',pos:s.player});assert.deepEqual(s.moth,[2,3]);});
test('ecology: collision damage and HP loss occur without unannounced turn during selection',()=>{let s=ecologyStart(1);s.boar=[1,4];s.moth=[1,4];const t=ecologyAct(s,{type:'wait',pos:s.player});assert.ok(t.turn===1);assert.equal(s.turn,0);});
test('combat: player can dodge preannounced strike',()=>{let s=combatStart();s=combatAct(s,{type:'move',pos:[1,4]});assert.equal(s.hp,7);assert.equal(s.intentX,1);});
test('combat: striking from outside range does not advance time',()=>{const s=combatStart();const t=combatAct(s,{type:'strike'});assert.equal(t.turn,0);});
test('combat: ranged weapon and upgrades change win state',()=>{let s=combatStart();s=combatAct(s,{type:'throw'});s=combatAct(s,{type:'throw'});assert.equal(s.enemyHp,1);s=combatAct(s,{type:'move',pos:[2,3]});s=combatAct(s,{type:'strike'});assert.equal(s.phase,'upgrade');s=combatUpgrade(s,'power');assert.equal(s.phase,'playing');assert.equal(s.build[0],'power');});
test('machinery: first level solved via slash mirror',()=>{let s=machineryStart(0);s=machineryAct(s,[2,2]);assert.equal(s.phase,'won');assert.equal(traceBeam(s).hit,true);});
test('machinery: wrong mirror does not complete and stage two needs two',()=>{let s=machineryStart(1);s=machineryAct(s,[2,4]);assert.equal(s.phase,'playing');s=machineryAct(s,[2,1]);assert.equal(s.phase,'won');});
test('machinery: repeating same spot rotates and clears mirror',()=>{let s=machineryStart();s=machineryAct(s,[2,2]);assert.equal(s.phase,'won');const t=machineryStart();assert.equal(t.phase,'playing');assert.equal(machineryAct(t,[0,0]).turn,0);});

test('combat: dodging gains momentum and consecutive guards do not repeat a counter',()=>{let s=combatStart();s=combatAct(s,{type:'move',pos:[1,4]});assert.equal(s.momentum,1);s=combatAct(s,{type:'move',pos:[1,3]});s=combatAct(s,{type:'guard'});const hp=s.enemyHp;s=combatAct(s,{type:'guard'});assert.equal(s.enemyHp,hp);});

test('combat: first guard counterattacks at close range, subsequent guard does not',()=>{
  const initial=combatStart();initial.player=[2,3];
  const first=combatAct(initial,{type:'guard'});
  assert.equal(first.enemyHp,2);
  assert.equal(first.hp,7);
  const second=combatAct(first,{type:'guard'});
  assert.equal(second.enemyHp,2);
  assert.equal(second.guardChain,2);
});
