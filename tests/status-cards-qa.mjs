// Validate rendered status comparisons through the Browser tool tab API.
export async function runStatusCardsQA(tab,capture=async()=>{}) {
  const records=[];
  const check=(condition,label)=>{if(!condition)throw new Error(label);records.push({label,passed:true});};
  const set=async(name,value)=>{
    await tab.playwright.getByRole('spinbutton',{name:name+'數值',exact:true}).fill(String(value));
    await tab.playwright.getByRole('spinbutton',{name:'棧板高度數值',exact:true}).click();
  };
  const state=()=>tab.playwright.evaluate(()=>{
    const text=id=>document.querySelector(`[data-testid="${id}"]`).textContent;
    const card=id=>{
      const e=document.querySelector(`[data-testid="${id}"]`);
      return {title:e.querySelector('span').textContent,icon:e.querySelector('b').textContent,color:getComputedStyle(e).color};
    };
    return {current:text('current-status'),currentGap:text('current-gap'),currentComparison:text('current-comparison'),spec:text('design-status'),specGap:text('spec-gap'),specComparison:text('spec-comparison'),physicalCard:card('critical-status-card'),specCard:card('spec-status-card'),order:[...document.querySelector('.results-body').children].map(e=>e.getAttribute('data-testid')||e.className),drawing:document.querySelector('[data-testid="assembly"] polygon').getAttribute('points'),upperMargin:text('spec-gap')};
  });
  await tab.playwright.getByRole('button',{name:'範例重設',exact:true}).click();
  if(await tab.playwright.getByRole('button',{name:/計算過程/}).getAttribute('aria-expanded')==='true')await tab.playwright.getByRole('button',{name:/計算過程/}).click();
  await set('目前傾角',15.3);
  const reference=await state();
  check(reference.current==='未達臨界角'&&reference.currentGap==='距臨界角尚有 6.3°'&&reference.currentComparison==='15.3° < 21.6°','15.3° example exactly matches current-versus-critical wording');
  check(reference.spec==='符合規格'&&reference.specGap==='距規格上限尚有 0.4°'&&reference.specComparison==='21.6° < 22.0°','15.3° example exactly matches critical-versus-specification wording');
  check(reference.physicalCard.icon==='✓'&&reference.physicalCard.color==='rgb(33, 107, 85)'&&reference.specCard.icon==='✓'&&reference.specCard.color==='rgb(33, 107, 85)','Below-critical and within-specification cards both show green checks');
  check(reference.order[0]==='angle-relationship'&&reference.order[1]==='angle-judgments'&&reference.order[2]==='angle-width','Sketch order: combined summary / scale, side-by-side judgments, then required width');
  await capture('reference-15.3',tab);
  await set('目前傾角',22);
  const exceeded=await state();
  check(exceeded.current==='已超過臨界角'&&exceeded.currentGap==='超過臨界角 0.4°'&&exceeded.currentComparison==='22.0° > 21.6°','22.0° tilt explicitly reports exceeded critical angle and distance');
  check(exceeded.physicalCard.icon==='×'&&exceeded.physicalCard.color==='rgb(179, 50, 43)','Above-critical card shows a red cross');
  check(exceeded.spec===reference.spec&&exceeded.specGap===reference.specGap&&exceeded.specComparison===reference.specComparison&&exceeded.specCard.color===reference.specCard.color,'Current tilt changes do not affect specification comparison');
  await capture('exceeded-22',tab);
  await tab.playwright.getByRole('button',{name:'至臨界角',exact:true}).click();
  const exact=await state();
  check(exact.current==='已達臨界角'&&exact.currentGap==='目前傾角等於臨界角'&&exact.currentComparison==='21.6° = 21.6°','Exact critical shortcut produces equality wording without rounding internal angle');
  check(exact.physicalCard.icon==='△'&&exact.physicalCard.color==='rgb(153, 102, 32)','Equal-critical card uses warning triangle and color');
  await capture('physical-boundary',tab);
  await set('目前傾角',15.3);
  await set('規格上限角度',20);
  const failed=await state();
  check(failed.spec==='超過規格'&&failed.specGap==='超過規格上限 1.6°'&&failed.specComparison==='21.6° > 20.0°','Edited 20° upper limit updates specification comparison and excess');
  check(failed.specCard.icon==='×'&&failed.specCard.color==='rgb(179, 50, 43)','Specification above upper limit shows a red cross');
  check(failed.current===reference.current&&failed.currentGap===reference.currentGap&&failed.currentComparison===reference.currentComparison&&failed.drawing===reference.drawing,'Editing the upper limit preserves physical comparison and geometry');
  await capture('spec-fail-20',tab);
  await set('規格上限角度',25);
  const passing=await state();
  check(passing.spec==='符合規格'&&passing.specGap==='距規格上限尚有 3.4°'&&passing.specComparison==='21.6° < 25.0°'&&passing.specComparison.endsWith('25.0°'),'Edited 25° upper limit updates title, margin and relationship');
  await set('規格上限角度',22);
  await set('棧板寬度',2*1377*Math.tan(22*Math.PI/180));
  const specBoundary=await state();
  check(specBoundary.spec==='符合規格'&&specBoundary.specGap==='距規格上限尚有 0.0°'&&specBoundary.specComparison==='22.0° = 22.0°','Exact specification equality remains PASS with zero remaining margin');
  check(specBoundary.specCard.icon==='✓'&&specBoundary.specCard.color==='rgb(33, 107, 85)','Exact specification boundary is green; physical state is judged separately');
  await capture('spec-boundary',tab);
  await set('棧板寬度',2*1377*Math.tan(22.4*Math.PI/180));
  const specExcess=await state();
  check(specExcess.spec==='超過規格'&&specExcess.specGap==='超過規格上限 0.4°'&&specExcess.specComparison==='22.4° > 22.0°','22.4° evaluated angle matches requested specification FAIL example');
  await capture('spec-fail-22.4',tab);
  await tab.playwright.getByRole('button',{name:'範例重設',exact:true}).click();
  await set('目前傾角',15.3);
  check((await tab.dev.logs({levels:['error'],limit:10})).length===0,'No browser errors in both status-card comparisons');
  return {checkedAt:new Date().toISOString(),checks:records.length,records};
}
