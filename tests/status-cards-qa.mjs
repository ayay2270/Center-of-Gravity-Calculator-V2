// Validate physical tipping and the accepted current-tilt upper-limit comparison.
export async function runStatusCardsQA(tab,capture=async()=>{}) {
  const records=[];
  const check=(condition,label)=>{if(!condition)throw new Error(label);records.push({label,passed:true});};
  const set=async(name,value)=>{
    await tab.playwright.getByRole('spinbutton',{name:name+'數值',exact:true}).fill(String(value));
    await tab.playwright.getByRole('spinbutton',{name:'棧板高度數值',exact:true}).click();
  };
  const state=()=>tab.playwright.evaluate(()=>{
    const text=id=>document.querySelector(`[data-testid="${id}"]`).textContent;
    const card=id=>{const e=document.querySelector(`[data-testid="${id}"]`);return {layers:e.children.length,icon:e.querySelector('b').textContent,color:getComputedStyle(e).color};};
    return {current:text('current-status'),currentGap:text('current-gap'),currentComparison:text('current-comparison'),spec:text('design-status'),specGap:text('spec-gap'),specComparison:text('spec-comparison'),physicalCard:card('critical-status-card'),specCard:card('spec-status-card'),order:[...document.querySelector('.results-body').children].map(e=>e.getAttribute('data-testid')||e.className),drawing:document.querySelector('[data-testid="assembly"] polygon').getAttribute('points')};
  });
  await tab.playwright.getByRole('button',{name:'範例重設',exact:true}).click();
  const process=tab.playwright.getByRole('button',{name:/計算過程/});
  if(await process.getAttribute('aria-expanded')==='true')await process.click();
  await set('目前傾角',15.3);const reference=await state();
  check(reference.current==='未達臨界角'&&reference.currentGap==='距臨界角尚有 6.3°'&&reference.currentComparison==='15.3° < 21.6°','15.3° remains below the physical tipping boundary');
  check(reference.spec==='目前傾角符合規格'&&reference.specGap==='距規格上限尚有 6.7°'&&reference.specComparison==='15.3° < 22.0°','15.3° passes the 22° specification upper limit');
  check(reference.physicalCard.icon==='✓'&&reference.specCard.icon==='✓'&&reference.specCard.color==='rgb(33, 107, 85)','Both passing cards show green checks');
  check(reference.order.slice(0,3).join('|')==='angle-relationship|angle-judgments|angle-width','Result sections retain their order');
  check(reference.physicalCard.layers===3&&reference.specCard.layers===3,'Each judgment contains only the three requested text layers');
  await set('目前傾角',22);let s=await state();
  check(s.current==='已超過臨界角'&&s.currentGap==='超過臨界角 0.4°'&&s.currentComparison==='22.0° > 21.6°','22° exceeds the physical critical angle');
  check(s.physicalCard.icon==='×'&&s.physicalCard.color==='rgb(179, 50, 43)','Physical excess uses a red cross');
  check(s.spec==='目前傾角符合規格'&&s.specGap==='剛好位於規格上限'&&s.specComparison==='22.0° = 22.0°','Current tilt exactly at the upper limit is specification PASS');
  await tab.playwright.getByRole('button',{name:'至臨界角',exact:true}).click();s=await state();
  check(s.current==='已達臨界角'&&s.currentGap==='目前傾角等於臨界角'&&s.currentComparison==='21.6° = 21.6°','Critical shortcut keeps internal precision');
  check(s.physicalCard.icon==='△'&&s.physicalCard.color==='rgb(153, 102, 32)','Physical equality has an amber triangle');
  await set('目前傾角',29.9);s=await state();
  check(s.spec==='目前傾角超過規格'&&s.specGap==='超過規格上限 7.9°'&&s.specComparison==='29.9° > 22.0°','29.9° correctly fails specification by 7.9°');
  check(s.specCard.icon==='×'&&s.specCard.color==='rgb(179, 50, 43)','Specification excess has a red cross');
  await set('目前傾角',15.3);await set('規格上限角度',15);s=await state();
  check(s.specGap==='超過規格上限 0.3°'&&s.specComparison==='15.3° > 15.0°','Editing the upper limit updates specification excess live');
  check(s.current===reference.current&&s.currentGap===reference.currentGap&&s.drawing===reference.drawing,'Editing the upper limit does not change physical geometry or tipping state');
  await set('規格上限角度',25);s=await state();
  check(s.spec==='目前傾角符合規格'&&s.specGap==='距規格上限尚有 9.7°'&&s.specComparison==='15.3° < 25.0°','25° upper limit gives 9.7° remaining for current tilt');
  await set('規格上限角度',22);await set('棧板寬度',2*1377*Math.tan(22.4*Math.PI/180));s=await state();
  check(s.spec==='目前傾角符合規格'&&s.specComparison==='15.3° < 22.0°','A 22.4° critical angle does not make a 15.3° tilt fail specification');
  await tab.playwright.getByRole('button',{name:'範例重設',exact:true}).click();
  check((await tab.dev.logs({levels:['error'],limit:10})).length===0,'No errors in the accepted B specification rule');
  return {checks:records.length,records};
}
