import {Icon} from './Controls';
import type {Parameters,Calculation} from './engineering';
import {formatDifference,formatAngleLabel} from './engineering';
import {compareSpecification} from './specComparison';
const number=(x:number)=>Number.isInteger(x)?String(x):x.toFixed(1);
const signed=formatDifference;
export function Process({parameters:p,result:r,expanded,onToggle}:{parameters:Parameters;result:Calculation;expanded:boolean;onToggle:()=>void}){
  const limit=formatAngleLabel(p.specLimitAngle);
  const spec=compareSpecification(p);
  const offset=r.x===0?'':r.x>0?` + ${number(r.x)}`:` − ${number(-r.x)}`;
  const cards=[
    {title:'計算重心高度',extra:'Zcg',body:<><p>{p.mode==='theoretical'?<>Zcg = 機櫃高度 H꜀ / 2<br/>＋ 棧板高度 Hₚ</>:<>Zcg = 手動重心高度<br/>（已由地面起算）</>}</p><p className="substitution">{p.mode==='theoretical'?`= ${number(p.cabinetHeight)} / 2 + ${number(p.palletHeight)}`:'不再加上棧板高度'}</p><strong className="equation-answer">Zcg = {number(r.z)} <small>mm</small></strong></>},
    {title:'臨界條件',extra:`${limit}° 規格`,body:<><p className="main-equation">tan⁻¹({r.x===0?'W':'(W − Xcg)'} / Zcg)<br/>= {p.specLimitAngle.toFixed(1)}°</p><p className="step-foot">重力線通過右側支點</p></>},
    {title:'解得臨界半寬',extra:'W',body:<><p>W = Zcg × tan({limit}°){r.x===0?'':' + Xcg'}</p><p className="substitution">= {number(r.z)} × tan({limit}°){offset}</p><p>≈ {r.requiredHalfWidth.toFixed(1)} mm</p><strong className="equation-answer">W ≈ {r.recommendedHalfWidth} <small>mm</small></strong><p className="step-foot">半寬向上取 10 mm</p></>},
    {title:'所需棧板寬度',body:<><p>棧板寬度 Bₚ = 2W</p><p className="substitution">精確 ≈ {r.preciseRequiredWidth.toFixed(1)} mm</p><strong className="equation-answer">2W ≈ {r.recommendedWidth} <small>mm</small></strong><p className="step-foot">工程建議：2 × {r.recommendedHalfWidth} mm</p></>},
    {title:'目前設計',extra:'現有棧板',body:<><p className="substitution">{number(p.palletWidth)} / 2 = {number(r.halfWidth)} mm</p>{r.x!==0&&<p className="substitution">D = {number(r.halfWidth)} − ({number(r.x)})</p>}<p className="main-equation">tan⁻¹({number(r.distance)} / {number(r.z)})<br/>臨界角 θc = {r.criticalAngle.toFixed(1)}°</p><p className="step-foot">{r.x===0?'現有半寬 W':'重心至右支點距離 D'} = {number(r.distance)} mm</p></>},
    {title:'結論',extra:spec.subject,body:<><p>{p.specLimitAngle.toFixed(1)}° − {spec.value.toFixed(1)}°</p><strong className={`equation-answer conclusion ${spec.status}`}>{signed(spec.margin)}°</strong><p className="step-foot">{spec.subject}{spec.status==='boundary'?'剛好位於':spec.passes?'未超過':'已超過'} {limit}° 規格上限</p></>},
  ];
  return <section className={`process-panel panel ${expanded?'expanded':'collapsed'}`} aria-label="計算過程">
    <button className="process-heading" aria-expanded={expanded} aria-controls="calculation-steps" onClick={onToggle}><Icon kind="process"/><h2>計算過程</h2><span>由重心高度，一步步驗算 {limit}° 規格</span><b className="process-summary">Zcg {number(r.z)} mm → {spec.subject} {spec.value.toFixed(1)}° → {signed(spec.margin)}°</b><span className="toggle-caption">{expanded?'收合':'展開'} <b>{expanded?'⌃':'⌄'}</b></span></button>
    <div className="calculation-details" id="calculation-steps" hidden={!expanded}><div className="geometry-details" data-testid="geometry-details"><h3>工程尺寸明細</h3><dl>{[['棧板高度 Hₚ',p.palletHeight],['棧板寬度 Bₚ',p.palletWidth],['機櫃高度 H꜀',p.cabinetHeight],['現有半寬 W',r.halfWidth]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{number(Number(value))} <small>mm</small></dd></div>)}</dl></div><div className="calculation-steps">{cards.map((card,i)=><article className="calculation-card" key={card.title}><h3><b>{i+1}</b>{card.title}{card.extra&&<small>{card.extra}</small>}</h3><div className="step-content">{card.body}</div></article>)}</div></div>
  </section>;
}
