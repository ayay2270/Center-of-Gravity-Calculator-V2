import {useEffect,useRef,useState} from 'react';
import {calculate,DEFAULTS} from './engineering';
import type {Parameters} from './engineering';
import {Icon,NumberControl,LIMITS} from './Controls';
import type {NumericKey} from './Controls';
import {Drawing} from './Drawing';
import {Process} from './Process';
const plain=(n:number)=>Number(n.toFixed(1)).toString();
export function App(){
  const [parameters,setParameters]=useState<Parameters>({...DEFAULTS});
  const [settings,setSettings]=useState(false);
  const [expanded,setExpanded]=useState(()=>{try{return sessionStorage.getItem('cg-a-process')==='expanded';}catch{return false;}});
  const help=useRef<HTMLDialogElement>(null);
  const r=calculate(parameters),p=parameters;
  useEffect(()=>{try{sessionStorage.setItem('cg-a-process',expanded?'expanded':'collapsed');}catch{}},[expanded]);
  const change=(field:NumericKey,value:number)=>setParameters(previous=>({...previous,[field]:Math.min(LIMITS[field][1],Math.max(LIMITS[field][0],value))}));
  const moveCG=(x:number,z:number)=>{setSettings(true);setParameters(previous=>({...previous,mode:'manual',cgOffset:x,cgHeight:z}));};
  const switchMode=(mode:'theoretical'|'manual')=>setParameters(previous=>{const current=calculate(previous);return {...previous,mode,cgHeight:current.z,cgOffset:current.x};});
  const reset=()=>{setParameters({...DEFAULTS});setSettings(false);};
  const stabilityLabel={stable:'仍穩定',critical:'臨界狀態',exceeded:'超過臨界角'}[r.stability];
  const message=p.mode==='theoretical'?(r.meetsRequirement?'若實際重心較理論假設更低且無更不利偏移，通常具有更大的靜態翻覆穩定裕量。':'理論置中假設未達目標，需確認實際重心；此結果不代表實際產品必定翻覆。'):'依手動重心評估右側靜態翻覆；重心高度由地面起算，請確認實測重心與支承條件。';
  return <div className="application" data-process-expanded={expanded}>
    <header className="top-header"><Icon kind="cabinet" className="brand-icon"/><div className="title-group"><h1>2D 重心 / 翻覆穩定性計算機</h1><p>清楚並列輸入、圖面與判讀 · 右側靜態翻覆</p></div><span className="version-tag">Version A</span><div className="header-actions"><span className="local-label">本機工程原型</span><button onClick={reset}>範例重設</button><button className="help-button" aria-label="計算模型說明" onClick={()=>help.current?.showModal()}>?</button></div></header>
    <main className="workspace">
      <aside className="input-panel panel"><div className="panel-heading"><Icon kind="palletHeight"/><h2>輸入參數</h2><span>mm / °</span></div><div className="input-body">
        {(['palletHeight','palletWidth','cabinetHeight'] as const).map(field=><NumberControl key={field} field={field} value={p[field]} onChange={change}/>)}
        <div className="tilt-controls"><NumberControl field="tilt" value={p.tilt} onChange={change}/><div className="quick-actions"><button onClick={()=>change('tilt',0)}>直立 0°</button><button onClick={()=>change('tilt',22)}>至 22°</button><button onClick={()=>change('tilt',r.criticalAngle)}>臨界角</button></div></div>
        <div className="cg-summary"><div><span><i className="red-dot"/> 重心 CG</span><strong data-testid="cg-height-result">{plain(r.z)} <small>mm</small></strong></div><p>離地 · 直立座標{p.mode==='manual'?` · Xcg ${r.x>0?'+':''}${plain(r.x)} mm`:''}</p></div>
        <section className="cg-settings"><button className="cg-settings-toggle" aria-expanded={settings} aria-controls="cg-settings-body" onClick={()=>setSettings(!settings)}><span>{settings?'−':'＋'} 重心設定</span><small>{p.mode==='theoretical'?'理論置中':'手動調整'}</small></button><div id="cg-settings-body" hidden={!settings}>
          <div className="mode-switch" role="group" aria-label="重心模式"><button aria-pressed={p.mode==='theoretical'} onClick={()=>switchMode('theoretical')}>理論置中</button><button aria-pressed={p.mode==='manual'} onClick={()=>switchMode('manual')}>手動調整</button></div>
          <NumberControl field="cgHeight" value={r.z} onChange={change} disabled={p.mode==='theoretical'}/><NumberControl field="cgOffset" value={r.x} onChange={change} disabled={p.mode==='theoretical'}/><p className="offset-help">偏移 ＋ 向右 / − 向左 · 高度從地面起算</p>
        </div></section>
      </div></aside>
      <section className="visual-panel panel"><div className="panel-heading light-heading"><Icon kind="cabinet"/><h2>2D 側視圖</h2><span>機櫃於棧板上</span></div><Drawing parameters={p} result={r} onMove={moveCG}/><div className="drawing-footer"><div><strong>θ {p.tilt.toFixed(1)}°</strong><span>目前姿態</span></div><div className="drag-help"><span><i className="red-dot"/> 拖曳重心即時調整</span><small>方向鍵微調 · Shift ×10</small></div><div><strong>{plain(r.halfWidth)} mm</strong><span>現有半寬 W</span></div></div></section>
      <aside className="results-panel panel"><div className="panel-heading"><Icon kind="results"/><h2>計算結果</h2><span>即時</span></div><div className="results-body">
        <section className="critical-card result-card"><div>目前設計臨界角 <i>θc</i></div><div className="critical-values"><strong data-testid="critical-angle">{r.criticalAngle.toFixed(1)}<small>°</small></strong><div><span>22° 規格</span><b>22.0°</b></div></div><p>現有棧板 {plain(p.palletWidth)} mm</p></section>
        <section className={`margin-card result-card ${r.meetsRequirement?'pass':'fail'}`}><div><span>與 22° 規格差距</span><p>{Math.abs(r.margin)<1e-8?'恰達 22° 目標':`${r.meetsRequirement?'高於':'低於'}目標 ${Math.abs(r.margin).toFixed(1)}°`}</p></div><strong data-testid="margin">{r.margin>1e-8?'+':''}{Math.abs(r.margin)<.05?'0.0':r.margin.toFixed(1)}<small>°</small></strong></section>
        <section className="width-card result-card"><div className="width-top"><div>所需棧板寬度<span>工程取整</span></div><strong data-testid="recommended-width">{r.recommendedWidth} <small>mm</small></strong></div><p>2W = 2 × {r.recommendedHalfWidth} mm</p><p data-testid="precise-width">精確下限 {r.preciseRequiredWidth.toFixed(1)} mm</p></section>
        <div className={`status-row design-status ${r.meetsRequirement?'pass':'warning'}`}><b>{r.meetsRequirement?'✓':'!'}</b><span>22° 設計要求</span><strong data-testid="design-status">{r.meetsRequirement?'符合':'未達'} 22° 規格</strong></div>
        <div className={`status-row current-status ${r.stability}`}><b>{r.stability==='stable'?'✓':r.stability==='critical'?'!':'↗'}</b><span>目前 θ = {p.tilt.toFixed(1)}°</span><strong data-testid="current-status">{stabilityLabel}</strong></div>
        <p className="engineering-message">{message}</p>
      </div></aside>
    </main>
    <Process parameters={p} result={r} expanded={expanded} onToggle={()=>setExpanded(!expanded)}/>
    <footer className="page-footer"><span>Version A · 工程工作台</span><span>理論置中為早期設計篩選 · 2D 靜態模型</span><span>本機原型 / 即時驗算</span></footer>
    <dialog ref={help} className="help-dialog" onClick={event=>{if(event.target===event.currentTarget)help.current?.close();}}><h2>計算模型說明</h2><p>機櫃與棧板繞棧板右下角旋轉。重力線保持世界座標鉛直，當其通過支點時達到靜態翻覆臨界條件。</p><p>重心高度 Zcg 以直立時的地面起算；手動模式不再加棧板高度。偏移正值向右、負值向左。</p><p>22° 設計要求與目前傾斜狀態分別判讀。超過臨界角表示靜態模型失穩，不是動態翻倒模擬。</p><p>機櫃側視寬度依棧板寬度示意；本模型不包含滑動、彈性變形與動態衝擊。</p><p>所需半寬精確值先向上取整至 10 mm，再乘以 2 得工程建議。手動偏移時 W = Zcg × tan(22°) + Xcg。</p><button onClick={()=>help.current?.close()}>知道了</button></dialog>
  </div>;
}
