import {useEffect,useState} from 'react';
export type NumericKey = 'palletHeight'|'palletWidth'|'cabinetHeight'|'tilt'|'cgHeight'|'cgOffset';
export const LIMITS:Record<NumericKey,[number,number,number]> = {
  palletHeight:[0,1000,1],palletWidth:[100,6000,1],cabinetHeight:[100,10000,1],
  tilt:[0,75,0.1],cgHeight:[1,11000,1],cgOffset:[-6000,6000,1],
};
const labels:Record<NumericKey,string>={palletHeight:'棧板高度',palletWidth:'棧板寬度',cabinetHeight:'機櫃高度',tilt:'目前傾斜角',cgHeight:'重心高度（離地）',cgOffset:'重心左右偏移'};
const symbols:Record<NumericKey,string>={palletHeight:'Hₚ',palletWidth:'Bₚ',cabinetHeight:'H꜀',tilt:'θ',cgHeight:'Zcg',cgOffset:'Xcg'};
export function Icon({kind,className=''}:{kind:string;className?:string}){
  const paths:Record<string,string>={
    cabinet:'M9 3h18v26H9z M14 3v26 M3 29h30v5H3z M6 34v4 M30 34v4',
    palletHeight:'M4 14h28v5H4z M7 19v8h6v-8 M23 19v8h6v-8 M4 8v4 M32 8v4',
    palletWidth:'M3 10v16 M33 10v16 M3 18h30 M8 14l-5 4 5 4 M28 14l5 4-5 4',
    cabinetHeight:'M12 3h17v29H12z M5 3v29 M2 3h6 M2 29h6',
    tilt:'M4 31h30 M4 31L25 6 M16 31a12 12 0 0 0-4-9',
    results:'M4 30h28 M7 30V18h5v12 M17 30V10h5v20 M27 30V3h5v27',
    process:'M5 3h25v31H5z M9 10h3 M17 10h8 M9 18h3 M17 18h8 M9 26h3 M17 26h8',
    cgHeight:'M18 3v29 M13 8l5-5 5 5 M13 24l5 5 5-5',cgOffset:'M3 18h30 M8 13l-5 5 5 5 M28 13l5 5-5 5',
  };
  return <svg className={`icon ${className}`} viewBox="0 0 36 40" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d={paths[kind]||paths.cabinet}/></svg>;
}
export function NumberControl({field,value,onChange,disabled=false}:{field:NumericKey;value:number;onChange:(field:NumericKey,value:number)=>void;disabled?:boolean}){
  const [draft,setDraft]=useState(String(value));
  const [min,max,step]=LIMITS[field], unit=field==='tilt'?'°':'mm';
  useEffect(()=>setDraft(field==='tilt'?String(Number(value.toFixed(6))):String(value)),[value,field]);
  const invalid=draft!==''&&(!Number.isFinite(Number(draft))||Number(draft)<min||Number(draft)>max);
  const commit=()=>{
    const num=Number(draft);
    if(draft===''||!Number.isFinite(num)){setDraft(String(value));return;}
    const next=Math.min(max,Math.max(min,num)); onChange(field,next);setDraft(String(next));
  };
  return <div className={`control control-${field}${disabled?' disabled':''}`}>
    <div className="control-row"><Icon kind={field}/><label htmlFor={`${field}-number`}>{labels[field]} <i>{symbols[field]}</i></label>
      <div className="number-box"><input id={`${field}-number`} aria-label={`${labels[field]}數值`} type="number" min={min} max={max} step="any" value={draft} disabled={disabled} aria-invalid={invalid||undefined}
        onChange={event=>{const text=event.target.value;setDraft(text);const num=Number(text);if(text!==''&&Number.isFinite(num)&&num>=min&&num<=max)onChange(field,num);}}
        onBlur={commit} onKeyDown={event=>{if(event.key==='Enter')commit();}}/><span>{unit}</span></div>
    </div>
    <input className="range" aria-label={`${labels[field]}滑桿`} type="range" min={min} max={max} step="any" value={value} disabled={disabled} onChange={event=>onChange(field,Number((Math.round(Number(event.target.value)/step)*step).toFixed(6)))}
      onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowDown'||event.key==='ArrowRight'||event.key==='ArrowUp'){event.preventDefault();onChange(field,Number((value+(['ArrowLeft','ArrowDown'].includes(event.key)?-step:step)*(event.shiftKey?10:1)).toFixed(6)));}}}
      style={{background:`linear-gradient(to right, #3a7caf 0%, #3a7caf ${(value-min)/(max-min)*100}%, #dce6ee ${(value-min)/(max-min)*100}%, #dce6ee 100%)`}}/>
    {invalid&&<span className="field-error">範圍 {min}–{max} {unit}；離開欄位時修正</span>}
  </div>;
}
