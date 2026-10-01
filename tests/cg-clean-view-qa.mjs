// Local Browser-tool QA: read rendered DOM, interact through documented locators.
export async function runCGCleanViewQA(tab,capture=async()=>{}) {
  const records=[];
  const check=(condition,label)=>{if(!condition)throw new Error(label);records.push({label,passed:true});};
  const reset=()=>tab.playwright.getByRole('button',{name:'範例重設',exact:true}).click();
  const set=async(name,value)=>{
    await tab.playwright.getByRole('spinbutton',{name:name+'數值',exact:true}).fill(String(value));
    await tab.playwright.getByTestId('critical-angle').click();
  };
  const state=()=>tab.playwright.evaluate(()=>{
    const cg=document.querySelector('.cg-model-card'),spec=document.querySelector('.spec-limit-group'),drawing=document.querySelector('.drawing'),svg=document.querySelector('.engineering-svg');
    const details=document.querySelector('[data-testid="geometry-details"]');
    const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
    const body=box(document.querySelector('.input-body'));
    const visible=e=>{const r=box(e);return r.top>=body.top&&r.bottom<=body.bottom&&r.right<=body.right;};
    return {
      cgText:cg.textContent,cgColor:getComputedStyle(cg).color,cgBackground:getComputedStyle(cg).backgroundColor,cgBorder:getComputedStyle(cg).borderLeftColor,
      specBackground:getComputedStyle(spec).backgroundColor,specBorder:getComputedStyle(spec).borderColor,
      background:getComputedStyle(drawing).backgroundImage,svgText:svg.textContent,
      dimensionsVisible:getComputedStyle(document.querySelector('[data-testid="drawing-dimensions"]')).display!=='none',
      cabinet:document.querySelector('[data-testid="cabinet-height-label"]').textContent,
      palletHeight:document.querySelector('[data-testid="pallet-height-label"]').textContent,
      palletWidth:document.querySelector('[data-testid="pallet-width-label"]').textContent,
      half:document.querySelector('[data-testid="half-width-label"]').textContent,
      theta:document.querySelector('.angle-label').textContent,cgLabel:document.querySelector('.cg-label').textContent,
      cgLabelBox:box(document.querySelector('.cg-label')),drawingBox:box(drawing),
      height:document.querySelector('#cgHeight-number').value,offset:document.querySelector('#cgOffset-number').value,
      heightEnabled:!document.querySelector('#cgHeight-number').disabled,offsetEnabled:!document.querySelector('#cgOffset-number').disabled,
      manualVisible:visible(document.querySelector('#cgOffset-number'))&&visible(document.querySelector('.cg-settings .control-cgOffset .range')),
      guidanceVisible:visible(document.querySelector('.cg-model-card .offset-help')),
      specVisible:visible(document.querySelector('#specLimitAngle-number')),
      detailsText:details.textContent,details:[...details.querySelectorAll('dl>div')].map(e=>({label:e.querySelector('dt').textContent,value:e.querySelector('dd').textContent.replace(/\s/g,'')})),
      detailsHidden:details.closest('.calculation-details').hidden,
      process:document.querySelector('.calculation-steps').textContent,
    };
  });
  await reset();
  const toggle=tab.playwright.getByRole('button',{name:/計算過程/});
  if(await toggle.getAttribute('aria-expanded')==='true')await toggle.click();
  let s=await state();
  check(s.cgText.includes('重心 CG')&&s.cgText.includes('理論置中')&&s.cgText.includes('重心高度 Zcg')&&s.cgText.includes('1377'),'CG card has a clear header, mode and live height summary');
  check(s.cgBackground==='rgb(247, 250, 252)'&&s.specBackground==='rgb(255, 245, 244)'&&s.cgBorder!==s.specBorder&&s.cgColor==='rgb(23, 73, 108)','Neutral blue/gray CG card is visibly distinct from the warm specification block');
  check(s.background==='none','Square grid is removed, without a replacement background pattern');
  check(s.cabinet==='機櫃高度 H꜀'&&s.palletHeight==='棧板高度 Hₚ'&&s.palletWidth==='棧板寬度 Bₚ'&&s.half==='現有半寬 W','Drawing keeps Chinese names with engineering symbols');
  check(['2448','1092','546','153'].every(value=>!s.svgText.includes(value)),'Default SVG omits all four static raw dimension numbers');
  check(s.cgLabel.includes('重心 CG')&&s.cgLabel.includes('重心高度 Zcg 1377 mm')&&s.theta==='目前傾角 θ 16.0°','Default drawing retains the live CG height and current tilt');
  check(s.detailsHidden,'Detailed geometry is hidden with the collapsed calculation process');
  check(!s.dimensionsVisible,'Collapsed process hides all four drawing dimension labels and their dimension lines');
  await capture('default',tab);
  await toggle.click();s=await state();
  check(s.dimensionsVisible,'Expanding the calculation process also reveals all four dimension annotations in the drawing');
  check(!s.detailsHidden&&s.details.map(d=>d.label+'='+d.value).join('|')==='棧板高度 Hₚ=153mm|棧板寬度 Bₚ=1092mm|機櫃高度 H꜀=2448mm|現有半寬 W=546mm','Expanded process shows all four correctly labeled reference dimensions');
  check(await tab.playwright.locator('.calculation-card').count()===6&&s.process.includes('2448 / 2 + 153')&&s.process.includes('1112.7')&&s.process.includes('1120')&&s.process.includes('臨界角 θc'),'Existing six calculation steps, precise width and rounded recommendation remain available');
  await capture('expanded',tab);
  await set('棧板寬度',1200);await set('棧板高度',180);await set('機櫃高度',2600);
  s=await state();check(s.details.map(d=>d.value).join('|')==='180mm|1200mm|2600mm|600mm','Expanded dimensions update immediately with the geometry inputs');
  await tab.playwright.getByRole('slider',{name:'棧板寬度滑桿',exact:true}).press('ArrowRight');
  s=await state();check(s.details[1].value==='1201mm'&&s.details[3].value==='600.5mm','Expanded dimensions follow sliders and preserve meaningful half-width precision');
  await toggle.click();s=await state();check(!s.dimensionsVisible&&s.detailsHidden,'Collapsing calculation process hides drawing annotations and dimension details together');await reset();
  await tab.playwright.getByRole('button',{name:/重心設定/}).click();
  s=await state();check(!s.heightEnabled&&!s.offsetEnabled,'Expanded theoretical mode keeps computed CG controls read-only');
  await tab.playwright.getByRole('button',{name:'手動調整',exact:true}).click();
  await set('重心高度（離地）',1262);await set('重心左右偏移',318);await set('目前傾角',19.4);
  s=await state();
  check(s.cgText.includes('手動調整')&&s.heightEnabled&&s.offsetEnabled&&s.height==='1262'&&s.offset==='318','Redesigned CG card preserves both editable manual coordinates');
  check(s.cgLabel.includes('重心高度 Zcg 1262 mm')&&s.cgLabel.includes('重心左右偏移 Xcg +318 mm')&&s.theta==='目前傾角 θ 19.4°','Manual drawing retains both live CG coordinates and current tilt');
  check(s.cgLabelBox.left>=s.drawingBox.left&&s.cgLabelBox.right<=s.drawingBox.right,'Longer Chinese-plus-symbol CG labels fit within the drawing');
  check(s.manualVisible&&s.specVisible,'1440×900 manual view keeps specification and both CG coordinate sliders/inputs visible');
  check(s.guidanceVisible,'Manual CG sign convention and floor-height guidance are fully visible');
  await capture('manual',tab);
  await tab.playwright.getByRole('slider',{name:'重心左右偏移滑桿',exact:true}).press('ArrowLeft');
  s=await state();check(s.offset==='317'&&s.cgLabel.includes('Xcg +317 mm'),'Manual offset slider updates the live drawing label');
  await tab.playwright.getByRole('button',{name:'理論置中',exact:true}).click();
  s=await state();check(s.cgLabel.includes('Zcg 1377 mm')&&!s.cgLabel.includes('Xcg')&&!s.heightEnabled,'Theoretical mode restores centered CG and hides the manual offset annotation');
  await reset();
  for(const angle of [0,5,16,19,21,22,25,75]){
    await set('目前傾角',angle);s=await state();
    check(s.background==='none'&&s.theta===`目前傾角 θ ${angle.toFixed(1)}°`&&s.cgLabel.includes('1377 mm'),`${angle}°: clean drawing keeps the essential live engineering annotations`);
  }
  await reset();await tab.playwright.getByRole('button',{name:'直立 0°',exact:true}).click();
  await capture('upright',tab);await reset();
  check((await tab.dev.logs({levels:['error'],limit:10})).length===0,'No browser console errors in CG/detail refinement');
  return {checkedAt:new Date().toISOString(),checks:records.length,records};
}
