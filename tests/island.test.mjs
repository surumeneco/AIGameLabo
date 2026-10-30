import test from 'node:test';
import assert from 'node:assert/strict';
import {newIsland,interact,craft,objective,available,NODES,validSave,progress,decorate} from '../src/games/island.js';

test('first screen says exactly what to tap',()=>{let s=newIsland(),o=objective(s);assert.match(o.title,/木材を3個/);assert.match(o.hint,/光る木をタップ/);assert.equal(o.action,null);assert.equal(available(s,NODES[0]),true);});
test('only visible resources advance, cannot tap twice',()=>{let s=newIsland();const a=interact(s,'oak-1');assert.equal(a.changed,true);assert.equal(a.state.wood,1);assert.equal(s.wood,0);const b=interact(a.state,'oak-1');assert.equal(b.changed,false);assert.equal(b.state.wood,1);});
test('each craft requires actual materials and unlocks next step',()=>{let s=newIsland();assert.equal(craft(s,'bridge').changed,false);for(const id of ['oak-1','oak-2','oak-3'])s=interact(s,id).state;assert.equal(objective(s).action,'bridge');s=craft(s,'bridge').state;assert.equal(s.bridge,true);assert.equal(s.wood,0);assert.equal(available(s,NODES[3]),true);for(const id of ['flower-1','flower-2'])s=interact(s,id).state;assert.equal(objective(s).action,'garden');s=craft(s,'garden','sky').state;assert.equal(s.garden,'sky');assert.equal(available(s,NODES[5]),true);for(const id of ['crystal-1','crystal-2'])s=interact(s,id).state;assert.equal(objective(s).action,'beacon');s=craft(s,'beacon').state;assert.equal(s.beacon,true);assert.equal(progress(s),1);assert.match(objective(s).title,/明かりが戻った/);});
test('garden is a real aesthetic choice',()=>{let s=newIsland();for(const id of ['oak-1','oak-2','oak-3'])s=interact(s,id).state;s=craft(s,'bridge').state;for(const id of ['flower-1','flower-2'])s=interact(s,id).state;assert.equal(craft(s,'garden','invalid').changed,false);const sky=craft(s,'garden','sky').state;const sunset=craft(s,'garden','sunset').state;assert.equal(sky.garden,'sky');assert.equal(sunset.garden,'sunset');});
test('invalid or unavailable taps never silently mutate',()=>{let s=newIsland();for(const id of ['flower-1','crystal-1','unknown']){const r=interact(s,id);assert.equal(r.changed,false);assert.equal(r.state,s);assert.ok(r.reason);}const r=craft(s,'beacon');assert.equal(r.changed,false);assert.ok(r.reason);});
test('saved state version checking',()=>{assert.equal(validSave(newIsland()),true);assert.equal(validSave({...newIsland(),version:1}),false);assert.equal(validSave(null),false);});
test('all seven resources have labels and unique coordinates',()=>{assert.equal(NODES.length,7);assert.equal(new Set(NODES.map(n=>n.id)).size,7);for(const n of NODES){assert.ok(n.label);assert.ok(n.x>=0&&n.x<=420);assert.ok(n.y>=0&&n.y<=580);}});

test('free garden: completed player can plant chosen flowers within valid island area',()=>{let s=newIsland();for(const id of ['oak-1','oak-2','oak-3'])s=interact(s,id).state;s=craft(s,'bridge').state;for(const id of ['flower-1','flower-2'])s=interact(s,id).state;s=craft(s,'garden','sky').state;for(const id of ['crystal-1','crystal-2'])s=interact(s,id).state;s=craft(s,'beacon').state;const a=decorate(s,180,460,'sunset');assert.equal(a.changed,true);assert.equal(a.state.decorations.length,1);assert.equal(a.state.decorations[0].color,'sunset');assert.equal(decorate(s,180,100,'sky').changed,false);assert.equal(decorate(newIsland(),180,460,'sky').changed,false);});


test('saved game validation rejects malformed and inconsistent state',()=>{
 const base=newIsland();
 assert.equal(validSave(base),true);
 assert.equal(validSave({...base,used:['oak-1','oak-1']}),false);
 assert.equal(validSave({...base,wood:NaN}),false);
 assert.equal(validSave({...base,phase:3,beacon:false}),false);
 assert.equal(validSave({...base,decorations:[{x:Infinity,y:450,color:'sky'}]}),false);
});
