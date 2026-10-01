import {useEffect,useRef,useState} from 'react';
import type {PointerEvent,KeyboardEvent} from 'react';
import {toWorld,toLocal,radians} from './engineering';
import type {Calculation,Parameters,Point} from './engineering';
import {LIMITS} from './Controls';
interface Props {parameters:Parameters;result:Calculation;showDimensions:boolean;onMove:(x:number,z:number)=>void}
const f=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(1);
export function Drawing({parameters:p,result:r,onMove,showDimensions}:Props){
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
  const px=size.w*.55, floor=size.h-96;
  const leftPadding=size.w<500?70:105, rightPadding=size.w<500?75:135;
  const scale=Math.max(.001,Math.min((size.h-155)/Math.max(100,zmax),
    Math.max(40,px-leftPadding)/Math.max(100,half-xmin),Math.max(40,size.w-px-rightPadding)/Math.max(100,xmax-half),
    zmin<0?28/-zmin:Infinity));
  const worldScreen=(q:Point)=>({x:px+(q.x-half)*scale,y:floor-q.z*scale});
  const localScreen=(q:Point)=>worldScreen(toWorld(q,half,p.tilt));
  const polygon=(pts:Point[])=>pts.map(localScreen).map(q=>`${q.x},${q.y}`).join(' ');
  const cg=worldScreen(worldCg),pivot=localScreen({x:half,z:0});
  const cabinetPts=[{x:-half,z:p.palletHeight},{x:half,z:p.palletHeight},{x:half,z:top},{x:-half,z:top}];
  const palletPts=[{x:-half,z:0},{x:half,z:0},{x:half,z:p.palletHeight},{x:-half,z:p.palletHeight}];
  const dimOffset=55/scale;
  const heightA=localScreen({x:-half-dimOffset,z:p.palletHeight}),heightB=localScreen({x:-half-dimOffset,z:top});
  const palletA=localScreen({x:-half-24/scale,z:0}),palletB=localScreen({x:-half-24/scale,z:p.palletHeight});
  const drawnWidth=p.palletWidth*scale;
  const widthOffset=64,halfOffset=38;
  // Both width dimensions use pallet-local coordinates, including their labels.
  const widthTransform=`translate(${pivot.x} ${pivot.y}) rotate(${p.tilt})`;
  const gravityTipY=Math.max(floor+22,cg.y+34);
  const gravityHeadY=gravityTipY-12,gravityJoinY=Math.max(cg.y,gravityTipY-38);
  const radius=49,angle=radians(p.tilt),arcStart={x:px,y:floor-radius},arcEnd={x:px+radius*Math.sin(angle),y:floor-radius*Math.cos(angle)};
  const gravityLabel={x:Math.min(size.w-115,cg.x+30),y:(cg.y+floor)/2+10};
  const arcMiddle={x:pivot.x+radius*Math.sin(angle/2),y:pivot.y-radius*Math.cos(angle/2)};
  // Position the caption from the arc bisector, independently of CG movement.
  const angleLabel={x:pivot.x+(radius+20)*Math.sin(angle/2)+12,y:pivot.y-(radius+20)*Math.cos(angle/2)-5};
  // An expanded walkthrough shortens the drawing; reserve a clear text row.
  if(angleLabel.x<gravityLabel.x+76&&angleLabel.x+150>gravityLabel.x&&angleLabel.y-18<gravityLabel.y+4&&angleLabel.y+4>gravityLabel.y-16){
    const belowGravity=gravityLabel.y+28;
    angleLabel.y=belowGravity+4<pivot.y-52?belowGravity:gravityLabel.y-28;
  }
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
        <pattern id="wood" width="20" height="9" patternUnits="userSpaceOnUse" patternTransform={`rotate(${p.tilt})`}><rect width="20" height="9" fill="#e7d9bd"/><path d="M0 2h20M5 6h11" stroke="#b6a27c" strokeWidth=".6"/></pattern>
        <linearGradient id="steel"><stop stopColor="#edf4f7"/><stop offset="1" stopColor="#cbdbe5"/></linearGradient>
        <pattern id="floor-hatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#92adbe" strokeWidth=".8"/></pattern>
      </defs>
      <g className="upright-reference" aria-label="直立參考輪廓"><path d={`M${px-drawnWidth},${floor}V${floor-top*scale}H${px}V${floor}`}/><line x1={px-half*scale} x2={px-half*scale} y1={floor} y2={floor-top*scale}/></g>
      <g data-testid="floor-reference"><path d={`M20 ${floor}h${size.w-40}v13H20Z`} fill="url(#floor-hatch)" stroke="none"/><line x1="20" y1={floor} x2={size.w-20} y2={floor} className="floor-line"/></g>
      <text x={size.w-24} y={floor+32} textAnchor="end" className="small-annotation">地面基準</text>
      <g data-testid="assembly" data-pivot-x={pivot.x} data-pivot-y={pivot.y}>
        <polygon points={polygon(cabinetPts)} fill="url(#steel)" className="cabinet-shape"/>
        <polygon points={polygon(palletPts)} fill="url(#wood)" className="pallet-shape"/>
        <line x1={localScreen({x:0,z:p.palletHeight}).x} y1={localScreen({x:0,z:p.palletHeight}).y} x2={localScreen({x:0,z:top}).x} y2={localScreen({x:0,z:top}).y} className="center-line"/>
        <text x={localScreen({x:0,z:top*.77}).x} y={localScreen({x:0,z:top*.77}).y} textAnchor="middle" className="cabinet-label">機櫃</text>
      </g>
      <g className="dimensions" data-testid="drawing-dimensions" aria-hidden={!showDimensions} style={{display:showDimensions?undefined:'none'}}>
        {dimension(heightA,heightB,'cabinet-dimension')}
        {[p.palletHeight,top].map(z=>{const a=localScreen({x:-half,z}),b=localScreen({x:-half-dimOffset-8/scale,z});return <line key={z} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="extension-line"/>;})}
        <text x={(heightA.x+heightB.x)/2-11} y={(heightA.y+heightB.y)/2-5} textAnchor="end" data-testid="cabinet-height-label">機櫃高度 H꜀</text>
        {dimension(palletA,palletB,'pallet-height-dimension')}
        <text x={palletB.x-12} y={palletB.y+5} textAnchor="end" data-testid="pallet-height-label">棧板高度 Hₚ</text>
        <g data-testid="pallet-width-annotations" transform={widthTransform}>
          {[-drawnWidth,0].map(x=><line key={x} data-testid="width-extension" x1={x} y1="11" x2={x} y2={widthOffset+6} className="extension-line"/>)}
          {dimension({x:-drawnWidth,y:widthOffset},{x:0,y:widthOffset},'pallet-width-dimension')}
          <text data-testid="pallet-width-label" x={-drawnWidth/2} y={widthOffset+21} textAnchor="middle" className="dimension-value">棧板寬度 Bₚ</text>
          {dimension({x:-drawnWidth/2,y:halfOffset},{x:0,y:halfOffset},'half-width-dimension')}
          <text data-testid="half-width-label" x={-drawnWidth/4} y={halfOffset+22} textAnchor="middle">現有半寬 W</text>
        </g>
      </g>
      <g data-testid="gravity-arrow">
        <line data-testid="gravity-line" x1={cg.x} x2={cg.x} y1={cg.y} y2={gravityJoinY+7} className="gravity-line"/>
        <line data-testid="gravity-shaft" x1={cg.x} x2={cg.x} y1={gravityJoinY} y2={gravityHeadY+2} stroke="#d43730" strokeWidth="1.8" strokeLinecap="round"/>
        <polygon data-testid="gravity-arrowhead" points={`${cg.x-6},${gravityHeadY} ${cg.x+6},${gravityHeadY} ${cg.x},${gravityTipY}`} fill="#d43730"/>
      </g>
      <text x={gravityLabel.x} y={gravityLabel.y} className="gravity-label">鉛直重力線</text>
      <line x1={px} y1={floor} x2={px} y2={floor-radius-14} className="angle-reference"/>
      <line x1={px} y1={floor} x2={arcEnd.x} y2={arcEnd.y} className="angle-reference active"/>
      <path data-testid="angle-arc" d={`M${arcStart.x},${arcStart.y}A${radius},${radius} 0 0 1 ${arcEnd.x},${arcEnd.y}`} className="angle-arc"/>
      <path data-testid="angle-caption-leader" d={`M${arcMiddle.x},${arcMiddle.y}L${angleLabel.x-4},${angleLabel.y+5}`} fill="none" stroke="#d1362b" strokeWidth=".8"/>
      <text x={angleLabel.x} y={angleLabel.y} className="angle-label">目前傾角 θ {p.tilt.toFixed(1)}°</text>
      <g className="pivot" data-testid="pivot"><circle cx={pivot.x} cy={pivot.y} r="8"/><circle cx={pivot.x} cy={pivot.y} r="2.5"/><path d={`M${pivot.x+10},${pivot.y-5}l30,-22h82`}/><text x={pivot.x+40} y={pivot.y-33}>右側翻覆支點</text></g>
      <g className="cg-handle" data-testid="cg-handle" role="button" tabIndex={0} aria-label={`拖曳重心；離地 ${f(r.z)} 毫米，左右偏移 ${f(r.x)} 毫米`} onPointerDown={begin} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={keyboard}>
        <circle cx={cg.x} cy={cg.y} r="20" className="cg-hit-area"/><line x1={cg.x-15} x2={cg.x+15} y1={cg.y} y2={cg.y} className="cg-cross"/><line x1={cg.x} x2={cg.x} y1={cg.y-15} y2={cg.y+15} className="cg-cross"/><circle data-testid="cg-point" cx={cg.x} cy={cg.y} r="8.5" className="cg-point"/>
      </g>
      <text x={Math.min(size.w-240,cg.x+20)} y={Math.max(24,cg.y-15)} className="cg-label">重心 CG<tspan x={Math.min(size.w-240,cg.x+20)} dy="23">重心高度 Zcg {f(r.z)} mm</tspan>{p.mode==='manual'&&<tspan x={Math.min(size.w-240,cg.x+20)} dy="22">重心左右偏移 Xcg {r.x>0?'+':''}{f(r.x)} mm</tspan>}</text>
    </svg>
    <div className="drawing-legend"><span className="red-dot"/> CG / 重力線 <span className="pivot-dot"/> 右側支點 <span>mm</span></div>
  </div>;
}
