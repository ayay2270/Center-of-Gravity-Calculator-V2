import type {Parameters} from './engineering';

// The accepted specification check compares current tilt to the upper limit.
// Geometry, tipping state and width calculations remain in calculate().
export function compareSpecification(p:Parameters) {
  const value=p.tilt;
  const margin=p.specLimitAngle-value;
  const status=Math.abs(margin)<=1e-8?'boundary':margin>0?'pass':'fail';
  return {value,margin,status,passes:status!=='fail',subject:'目前傾角'};
}
