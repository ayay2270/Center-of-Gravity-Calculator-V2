import {useEffect,useRef,useState} from 'react';
import {calculate,DEFAULTS,formatAngleLabel} from './engineering';
import type {Parameters} from './engineering';
import {Icon,NumberControl,LIMITS} from './Controls';
import type {NumericKey} from './Controls';
import {Drawing} from './Drawing';
import {Process} from './Process';
import {AngleResults} from './AngleResults';
import {compareSpecification} from './specComparison';
const plain=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(1);
export function App(){
  const [parameters,setParameters]=useState<Parameters>(()=>{
    const tilt=Number(document.getElementById('root')?.dataset.reviewTilt??DEFAULTS.tilt);
    return {...DEFAULTS,tilt:Number.isFinite(tilt)?Math.min(LIMITS.tilt[1],Math.max(LIMITS.tilt[0],tilt)):DEFAULTS.tilt};
  });
  const [settings,setSettings]=useState(false);
  const [expanded,setExpanded]=useState(()=>{try{return sessionStorage.getItem('cg-a-process')==='expanded';}catch{return false;}});
  const help=useRef<HTMLDialogElement>(null);
  const r=calculate(parameters),p=parameters;
  const spec=compareSpecification(p);
  useEffect(()=>{try{sessionStorage.setItem('cg-a-process',expanded?'expanded':'collapsed');}catch{}},[expanded]);
  const change=(field:NumericKey,value:number)=>setParameters(previous=>({...previous,[field]:Math.min(LIMITS[field][1],Math.max(LIMITS[field][0],field==='specLimitAngle'?Math.round(value*10)/10:value))}));
  const moveCG=(x:number,z:number)=>{setSettings(true);setParameters(previous=>({...previous,mode:'manual',cgOffset:x,cgHeight:z}));};
  const switchMode=(mode:'theoretical'|'manual')=>setParameters(previous=>{const current=calculate(previous);return {...previous,mode,cgHeight:current.z,cgOffset:current.x};});
  const reset=()=>{setParameters({...DEFAULTS});setSettings(false);};
  const limit=formatAngleLabel(p.specLimitAngle);
  const message=`目前傾角${spec.passes?'未超過':'超過'} ${limit}° 規格上限；翻覆臨界獨立判讀。所需棧板寬度仍依臨界角對應上限反算。`;
  return <div className="application" data-process-expanded={expanded}>
    <header className="top-header"><Icon kind="cabinet" className="brand-icon"/><div className="title-group"><h1>2D 重心 / 翻覆穩定性計算機</h1><p>清楚並列輸入、圖面與判讀 · 右側靜態翻覆</p></div><div className="header-actions"><button onClick={reset}>範例重設</button><button className="help-button" aria-label="計算模型說明" onClick={()=>help.current?.showModal()}>?</button></div></header>
    <main className="workspace">
      <aside className="input-panel panel"><div className="panel-heading"><Icon kind="palletHeight"/><h2>輸入參數</h2><span>mm / °</span></div><div className="input-body">
        <h3 className="input-group-title"><Icon kind="palletHeight"/>棧板與機櫃尺寸</h3>
        {(['palletHeight','palletWidth','cabinetHeight'] as const).map(field=><NumberControl key={field} field={field} value={p[field]} onChange={change}/>)}
        <section className="tilt-controls angle-controls"><h3 className="input-group-title"><Icon kind="tilt"/>角度設定</h3><NumberControl field="tilt" value={p.tilt} onChange={change}/><div className="quick-actions"><button onClick={()=>change('tilt',0)}>直立 0°</button><button onClick={()=>change('tilt',r.criticalAngle)}>至臨界角</button><button onClick={()=>change('tilt',p.specLimitAngle)}>至規格上限</button></div>
        <div className="spec-controls spec-limit-group"><NumberControl field="specLimitAngle" value={p.specLimitAngle} onChange={change} slider={false}/><p>規格判讀上限，不改變目前姿態</p></div></section>
        <section className="cg-model-card" aria-label="重心 CG 設定"><div className="cg-model-heading"><h3><span className="cg-model-symbol" aria-hidden="true">⊕</span>重心 CG</h3><span className="cg-mode-label">{p.mode==='theoretical'?'理論置中':'手動調整'}</span></div><div className="cg-summary"><div><span>重心高度 <i>Zcg</i></span><strong data-testid="cg-height-result">{plain(r.z)} <small>mm</small></strong></div><p>{p.mode==='manual'?`離地 · 偏移 Xcg ${r.x>0?'+':''}${plain(r.x)} mm`:'離地 · 直立座標'}</p></div>
        <section className="cg-settings"><button className="cg-settings-toggle" aria-expanded={settings} aria-controls="cg-settings-body" onClick={()=>setSettings(!settings)}><span>{settings?'−':'＋'} 重心設定</span><small>{settings?'收合 ⌃':'展開 ⌄'}</small></button><div id="cg-settings-body" hidden={!settings}>
          <div className="mode-switch" role="group" aria-label="重心模式"><button aria-pressed={p.mode==='theoretical'} onClick={()=>switchMode('theoretical')}>理論置中</button><button aria-pressed={p.mode==='manual'} onClick={()=>switchMode('manual')}>手動調整</button></div>
          <NumberControl field="cgHeight" value={r.z} onChange={change} disabled={p.mode==='theoretical'}/><NumberControl field="cgOffset" value={r.x} onChange={change} disabled={p.mode==='theoretical'}/><p className="offset-help">偏移 ＋ 向右 / − 向左 · 高度從地面起算</p>
        </div></section></section>
      </div></aside>
      <section className="visual-panel panel"><div className="panel-heading light-heading"><Icon kind="cabinet"/><h2>2D 側視圖</h2><span>機櫃於棧板上</span></div><Drawing parameters={p} result={r} onMove={moveCG} showDimensions={expanded}/><div className="drawing-footer"><div><strong>θ {p.tilt.toFixed(1)}°</strong><span>目前傾角</span></div><div className="drag-help"><span><i className="red-dot"/> 拖曳重心即時調整</span><small>方向鍵微調 · Shift ×10</small></div><div className="dimension-detail-hint"><span>尺寸明細</span><small>展開下方計算過程查看</small></div></div></section>
      <aside className="results-panel panel"><div className="panel-heading"><Icon kind="results"/><h2>角度關係與判定</h2><span>即時</span></div><div className="results-body angle-results-body">
        <AngleResults parameters={p} result={r}/>
        <p className="engineering-message">{message}</p>
      </div></aside>
    </main>
    <Process parameters={p} result={r} expanded={expanded} onToggle={()=>setExpanded(!expanded)}/>
    <footer className="page-footer"><span>理論置中為早期設計篩選 · 2D 靜態模型</span><span>2D 靜態翻覆模型</span></footer>
    <dialog ref={help} className="help-dialog" onClick={event=>{if(event.target===event.currentTarget)help.current?.close();}}><h2>計算模型說明</h2><p>機櫃與棧板繞棧板右下角旋轉。重力線保持世界座標鉛直，當其通過支點時達到靜態翻覆臨界條件。</p><p>重心高度 Zcg 以直立時的地面起算；手動模式不再加棧板高度。偏移正值向右、負值向左。</p><p>規格上限可調整，目前為 {p.specLimitAngle.toFixed(1)}°：目前傾角不超過上限為符合，超過為不符合。餘量 = 規格上限 − {spec.subject}，正數為尚有餘量，負數為已超過。此規格判讀與目前傾斜狀態分開；目前傾角超過臨界角表示靜態模型失穩，不是動態翻倒模擬。</p><p>機櫃側視寬度依棧板寬度示意；本模型不包含滑動、彈性變形與動態衝擊。</p><p>所需寬度顯示 {limit}° 對應的反算值。半寬先向上取整至 10 mm，再乘以 2 得工程取整值；取整值本身不表示通過上限檢核。手動偏移時 W = Zcg × tan({limit}°) + Xcg。</p><button onClick={()=>help.current?.close()}>知道了</button></dialog>
  </div>;
}
