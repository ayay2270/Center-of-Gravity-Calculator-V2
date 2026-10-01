export type CGMode = 'theoretical' | 'manual';
export type Stability = 'stable' | 'critical' | 'exceeded';
export interface Parameters {
  palletHeight: number; palletWidth: number; cabinetHeight: number;
  tilt: number; specLimitAngle: number; mode: CGMode; cgHeight: number; cgOffset: number;
}
export const DEFAULTS: Parameters = {
  palletHeight:153, palletWidth:1092, cabinetHeight:2448, tilt:16,
  specLimitAngle:22, mode:'theoretical', cgHeight:1377, cgOffset:0,
};
export const radians = (degrees:number) => degrees * Math.PI / 180;
export function calculate(parameters:Parameters) {
  const {palletWidth, palletHeight, cabinetHeight, mode, tilt, specLimitAngle} = parameters;
  const z = mode === 'theoretical' ? cabinetHeight / 2 + palletHeight : parameters.cgHeight;
  const x = mode === 'theoretical' ? 0 : parameters.cgOffset;
  if (![palletWidth,palletHeight,cabinetHeight,z,x,tilt].every(Number.isFinite) || palletWidth <= 0 || palletHeight < 0 || cabinetHeight <= 0 || z <= 0) {
    throw new RangeError('尺寸必須有效；棧板寬度、機櫃高度與重心高度須大於零。');
  }
  if (!Number.isFinite(specLimitAngle) || specLimitAngle < 1 || specLimitAngle > 60) {
    throw new RangeError('規格上限角度須介於 1.0° 與 60.0°。');
  }
  const halfWidth = palletWidth / 2;
  const distance = halfWidth - x;
  const criticalAngle = Math.atan(distance / z) * 180 / Math.PI;
  const margin = specLimitAngle - criticalAngle;
  const specStatus = Math.abs(margin) <= 1e-8 ? 'boundary' : margin > 0 ? 'pass' : 'fail';
  const requiredHalfWidth = z * Math.tan(radians(specLimitAngle)) + x;
  const preciseRequiredWidth = 2 * requiredHalfWidth;
  const recommendedHalfWidth = Math.max(0, Math.ceil((requiredHalfWidth - 1e-9) / 10) * 10);
  const recommendedWidth = 2 * recommendedHalfWidth;
  const delta = tilt - criticalAngle;
  const stability:Stability = Math.abs(delta) <= 1e-8 ? 'critical' : delta < 0 ? 'stable' : 'exceeded';
  const gravityOffset = -distance * Math.cos(radians(tilt)) + z * Math.sin(radians(tilt));
  // The editable specification upper limit is independent of physical tipping.
  return {z,x,halfWidth,distance,criticalAngle,margin,specStatus,requiredHalfWidth,preciseRequiredWidth,recommendedHalfWidth,recommendedWidth,stability,gravityOffset,meetsRequirement:specStatus !== 'fail'};
}
export const formatDifference=(difference:number)=>{
  const rounded=Number(difference.toFixed(1));
  return rounded===0?'0.0':`${rounded>0?'+':''}${rounded.toFixed(1)}`;
};
export const formatAngleLabel=(angle:number)=>Number.isInteger(angle)?String(angle):angle.toFixed(1);
export type Calculation = ReturnType<typeof calculate>;
export interface Point {x:number; z:number}
// Local coordinates use the upright floor as z=0. Right lower pallet edge is the pivot.
export function toWorld(point:Point, halfWidth:number, tilt:number):Point {
  const c=Math.cos(radians(tilt)), s=Math.sin(radians(tilt)), dx=point.x-halfWidth;
  return {x:halfWidth+dx*c+point.z*s, z:-dx*s+point.z*c};
}
export function toLocal(point:Point, halfWidth:number, tilt:number):Point {
  const c=Math.cos(radians(tilt)), s=Math.sin(radians(tilt)), dx=point.x-halfWidth;
  return {x:halfWidth+dx*c-point.z*s, z:dx*s+point.z*c};
}
