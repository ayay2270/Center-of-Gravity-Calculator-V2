import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,DEFAULTS,TARGET,radians,toWorld,toLocal} from '../src/engineering.ts';
const near=(actual:number,expected:number,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} ≠ ${expected}`);

test('1. theoretical reference: correct floor CG and baseline results',()=>{
  const r=calculate(DEFAULTS);
  near(r.z,1377); near(r.x,0); near(r.halfWidth,546);
  near(r.criticalAngle,21.63,0.01); near(r.margin,-0.37,0.01);
  assert.equal(r.criticalAngle.toFixed(1),'21.6'); assert.equal(r.margin.toFixed(1),'-0.4');
  assert.equal(r.recommendedWidth,1120); assert.equal(r.meetsRequirement,false);
  assert.equal(r.stability,'stable');
});
test('2. positive manual Xcg reduces critical angle; no double pallet height',()=>{
  const r=calculate({...DEFAULTS,mode:'manual',cgHeight:1377,cgOffset:100});
  near(r.z,1377); near(r.distance,446); near(r.criticalAngle,Math.atan(446/1377)*180/Math.PI);
  assert.ok(r.criticalAngle<calculate(DEFAULTS).criticalAngle);
});
test('3. negative manual Xcg increases critical angle',()=>{
  const r=calculate({...DEFAULTS,mode:'manual',cgHeight:1377,cgOffset:-100});
  near(r.distance,646); near(r.criticalAngle,Math.atan(646/1377)*180/Math.PI);
  assert.ok(r.criticalAngle>calculate(DEFAULTS).criticalAngle);
});
test('4. current angle below critical is stable despite unmet 22° design',()=>{
  const r=calculate({...DEFAULTS,tilt:16}); assert.equal(r.stability,'stable');
  assert.equal(r.meetsRequirement,false); assert.ok(r.gravityOffset<0);
});
test('5. current angle equal to critical puts world gravity through pivot',()=>{
  const r=calculate({...DEFAULTS,tilt:calculate(DEFAULTS).criticalAngle});
  assert.equal(r.stability,'critical'); near(r.gravityOffset,0);
});
test('6. current angle above critical exceeds static limit',()=>{
  const r=calculate({...DEFAULTS,tilt:22}); assert.equal(r.stability,'exceeded'); assert.ok(r.gravityOffset>0);
});
test('7. exact 22° design requirement passes numerical boundary',()=>{
  const width=2*1377*Math.tan(radians(TARGET));
  const r=calculate({...DEFAULTS,palletWidth:width,tilt:22});
  near(r.criticalAngle,22); near(r.margin,0); assert.equal(r.meetsRequirement,true); assert.equal(r.stability,'critical');
});
test('8. reverse width and engineering rounding include manual offset',()=>{
  const base=calculate(DEFAULTS); near(base.requiredHalfWidth,556.3,0.05);
  near(base.preciseRequiredWidth,1112.7,0.05); assert.equal(base.recommendedHalfWidth,560); assert.equal(base.recommendedWidth,1120);
  for(const offset of [-100,100]){
    const r=calculate({...DEFAULTS,mode:'manual',cgOffset:offset});
    near(r.preciseRequiredWidth,base.preciseRequiredWidth+2*offset);
    const exact=calculate({...DEFAULTS,mode:'manual',cgOffset:offset,palletWidth:r.preciseRequiredWidth}); near(exact.criticalAngle,22);
  }
});
test('9. fixed right pivot and reversible CG drag transform at each tilt',()=>{
  for(const tilt of [0,16,22,60]){
    const half=546, pivot=toWorld({x:half,z:0},half,tilt); near(pivot.x,half);near(pivot.z,0);
    const point={x:123,z:1377}; const local=toLocal(toWorld(point,half,tilt),half,tilt);near(local.x,point.x);near(local.z,point.z);
  }
});
test('10. invalid geometry is rejected rather than rendering NaN',()=>{
  assert.throws(()=>calculate({...DEFAULTS,palletWidth:0}),RangeError);
  assert.throws(()=>calculate({...DEFAULTS,mode:'manual',cgHeight:0}),RangeError);
});
