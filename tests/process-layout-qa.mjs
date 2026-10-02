// Run at desktop viewport sizes to guard against the expanded process clipping CG.
export async function runProcessLayoutQA(tab,capture=async()=>{}) {
  const records=[];
  const check=(condition,label)=>{if(!condition)throw new Error(label);records.push({label,passed:true});};
  const process=tab.playwright.getByRole('button',{name:/計算過程/});
  const snapshot=()=>tab.playwright.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
    const input=document.querySelector('.input-body');
    return {
      workspace:box(document.querySelector('.workspace')),input:box(input),
      cg:box(document.querySelector('.cg-model-card')),
      guidance:box(document.querySelector('.offset-help')),
      process:box(document.querySelector('.process-panel')),
      inputScrollHeight:input.scrollHeight,inputClientHeight:input.clientHeight,
      manualFields:['#cgHeight-number','#cgOffset-number'].map(s=>box(document.querySelector(s))),
    };
  });
  const inspect=(s,label)=>{
    check(s.cg.top>=s.input.top&&s.cg.bottom<=s.input.bottom+1,label+': complete CG card fits inside the input panel');
    check(s.inputScrollHeight<=s.inputClientHeight+1,label+': expanded process does not require internal input scrolling');
    check(s.process.top>=s.workspace.bottom,label+': calculation process stays below all three main columns');
  };
  await tab.playwright.getByRole('button',{name:'範例重設',exact:true}).click();
  if(await process.getAttribute('aria-expanded')==='true')await process.click();
  const collapsed=await snapshot();
  await process.click();let expanded=await snapshot();inspect(expanded,'Theoretical CG');
  check(expanded.workspace.height>=collapsed.workspace.height-1,'Expanding the process never shrinks the main workspace');
  check(await tab.playwright.locator('.calculation-card').count()===6,'Expanded process retains all six calculation cards');
  await capture('expanded-theoretical',tab);
  await tab.playwright.getByRole('button',{name:/重心設定/}).click();
  await tab.playwright.getByRole('button',{name:'手動調整',exact:true}).click();
  expanded=await snapshot();inspect(expanded,'Manual CG');
  check(expanded.guidance.bottom<=expanded.input.bottom+1&&expanded.manualFields.every(r=>r.top>=expanded.input.top&&r.bottom<=expanded.input.bottom+1),'Manual coordinates and sign/height guidance remain unclipped');
  const height=tab.playwright.getByRole('spinbutton',{name:'重心高度（離地）數值',exact:true});
  await height.fill('1262');await tab.playwright.getByTestId('critical-angle').click();
  check((await tab.playwright.getByTestId('cg-height-result').innerText()).includes('1262'),'Manual CG remains editable with the process expanded');
  await capture('expanded-manual',tab);
  await process.click();
  check(await process.getAttribute('aria-expanded')==='false','Calculation process still collapses');
  await process.click();inspect(await snapshot(),'Reopened process');
  await tab.reload();inspect(await snapshot(),'Reloaded expanded process');
  check(await process.getAttribute('aria-expanded')==='true','Expanded state survives reload');
  await process.click();await tab.playwright.getByRole('button',{name:'範例重設',exact:true}).click();
  check((await tab.dev.logs({levels:['error'],limit:10})).length===0,'No browser errors in expanded layout');
  return {checks:records.length,records};
}
