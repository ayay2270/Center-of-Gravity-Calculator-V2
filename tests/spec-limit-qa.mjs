// Browser tool tab API only. All evaluate calls read rendered DOM.
export async function runSpecLimitQA(tab,capture=async()=>{}) {
  const records=[];
  const check=(condition,label)=>{if(!condition)throw new Error(label);records.push({label,passed:true});};
  const reset=()=>tab.playwright.getByRole('button',{name:'範例重設',exact:true}).click();
  const set=async(name,value)=>{
    await tab.playwright.getByRole('spinbutton',{name:name+'數值',exact:true}).fill(String(value));
    await tab.playwright.getByTestId('critical-angle').click();
  };
  const state=()=>tab.playwright.evaluate(()=>{
    const text=id=>document.querySelector(`[data-testid="${id}"]`).textContent;
    const design=document.querySelector('[data-testid="spec-status-card"]');
    const gap=text('spec-gap'),amount=gap.match(/([\d.]+)°$/)?.[1]??'0.0',signed=Number(amount)===0?'0.0':(design.classList.contains('pass')?'+':'-')+amount;
    return {
      critical:text('critical-angle'),margin:signed+'°',limit:text('spec-angle'),width:text('recommended-width'),
      design:text('design-status'),current:text('current-status'),marginText:gap,
      marginColor:getComputedStyle(design).color,marginClass:design.className,designClass:design.className,
      tilt:document.querySelector('#tilt-number').value,cg:text('cg-height-result'),
      drawing:document.querySelector('[data-testid="assembly"] polygon').getAttribute('points'),
      resultText:document.querySelector('.results-body').textContent,
    };
  });
  const widthDetails=async()=>{
    const toggle=tab.playwright.getByRole('button',{name:/計算過程/});
    const wasExpanded=await toggle.getAttribute('aria-expanded')==='true';
    if(!wasExpanded)await toggle.click();
    const precise=await tab.playwright.locator('.calculation-card').nth(3).innerText();
    const halfFormula=await tab.playwright.locator('.calculation-card').nth(2).innerText();
    if(!wasExpanded)await toggle.click();
    return {precise,halfFormula};
  };
  const signed=n=>{const r=Number(n.toFixed(1));return r===0?'0.0':`${r>0?'+':''}${r.toFixed(1)}`;};
  const verify=async(limit,z,x,critical,expectedPhysical,label)=>{
    const s=await state(),m=limit-Number(s.tilt),passing=m>1e-8,boundary=Math.abs(m)<=1e-8;
    check(s.limit===`${limit.toFixed(1)}°`,label+': editable upper limit displays one decimal');
    check(s.margin===`${signed(m)}°`,label+': upper-limit margin uses limit minus current tilt');
    check(s.marginClass.includes((boundary||passing)?'pass':'fail')&&s.marginColor===((boundary||passing)?'rgb(33, 107, 85)':'rgb(179, 50, 43)'),label+': margin has correct green/amber/red status');
    check(s.design===((boundary||passing)?'目前傾角符合規格':'目前傾角超過規格')&&s.designClass.includes((boundary||passing)?'pass':'fail'),label+': specification check matches margin');
    check(s.current===expectedPhysical,label+': physical current state remains separate');
    const half=z*Math.tan(limit*Math.PI/180)+x;
    check(Number(s.width.replace(/[^\d.]/g,''))===2*Math.max(0,Math.ceil((half-1e-9)/10)*10),label+': engineering width follows edited limit and manual offset');
    const details=await widthDetails();s.precise=details.precise;
    check(s.precise.includes((2*half).toFixed(1))&&details.halfFormula.includes(`tan(${limit}°)`),label+': expanded precise width and formula follow edited limit');
    check(s.marginText===(boundary?'剛好位於規格上限':`${passing?'距規格上限尚有':'超過規格上限'} ${Math.abs(m).toFixed(1)}°`),label+': supporting wording agrees with the sign');
    return s;
  };
  await reset();
  if(await tab.playwright.getByRole('button',{name:/計算過程/}).getAttribute('aria-expanded')==='true')await tab.playwright.getByRole('button',{name:/計算過程/}).click();
  const spec=tab.playwright.getByRole('spinbutton',{name:'規格上限角度數值',exact:true});
  check(await spec.getAttribute('min')==='1'&&await spec.getAttribute('max')==='60'&&await spec.getAttribute('step')==='0.1','Specification numeric control supports 1–60°, step 0.1°');
  const baseline=await state(),critical=Math.atan(546/1377)*180/Math.PI;
  for(const limit of [22,20,25]){
    await set('規格上限角度',limit);
    const s=await verify(limit,1377,0,critical,'未達臨界角',`Theoretical ${limit}° limit`);
    check(s.critical===baseline.critical&&s.drawing===baseline.drawing&&s.tilt===baseline.tilt&&s.cg===baseline.cg,`${limit}°: editing specification does not change geometry, CG or current tilt`);
    if(limit!==22)check(!s.resultText.includes('22°'),`${limit}°: result panel has no stale 22° labels`);
    await tab.playwright.getByRole('button',{name:'至規格上限',exact:true}).click();
    const quick=await state();
    check(quick.tilt===`${limit.toFixed(1)}`&&quick.current===(limit<critical?'未達臨界角':'已超過臨界角'),`${limit}°: quick action tilts to the editable specification limit`);
    await set('目前傾角',16);
    await tab.playwright.getByRole('button',{name:/計算過程/}).click();
    const formulas=await tab.playwright.locator('.calculation-steps').innerText();
    check(formulas.includes(`tan(${limit}°)`)&&formulas.includes(`${limit.toFixed(1)}° − 16.0°`)&&formulas.includes(`${signed(limit-16)}°`),`${limit}°: six-step walkthrough uses dynamic formulas and margin direction`);
    if(limit!==22)check(!formulas.includes('22°'),`${limit}°: expanded process has no stale 22° constants`);
    await capture(`theoretical-${limit}-expanded`,tab);
    await tab.playwright.getByRole('button',{name:/計算過程/}).click();
  }
  await reset();
  await tab.playwright.getByRole('button',{name:/重心設定/}).click();
  await tab.playwright.getByRole('button',{name:'手動調整',exact:true}).click();
  await set('重心高度（離地）',1262);await set('重心左右偏移',318);await set('目前傾角',19.4);
  const manualCritical=Math.atan((546-318)/1262)*180/Math.PI;
  const reference=await verify(22,1262,318,manualCritical,'已超過臨界角','Screenshot manual case');
  check(reference.critical==='10.2°'&&reference.margin==='+2.6°'&&reference.width.includes('1660')&&reference.precise.includes('1655.8'),'Screenshot exact case: 10.2°, +2.6°, 1660 mm / 1655.8 mm');
  const layout=await tab.playwright.evaluate(()=>{
    const body=document.querySelector('.input-body'),results=document.querySelector('.results-body');
    const within=(selector,container)=>{const r=document.querySelector(selector).getBoundingClientRect(),c=container.getBoundingClientRect();return r.top>=c.top&&r.bottom<=c.bottom&&r.right<=c.right;};
    return {w:document.body.scrollWidth,h:document.body.scrollHeight,manual:within('#cgOffset-number',body),spec:within('#specLimitAngle-number',body),current:within('[data-testid="critical-status-card"]',results)};
  });
  check(layout.w===1440&&layout.h===900&&layout.manual&&layout.spec&&layout.current,'1440×900 manual view shows specification, manual controls and both status cards without clipping');
  await capture('mockup-manual',tab);
  for(const limit of [12,10]){
    await set('規格上限角度',limit);
    const s=await verify(limit,1262,318,manualCritical,'已超過臨界角',`Manual ${limit}° limit`);
    check(s.drawing===reference.drawing&&s.tilt===reference.tilt&&s.critical===reference.critical,`${limit}° manual: limit change preserves posture and physical calculation`);
    await capture(`manual-${limit}`,tab);
  }
  await reset();
  await set('棧板寬度',2*1377*Math.tan(22*Math.PI/180));
  await verify(22,1377,0,22,'未達臨界角','Critical angle 22° / current tilt 16°');
  await set('目前傾角',22);
  await verify(22,1377,0,22,'已達臨界角','Both physical and specification boundary at 22°');
  await capture('boundary',tab);
  await set('目前傾角',16);
  await set('規格上限角度',20);await verify(20,1377,0,22,'未達臨界角','22° critical / 20° limit');
  await capture('fail-stable',tab);
  await set('規格上限角度',25);await verify(25,1377,0,22,'未達臨界角','22° critical / 25° limit');
  await spec.fill('25.1');
  check((await state()).limit==='25.1°','Specification updates immediately while editing without submission');
  await tab.playwright.getByTestId('critical-angle').click();
  check(await spec.evaluate(e=>e.value)==='25.1','Specification retains one-decimal display');
  await set('規格上限角度',25.15);
  await tab.playwright.getByRole('spinbutton',{name:'目前傾角數值',exact:true}).click();
  const quantized=await state();
  check(quantized.limit==='25.2°'&&await spec.evaluate(e=>e.value)==='25.2'&&(await widthDetails()).precise.includes((2*1377*Math.tan(25.2*Math.PI/180)).toFixed(1)),'Specification calculation uses the same rounded 0.1° value shown in its numeric field');
  await set('規格上限角度',0);check(await spec.evaluate(e=>e.value)==='1.0','Below-range specification clamps to 1.0° on blur');
  await set('規格上限角度',61);check(await spec.evaluate(e=>e.value)==='60.0','Above-range specification clamps to 60.0° on blur');
  await reset();check((await state()).limit==='22.0°','Reset restores default specification limit');
  check((await tab.dev.logs({levels:['error'],limit:10})).length===0,'No browser console errors in editable specification checks');
  return {checkedAt:new Date().toISOString(),checks:records.length,records};
}
