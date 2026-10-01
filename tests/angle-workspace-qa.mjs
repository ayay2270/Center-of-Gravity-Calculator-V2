// Verify the visible angle workspace with the Browser tool's tab API.
export async function runAngleWorkspaceQA(tab,capture=async()=>{}) {
  const records=[];
  const check=(condition,label)=>{if(!condition)throw new Error(label);records.push({label,passed:true});};
  const reset=()=>tab.playwright.getByRole('button',{name:'範例重設',exact:true}).click();
  const set=async(name,value)=>{
    await tab.playwright.getByRole('spinbutton',{name:name+'數值',exact:true}).fill(String(value));
    await tab.playwright.getByTestId('critical-angle').click();
  };
  const snapshot=()=>tab.playwright.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};};
    const summary=document.querySelector('[data-testid="angle-summary"]');
    const text=id=>document.querySelector(`[data-testid="${id}"]`).textContent;
    return {
      summaryBox:box(summary),
      numbers:[...summary.querySelectorAll('strong')].map(e=>({text:e.textContent,box:box(e),color:getComputedStyle(e).color})),
      scales:document.querySelectorAll('[data-testid="angle-scale"],.angle-scale-container').length,
      summaries:[text('current-angle'),text('critical-angle'),text('spec-angle')],
      current:text('current-status'),currentGap:text('current-gap'),spec:text('design-status'),specGap:text('spec-gap'),
      colors:['critical-status-card','spec-status-card'].map(id=>getComputedStyle(document.querySelector(`[data-testid="${id}"]`)).color),
      layout:[...document.querySelectorAll('.angle-judgments>.judgment-card')].map(box),
      legacy:document.querySelectorAll('.critical-card,.margin-card,.status-row').length,
      currentInput:document.querySelector('#tilt-number').value,
      drawing:document.querySelector('[data-testid="assembly"] polygon').getAttribute('points'),
    };
  });
  const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const inspectSummary=(s,label)=>{
    check(s.numbers.length===3&&s.scales===0,label+': three live angle values and no removed scale');
    check(s.numbers.every(m=>/^-?\d+\.\d°$/.test(m.text)),label+': all angles display one decimal');
    check(s.numbers.every(m=>m.box.left>=s.summaryBox.left&&m.box.right<=s.summaryBox.right),label+': values stay within their panel');
    check(s.numbers.every((m,i)=>s.numbers.slice(i+1).every(other=>!overlaps(m.box,other.box))),label+': close or equal values do not overlap');
    check(s.numbers.map(m=>m.color).join('|')==='rgb(8, 122, 182)|rgb(213, 131, 9)|rgb(206, 48, 48)',label+': consistent blue / orange / red values');
  };
  await reset();
  if(await tab.playwright.getByRole('button',{name:/計算過程/}).getAttribute('aria-expanded')==='true')await tab.playwright.getByRole('button',{name:/計算過程/}).click();
  await set('目前傾角',15.3);
  let s=await snapshot();inspectSummary(s,'Sketch reference');
  check(s.summaries.join('|')==='15.3°|21.6°|22.0°','Reference summary retains the three angles');
  check(s.current==='未達臨界角'&&s.currentGap==='距臨界角尚有 6.3°'&&s.spec==='符合規格'&&s.specGap==='距規格上限尚有 0.4°','Reference judgments show 6.3° physical gap and 0.4° specification gap');
  check(s.layout[0].top===s.layout[1].top&&s.layout[0].right<=s.layout[1].left&&s.legacy===0,'Sketch uses side-by-side judgments with no old redundant cards');
  check(await tab.playwright.getByRole('heading',{name:'棧板與機櫃尺寸',exact:true}).isVisible()&&await tab.playwright.getByRole('heading',{name:'角度設定',exact:true}).isVisible(),'Left inputs have the two requested visible groups');
  await capture('reference',tab);
  await set('目前傾角',22);s=await snapshot();inspectSummary(s,'Case A: current equals specification');
  check(s.current==='已超過臨界角'&&s.currentGap==='超過臨界角 0.4°'&&s.colors[0]==='rgb(179, 50, 43)'&&s.spec==='符合規格'&&s.colors[1]==='rgb(33, 107, 85)','Case A: physical FAIL and specification PASS are independently shown');
  await capture('case-a',tab);
  await set('棧板寬度',2*1377*Math.tan(22.4*Math.PI/180));await set('目前傾角',16);
  s=await snapshot();inspectSummary(s,'Case B: critical exceeds specification');
  check(s.current==='未達臨界角'&&s.colors[0]==='rgb(33, 107, 85)'&&s.spec==='超過規格'&&s.specGap==='超過規格上限 0.4°'&&s.colors[1]==='rgb(179, 50, 43)','Case B: physical PASS and specification FAIL are independently shown');
  await capture('case-b',tab);
  await set('棧板寬度',2*1377*Math.tan(22*Math.PI/180));
  await tab.playwright.getByRole('button',{name:'至臨界角',exact:true}).click();
  s=await snapshot();inspectSummary(s,'All three angles equal');
  check(s.current==='已達臨界角'&&s.colors[0]==='rgb(153, 102, 32)'&&s.spec==='符合規格'&&s.colors[1]==='rgb(33, 107, 85)','Exact physical boundary is amber while exact specification boundary remains green');
  await capture('all-equal',tab);
  await reset();await set('目前傾角',75);await set('規格上限角度',60);
  s=await snapshot();inspectSummary(s,'Large angles');
  check(s.summaries[0]==='75.0°'&&s.summaries[2]==='60.0°','Supported large values remain visible without a scale');
  await tab.playwright.getByRole('button',{name:/重心設定/}).click();
  await tab.playwright.getByRole('button',{name:'手動調整',exact:true}).click();
  await set('重心高度（離地）',1);await set('重心左右偏移',6000);
  s=await snapshot();inspectSummary(s,'Negative critical angle');
  check(s.summaries[1].startsWith('-')&&s.current==='已超過臨界角','CG beyond the pivot displays a negative critical angle and exceeded physical state');
  await reset();await set('目前傾角',15.3);
  check((await tab.dev.logs({levels:['error'],limit:10})).length===0,'No console errors in the angle workspace');
  return {checkedAt:new Date().toISOString(),checks:records.length,records};
}
