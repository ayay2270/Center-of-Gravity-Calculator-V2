import {useEffect,useRef,useState} from 'react';
import type {PointerEvent,KeyboardEvent} from 'react';
import {toWorld,toLocal,radians} from './engineering';
import type {Calculation,Parameters,Point} from './engineering';
import {LIMITS} from './Controls';
interface Props {parameters:Parameters;result:Calculation;onMove:(x:number,z:number)=>void}
const f=(n:number)=>Number(n.toFixed(1)).toString();
export function Drawing({parameters:p,result:r,onMove}:Props){
  const holder=useRef<HTMLDivElement>(null), svg=useRef<SVGSVGElement>(null);
  const drag=useRef<{id:number;x:number;z:number}|null>(null);
  const [size,setSize]=useState({w:800,h:450});
  useEffect(()=>{const observer=new ResizeObserver(entries=>{const rect=entries[0].contentRect;if(!Number.isFinite(rect.width)||!Number.isFinite(rect.height))return;setSize({w:Math.max(300,rect.width),h:Math.max(250,rect.height)});});observer.observe(holder.current!);return()=>observer.disconnect();},[]);
  const half=r.halfWidth, top=p.cabinetHeight+p.palletHeight;
  const upright:Point[]=[{x:-half,z:0},{x:half,z:0},{x:half,z:top},{x:-half,z:top}];
  const rotated=upright.map(q=>toWorld(q,half,p.tilt)), worldCg=toWorld({x:r.x,z:r.z},half,p.tilt);
  const xs=[...rotated.map(q=>q.x),worldCg.x], zs=[...rotated.map(q=>q.z),worldCg.z];
  const xmin=Math.min(...xs),xmax=Math.max(...xs),zmin=Math.min(0,...zs),zmax=Math.max(...zs);
  // Keep the pivot at the same screen point during tilt. Only framing scale adapts.
  const px=size.w*.55, floor=size.h-84;
  const leftPadding=size.w<500?70:105, rightPadding=size.w<500?75:135;
  const scale=Math.max(.001,Math.min((size.h-125)/Math.max(100,zmax),
    Math.max(40,px-leftPadding)/Math.max(100,half-xmin),Math.max(40,size.w-px-rightPadding)/Math.max(100,xmax-half),
    zmin<0?55/-zmin:Infinity));
  const worldScreen=(q:Point)=>({x:px+(q.x-half)*scale,y:floor-q.z*scale});
  const localScreen=(q:Point)=>worldScreen(toWorld(q,half,p.tilt));
  const polygon=(pts:Point[])=>pts.map(localScreen).map(q=>`${q.x},${q.y}`).join(' ');
  const cg=worldScreen(worldCg),pivot=localScreen({x:half,z:0});
  const cabinetPts=[{x:-half,z:p.palletHeight},{x:half,z:p.palletHeight},{x:half,z:top},{x:-half,z:top}];
  const palletPts=[{x:-half,z:0},{x:half,z:0},{x:half,z:p.palletHeight},{x:-half,z:p.palletHeight}];
  const dimOffset=55/scale;
  const heightA=localScreen({x:-half-dimOffset,z:p.palletHeight}),heightB=localScreen({x:-half-dimOffset,z:top});
  const palletA=localScreen({x:-half-24/scale,z:0}),palletB=localScreen({x:-half-24/scale,z:p.palletHeight});
  const widthA=localScreen({x:-half,z:-33/scale}),widthB=localScreen({x:half,z:-33/scale});
  const halfA=localScreen({x:0,z:0}),halfB=pivot;
  const radius=49,angle=radians(p.tilt),arcStart={x:px,y:floor-radius},arcEnd={x:px+radius*Math.sin(angle),y:floor-radius*Math.cos(angle)};
  const eventToLocal=(clientX:number,clientY:number)=>{
    const bounds=svg.current!.getBoundingClientRect();
    const point={x:half+((clientX-bounds.left)*size.w/bounds.width-px)/scale,z:(floor-(clientY-bounds.top)*size.h/bounds.height)/scale};
    return toLocal(point,half,p.tilt);
  };
  const constrain=(x:number,z:number)=>onMove(Math.round(Math.max(LIMITS.cgOffset[0],Math.min(LIMITS.cgOffset[1],x))),Math.round(Math.max(LIMITS.cgHeight[0],Math.min(LIMITS.cgHeight[1],z))));
  const begin=(event:PointerEvent<SVGGElement>)=>{
    if(event.button!==0)return;event.preventDefault();
    const q=eventToLocal(event.clientX,event.clientY);drag.current={id:event.pointerId,x:q.x-r.x,z:q.z-r.z};
    event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.focus();
    // No coordinate jump: preserve cursor offset and switch the mode at pointer down.
    onMove(r.x,r.z);
  };
  const move=(event:PointerEvent<SVGGElement>)=>{if(!drag.current||drag.current.id!==event.pointerId)return;const q=eventToLocal(event.clientX,event.clientY);constrain(q.x-drag.current.x,q.z-drag.current.z);};
  const keyboard=(event:KeyboardEvent<SVGGElement>)=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const step=event.shiftKey?10:1;constrain(r.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),r.z+(event.key==='ArrowUp'?step:event.key==='ArrowDown'?-step:0));};
  const dimension=(a:{x:number;y:number},b:{x:number;y:number},id:string)=> <line data-testid={id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="dimension-line" markerStart="url(#dimension-arrow)" markerEnd="url(#dimension-arrow)"/>;
  return <div className="drawing" ref={holder}>
    <svg ref={svg} viewBox={`0 0 ${size.w} ${size.h}`} className="engineering-svg" aria-label="機櫃繞右棧板邊緣傾斜的 2D 工程側視圖" data-tilt={p.tilt}>
      <defs>
        <marker id="dimension-arrow" viewBox="0 0 8 8" markerWidth="7" markerHeight="7" refX="4" refY="4" orient="auto-start-reverse"><path d="M1 4L7 1V7Z" fill="#447194"/></marker>
        <marker id="gravity-arrow" viewBox="0 0 10 10" markerWidth="11" markerHeight="11" refX="7" refY="5" orient="auto"><path d="M0 0L9 5L0 10Z" fill="#d13732"/></marker>
        <pattern id="wood" width="20" height="9" patternUnits="userSpaceOnUse" patternTransform={`rotate(${p.tilt})`}><rect width="20" height="9" fill="#e7d9bd"/><path d="M0 2h20M5 6h11" stroke="#b6a27c" strokeWidth=".6"/></pattern>
        <linearGradient id="steel"><stop stopColor="#edf4f7"/><stop offset="1" stopColor="#cbdbe5"/></linearGradient>
        <pattern id="floor-hatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#92adbe" strokeWidth=".8"/></pattern>
      </defs>
      <g className="upright-reference" aria-label="直立參考輪廓"><rect x={px-p.palletWidth*scale} y={floor-top*scale} width={p.palletWidth*scale} height={top*scale}/><line x1={px-half*scale} x2={px-half*scale} y1={floor} y2={floor-top*scale}/></g>
      <rect x="20" y={floor} width={size.w-40} height="13" fill="url(#floor-hatch)"/><line x1="20" y1={floor} x2={size.w-20} y2={floor} className="floor-line"/>
      <text x={size.w-24} y={floor+32} textAnchor="end" className="small-annotation">地面基準</text>
      <g data-testid="assembly" data-pivot-x={pivot.x} data-pivot-y={pivot.y}>
        <polygon points={polygon(cabinetPts)} fill="url(#steel)" className="cabinet-shape"/>
        <polygon points={polygon(palletPts)} fill="url(#wood)" className="pallet-shape"/>
        <line x1={localScreen({x:0,z:p.palletHeight}).x} y1={localScreen({x:0,z:p.palletHeight}).y} x2={localScreen({x:0,z:top}).x} y2={localScreen({x:0,z:top}).y} className="center-line"/>
        <text x={localScreen({x:0,z:top*.77}).x} y={localScreen({x:0,z:top*.77}).y} textAnchor="middle" className="cabinet-label">機櫃</text>
      </g>
      <g className="dimensions">
        {dimension(heightA,heightB,'cabinet-dimension')}
        {[p.palletHeight,top].map(z=>{const a=localScreen({x:-half,z}),b=localScreen({x:-half-dimOffset-8/scale,z});return <line key={z} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="extension-line"/>;})}
        <text x={(heightA.x+heightB.x)/2-11} y={(heightA.y+heightB.y)/2-5} textAnchor="end">機櫃高度<tspan x={(heightA.x+heightB.x)/2-11} dy="22" className="dimension-value">{f(p.cabinetHeight)} mm</tspan></text>
        {dimension(palletA,palletB,'pallet-height-dimension')}
        <text x={palletB.x-12} y={palletB.y+5} textAnchor="end">h = {f(p.palletHeight)} mm</text>
        {dimension(widthA,widthB,'pallet-width-dimension')}
        <text x={(widthA.x+widthB.x)/2} y={Math.max(widthA.y,widthB.y)+22} textAnchor="middle" className="dimension-value">棧板寬度 {f(p.palletWidth)} mm</text>
        <text x={Math.min(size.w-110,pivot.x+54)} y={pivot.y+25}>W = {f(r.halfWidth)} mm</text>
        <line x1={halfA.x} y1={halfA.y} x2={halfB.x} y2={halfB.y} className="half-width-line"/>
      </g>
      <line data-testid="gravity-line" x1={cg.x} x2={cg.x} y1={cg.y} y2={floor+9} className="gravity-line" markerEnd="url(#gravity-arrow)"/>
      <text x={Math.min(size.w-115,cg.x+30)} y={(cg.y+floor)/2+10} className="gravity-label">鉛直重力線</text>
      <line x1={px} y1={floor} x2={px} y2={floor-radius-14} className="angle-reference"/>
      <line x1={px} y1={floor} x2={arcEnd.x} y2={arcEnd.y} className="angle-reference active"/>
      <path data-testid="angle-arc" d={`M${arcStart.x},${arcStart.y}A${radius},${radius} 0 0 1 ${arcEnd.x},${arcEnd.y}`} className="angle-arc"/>
      <text x={px-radius-11} y={floor-12} textAnchor="end" className="angle-label">θ {p.tilt.toFixed(1)}°</text>
      <g className="pivot" data-testid="pivot"><circle cx={pivot.x} cy={pivot.y} r="8"/><circle cx={pivot.x} cy={pivot.y} r="2.5"/><path d={`M${pivot.x+10},${pivot.y-5}l30,-22h82`}/><text x={pivot.x+40} y={pivot.y-33}>右側翻覆支點</text></g>
      <g className="cg-handle" data-testid="cg-handle" role="button" tabIndex={0} aria-label={`拖曳重心；離地 ${f(r.z)} 毫米，左右偏移 ${f(r.x)} 毫米`} onPointerDown={begin} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={keyboard}>
        <circle cx={cg.x} cy={cg.y} r="20" className="cg-hit-area"/><line x1={cg.x-15} x2={cg.x+15} y1={cg.y} y2={cg.y} className="cg-cross"/><line x1={cg.x} x2={cg.x} y1={cg.y-15} y2={cg.y+15} className="cg-cross"/><circle data-testid="cg-point" cx={cg.x} cy={cg.y} r="8.5" className="cg-point"/>
      </g>
      <text x={Math.min(size.w-165,cg.x+20)} y={Math.max(24,cg.y-15)} className="cg-label">重心 CG<tspan x={Math.min(size.w-165,cg.x+20)} dy="23">Zcg {f(r.z)} mm</tspan>{p.mode==='manual'&&<tspan x={Math.min(size.w-165,cg.x+20)} dy="22">Xcg {r.x>0?'+':''}{f(r.x)} mm</tspan>}</text>
    </svg>
    <div className="drawing-legend"><span className="red-dot"/> CG / 重力線 <span className="pivot-dot"/> 右側支點 <span>mm</span></div>
  </div>;
}
