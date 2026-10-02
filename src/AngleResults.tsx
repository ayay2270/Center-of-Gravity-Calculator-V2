import {calculate} from './engineering';
import type {Parameters} from './engineering';
import {compareSpecification} from './specComparison';

type Result = ReturnType<typeof calculate>;

export function AngleResults({parameters:p,result:r}:{parameters:Parameters;result:Result}) {
  const spec=compareSpecification(p);
  const angles=[
    {id:'current',name:'目前傾角 θ',value:p.tilt,className:'angle-current'},
    {id:'critical',name:'臨界角 θc',value:r.criticalAngle,className:'angle-critical'},
    {id:'spec',name:'規格上限',value:p.specLimitAngle,className:'angle-spec'},
  ];
  const physicalState=r.stability==='stable'?'pass':r.stability==='critical'?'boundary':'fail';
  const physicalLabel={stable:'未達臨界角',critical:'已達臨界角',exceeded:'已超過臨界角'}[r.stability];
  return <>
    <section className="angle-relationship" data-testid="angle-relationship">
      <div className="angle-summary" data-testid="angle-summary">
        {angles.map(angle=><div key={angle.id} className={angle.className}><span>{angle.name}</span><strong data-testid={angle.id==='critical'?'critical-angle':`${angle.id}-angle`}>{angle.value.toFixed(1)}<small>°</small></strong></div>)}
      </div>
    </section>
    <div className="angle-judgments" data-testid="angle-judgments">
      <section className={`judgment-card ${physicalState}`} data-testid="critical-status-card" aria-label="目前傾角與臨界角判定">
        <div className="judgment-title"><b aria-hidden="true">{r.stability==='stable'?'✓':r.stability==='critical'?'△':'×'}</b><strong data-testid="current-status">{physicalLabel}</strong></div>
        <p data-testid="current-gap">{r.stability==='critical'?'目前傾角等於臨界角':`${r.stability==='stable'?'距臨界角尚有':'超過臨界角'} ${Math.abs(r.criticalAngle-p.tilt).toFixed(1)}°`}</p>
        <p className="judgment-comparison" data-testid="current-comparison">{p.tilt.toFixed(1)}° {r.stability==='stable'?'<':r.stability==='critical'?'=':'>'} {r.criticalAngle.toFixed(1)}°</p>
      </section>
      <section className={`judgment-card ${spec.passes?'pass':'fail'}`} data-testid="spec-status-card" aria-label={`${spec.subject}與規格上限判定`}>
        <div className="judgment-title"><b aria-hidden="true">{spec.passes?'✓':'×'}</b><strong data-testid="design-status">{spec.subject}{spec.passes?'符合規格':'超過規格'}</strong></div>
        <p data-testid="spec-gap">{spec.status==='boundary'?'剛好位於規格上限':`${spec.passes?'距規格上限尚有':'超過規格上限'} ${Math.abs(spec.margin).toFixed(1)}°`}</p>
        <p className="judgment-comparison" data-testid="spec-comparison">{spec.value.toFixed(1)}° {spec.status==='boundary'?'=':spec.passes?'<':'>'} {p.specLimitAngle.toFixed(1)}°</p>
      </section>
    </div>

    <section className="angle-width" data-testid="angle-width"><span>所需棧板寬度</span><strong data-testid="recommended-width">{r.recommendedWidth} <small>mm</small></strong></section>
  </>;
}
