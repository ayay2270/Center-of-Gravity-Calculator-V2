import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,DEFAULTS,radians,toWorld,toLocal,formatDifference} from '../src/engineering.ts';
const near=(actual:number,expected:number,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} ≠ ${expected}`);

test('1. theoretical reference: correct floor CG and baseline results',()=>{
  const r=calculate(DEFAULTS);
  near(r.z,1377); near(r.x,0); near(r.halfWidth,546);
  near(r.criticalAngle,21.63,0.01); near(r.margin,0.37,0.01);
  assert.equal(r.criticalAngle.toFixed(1),'21.6'); assert.equal(r.margin.toFixed(1),'0.4');
  assert.equal(r.recommendedWidth,1120); assert.equal(r.meetsRequirement,true);
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
test('4. current state can be stable even when evaluated angle exceeds the 22° upper limit',()=>{
  const r=calculate({...DEFAULTS,mode:'manual',cgHeight:1377,cgOffset:-100,tilt:16}); assert.equal(r.stability,'stable');
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
  const width=2*1377*Math.tan(radians(DEFAULTS.specLimitAngle));
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
  for(const tilt of [0,5,16,19,21,22,25,60,75]){
    const half=546, pivot=toWorld({x:half,z:0},half,tilt); near(pivot.x,half);near(pivot.z,0);
    const point={x:123,z:1377}; const local=toLocal(toWorld(point,half,tilt),half,tilt);near(local.x,point.x);near(local.z,point.z);
  }
});
test('10. invalid geometry is rejected rather than rendering NaN',()=>{
  assert.throws(()=>calculate({...DEFAULTS,palletWidth:0}),RangeError);
  assert.throws(()=>calculate({...DEFAULTS,mode:'manual',cgHeight:0}),RangeError);
});
test('11. evaluated angles 21.6°, 22.0°, 22.4° use the requested upper-limit rule',()=>{
  for(const [angle,expected,difference] of [[21.6,true,'+0.4'],[22,true,'0.0'],[22.4,false,'-0.4']] as const){
    const r=calculate({...DEFAULTS,palletWidth:2*1377*Math.tan(radians(angle))});
    near(r.criticalAngle,angle); assert.equal(r.meetsRequirement,expected);
    assert.equal(formatDifference(r.margin),difference);
    assert.equal(r.stability,'stable');
  }
});
test('12. exact upper boundary tolerates only numerical error',()=>{
  for(const [angle,passes] of [[22-1e-6,true],[22,true],[22+5e-9,true],[22+1e-6,false]] as const){
    assert.equal(calculate({...DEFAULTS,palletWidth:2*1377*Math.tan(radians(angle))}).meetsRequirement,passes);
  }
});
test('13. physical tipping remains independent of the upper-limit design check at every requested tilt',()=>{
  for(const tilt of [0,5,16,19,21,22,25]){
    const r=calculate({...DEFAULTS,tilt});
    assert.equal(r.meetsRequirement,true);
    assert.equal(r.stability,tilt<r.criticalAngle?'stable':'exceeded');
    assert.equal(r.gravityOffset>0,tilt>r.criticalAngle);
  }
});
test('14. difference display has one decimal and no negative zero or floating-point leakage',()=>{
  assert.equal(formatDifference(-0.3700000000000045),'-0.4');
  assert.equal(formatDifference(0.4000000000000057),'+0.4');
  assert.equal(formatDifference(-0.049),'0.0');
  assert.equal(formatDifference(0.049),'0.0');
  assert.equal(formatDifference(0),'0.0');
});
test('15. 22° reverse calculation and rounded width do not implicitly assert an upper-limit pass',()=>{
  const base=calculate(DEFAULTS);
  assert.equal(calculate({...DEFAULTS,palletWidth:base.preciseRequiredWidth}).meetsRequirement,true);
  const rounded=calculate({...DEFAULTS,palletWidth:base.recommendedWidth});
  assert.ok(rounded.criticalAngle>22); assert.equal(rounded.meetsRequirement,false);
});

test('16. editable limits 20°, 22°, 25° update margin, status and reverse width only',()=>{
  const baseline=calculate(DEFAULTS);
  for(const limit of [20,22,25]){
    const r=calculate({...DEFAULTS,specLimitAngle:limit});
    near(r.margin,limit-baseline.criticalAngle);
    assert.equal(r.meetsRequirement,baseline.criticalAngle<=limit);
    assert.equal(r.specStatus,baseline.criticalAngle<limit?'pass':'fail');
    near(r.preciseRequiredWidth,2*1377*Math.tan(radians(limit)));
    assert.equal(r.recommendedWidth,2*Math.ceil((1377*Math.tan(radians(limit))-1e-9)/10)*10);
    near(r.criticalAngle,baseline.criticalAngle); near(r.gravityOffset,baseline.gravityOffset);
    assert.equal(r.stability,'stable');
  }
});
test('17. below, equal and above each editable limit retain the upper-limit rule',()=>{
  for(const limit of [20,22,25]){
    for(const [delta,status,passes,display] of [[-.4,'pass',true,'+0.4'],[0,'boundary',true,'0.0'],[.4,'fail',false,'-0.4']] as const){
      const r=calculate({...DEFAULTS,specLimitAngle:limit,palletWidth:2*1377*Math.tan(radians(limit+delta))});
      assert.equal(r.specStatus,status); assert.equal(r.meetsRequirement,passes);
      assert.equal(formatDifference(r.margin),display);
    }
  }
});
test('18. screenshot manual case separates design PASS from physical exceeded state',()=>{
  const r=calculate({...DEFAULTS,mode:'manual',cgHeight:1262,cgOffset:318,tilt:19.4});
  assert.equal(r.criticalAngle.toFixed(1),'10.2'); assert.equal(formatDifference(r.margin),'+11.8');
  assert.equal(r.specStatus,'pass'); assert.equal(r.stability,'exceeded');
  assert.equal(r.preciseRequiredWidth.toFixed(1),'1655.8'); assert.equal(r.recommendedWidth,1660);
});
test('19. manual offset reverse calculation follows every editable limit',()=>{
  for(const limit of [20,22,25])for(const offset of [-318,318]){
    const r=calculate({...DEFAULTS,mode:'manual',cgHeight:1262,cgOffset:offset,specLimitAngle:limit});
    near(r.requiredHalfWidth,1262*Math.tan(radians(limit))+offset);
    const exact=calculate({...DEFAULTS,mode:'manual',cgHeight:1262,cgOffset:offset,specLimitAngle:limit,palletWidth:r.preciseRequiredWidth});
    near(exact.criticalAngle,limit); assert.equal(exact.specStatus,'boundary');
  }
});
test('20. invalid specification limits are rejected; supported endpoints remain finite',()=>{
  for(const limit of [0,60.1,NaN,Infinity])assert.throws(()=>calculate({...DEFAULTS,specLimitAngle:limit}),RangeError);
  for(const limit of [1,60])assert.ok(Number.isFinite(calculate({...DEFAULTS,specLimitAngle:limit}).preciseRequiredWidth));
  assert.equal(DEFAULTS.specLimitAngle,22);
});
test('21. using the specification limit as current tilt changes physical state independently',()=>{
  for(const limit of [20,22,25]){
    const r=calculate({...DEFAULTS,specLimitAngle:limit,tilt:limit});
    assert.equal(r.stability,limit<r.criticalAngle?'stable':'exceeded');
    assert.equal(r.meetsRequirement,r.criticalAngle<=limit);
  }
});
