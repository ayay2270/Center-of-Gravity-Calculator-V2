// Run through the Browser plugin tab API. Evaluation reads rendered DOM only.
export async function runRevisionQA(tab,capture=async()=>{}) {
  const records=[];
  const check=(condition,label)=>{if(!condition)throw new Error(label);records.push({label,passed:true});};
  const reset=()=>tab.playwright.getByRole('button',{name:'範例重設',exact:true}).click();
  const set=async(name,value)=>{
    await tab.playwright.getByRole('spinbutton',{name:name+'數值',exact:true}).fill(String(value));
    await tab.playwright.getByTestId('critical-angle').click();
  };
  const geometry=()=>tab.playwright.evaluate(()=>{
    const query=id=>document.querySelector(`[data-testid="${id}"]`);
    const attr=(e,k)=>Number(e.getAttribute(k));
    const group=query('pallet-width-annotations');
    const transform=group.getAttribute('transform');
    const [tx,ty]=transform.match(/translate\(([^)]+)\)/)[1].split(/\s+/).map(Number);
    const rotation=Number(transform.match(/rotate\(([^)]+)\)/)[1]);
    const c=Math.cos(rotation*Math.PI/180),s=Math.sin(rotation*Math.PI/180);
    const localPoint=(x,y)=>({x:tx+x*c-y*s,y:ty+x*s+y*c});
    const line=e=>{
      const transformPoint=e.closest('[data-testid="pallet-width-annotations"]')?localPoint:(x,y)=>({x,y});
      return {a:transformPoint(attr(e,'x1'),attr(e,'y1')),b:transformPoint(attr(e,'x2'),attr(e,'y2'))};
    };
    const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
    const points=e=>e.getAttribute('points').trim().split(/\s+/).map(p=>{const [x,y]=p.split(',').map(Number);return {x,y};});
    const pallet=points(document.querySelector('.pallet-shape'));
    const arrow=points(query('gravity-arrowhead'));
    return {
      pivot:{x:attr(query('pivot').querySelector('circle'),'cx'),y:attr(query('pivot').querySelector('circle'),'cy')},
      cg:{x:attr(query('cg-point'),'cx'),y:attr(query('cg-point'),'cy')},
      gravity:line(query('gravity-line')),shaft:line(query('gravity-shaft')),
      arrow,pallet:pallet.slice(0,2),
      width:line(query('pallet-width-dimension')),half:line(query('half-width-dimension')),
      rotation,
      widthLabel:box(query('pallet-width-label')),halfLabel:box(query('half-width-label')),
      labelSeparation:Math.abs(attr(query('pallet-width-label'),'y')-attr(query('half-width-label'),'y')),
      arrowBox:box(query('gravity-arrowhead')),pivotBox:box(query('pivot').querySelector('circle')),
      angleLabel:box(document.querySelector('.angle-label')),gravityLabel:box(document.querySelector('.gravity-label')),
      pivotLabel:box(document.querySelector('.pivot text')),
      angleAnchor:{x:attr(document.querySelector('.angle-label'),'x'),y:attr(document.querySelector('.angle-label'),'y')},
      angleLeader:query('angle-caption-leader').getAttribute('d'),
      drawing:box(document.querySelector('.drawing')),
      extensionCount:group.querySelectorAll('.extension-line').length,
      unneededRectangles:[...document.querySelectorAll('.engineering-svg rect')].filter(e=>!e.closest('defs')).length,
      hatchStroke:getComputedStyle(query('floor-reference').querySelector('path')).stroke,
      footerBorder:getComputedStyle(document.querySelector('.drawing-footer')).borderTopWidth,
    };
  });
  const near=(a,b)=>Math.abs(a-b)<.001;
  const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const inspect=(g,angle)=>{
    const bottom={x:g.pallet[1].x-g.pallet[0].x,y:g.pallet[1].y-g.pallet[0].y};
    const dimension={x:g.width.b.x-g.width.a.x,y:g.width.b.y-g.width.a.y};
    check(near(g.gravity.a.x,g.gravity.b.x)&&near(g.gravity.a.x,g.cg.x),`${angle}°: gravity stays world vertical through CG`);
    check(near(g.shaft.a.x,g.gravity.a.x)&&near(g.shaft.b.x,g.arrow[2].x)&&g.gravity.b.y>g.shaft.a.y&&g.shaft.b.y>g.arrow[0].y,`${angle}°: dashed line, solid shaft and arrowhead connect without gaps`);
    check(!overlaps(g.arrowBox,g.pivotBox)&&g.arrow[2].y>g.arrow[0].y,`${angle}°: downward arrowhead clears the pivot`);
    check(near(bottom.x,dimension.x)&&near(bottom.y,dimension.y)&&g.extensionCount===2&&near(g.rotation,angle),`${angle}°: width line, extensions and labels follow pallet geometry`);
    const halfSlope=(g.half.b.y-g.half.a.y)/(g.half.b.x-g.half.a.x);
    const halfAtArrow=g.half.a.y+(g.arrow[2].x-g.half.a.x)*halfSlope;
    const arrowBetweenHalfEnds=g.arrow[2].x>=Math.min(g.half.a.x,g.half.b.x)&&g.arrow[2].x<=Math.max(g.half.a.x,g.half.b.x);
    check(!arrowBetweenHalfEnds||halfAtArrow-g.arrow[2].y>3,`${angle}°: gravity arrow tip is separated from the half-width dimension`);
    check(g.rotation>=0&&g.rotation<90&&g.labelSeparation>20&&[g.widthLabel,g.halfLabel,g.arrowBox].every(b=>b.left>=g.drawing.left-1&&b.right<=g.drawing.right+1&&b.top>=g.drawing.top-1&&b.bottom<=g.drawing.bottom+1),`${angle}°: upright-readable width text and arrow remain visible on separate annotation rows`);
    check(!overlaps(g.angleLabel,g.gravityLabel)&&!overlaps(g.angleLabel,g.arrowBox)&&!overlaps(g.angleLabel,g.pivotBox),`${angle}°: angle caption does not overlap gravity label, arrow or pivot`);
    check(!overlaps(g.angleLabel,g.pivotLabel)&&!overlaps(g.angleLabel,g.widthLabel)&&!overlaps(g.angleLabel,g.halfLabel),`${angle}°: angle caption clears pivot text and both width labels`);
    const leader=g.angleLeader.match(/[-\d.]+/g).map(Number);
    check(near(leader[0],g.pivot.x+49*Math.sin(angle*Math.PI/360))&&near(leader[1],g.pivot.y-49*Math.cos(angle*Math.PI/360))&&near(leader[2],g.angleAnchor.x-4)&&near(leader[3],g.angleAnchor.y+5)&&Math.hypot(g.angleAnchor.x-g.pivot.x,g.angleAnchor.y-g.pivot.y)<120,`${angle}°: angle caption connects to the arc bisector near the pivot`);
    check(g.unneededRectangles===0&&g.hatchStroke==='none'&&g.footerBorder==='0px',`${angle}°: floor hatch and baseline have no extra rectangular frame`);
  };
  await reset();
  if(await tab.playwright.getByRole('button',{name:/計算過程/}).getAttribute('aria-expanded')==='true')await tab.playwright.getByRole('button',{name:/計算過程/}).click();
  // Detailed geometry checks run in the explicitly expanded view.
  await tab.playwright.getByRole('button',{name:/計算過程/}).click();
  const original=await geometry();
  for(const angle of [0,5,15.3,16,19,21,22,25,75]){
    await set('目前傾角',angle);
    const g=await geometry(); inspect(g,angle);
    check(near(g.pivot.x,original.pivot.x)&&near(g.pivot.y,original.pivot.y),`${angle}°: active pivot stays fixed`);
    check(await tab.playwright.getByRole('spinbutton',{name:'目前傾角數值',exact:true}).evaluate(e=>e.value)===angle.toFixed(1),`${angle}°: tilt field displays one decimal`);
    await capture(`tilt-${angle}`,tab);
  }
  await reset();
  await tab.playwright.getByRole('button',{name:/計算過程/}).click();
  for(const [angle,margin,passes,wording] of [[21.6,'+0.4°',true,'距規格上限尚有 0.4°'],[22,'0.0°',true,'距規格上限尚有 0.0°'],[22.4,'-0.4°',false,'超過規格上限 0.4°']]){
    await set('棧板寬度',2*1377*Math.tan(angle*Math.PI/180));
    const status=await tab.playwright.evaluate(()=>{
      const card=document.querySelector('[data-testid="spec-status-card"]'),design=card;
      const gap=document.querySelector('[data-testid="spec-gap"]').textContent,amount=gap.match(/([\d.]+)°$/)[1];
      const signed=Number(amount)===0?'0.0':(card.classList.contains('pass')?'+':'-')+amount;
      return {angle:document.querySelector('[data-testid="critical-angle"]').textContent,margin:signed+'°',wording:gap,pass:!card.classList.contains('fail'),color:getComputedStyle(card).color,designPass:design.classList.contains('pass'),designText:document.querySelector('[data-testid="design-status"]').textContent,designColor:getComputedStyle(design).color,current:document.querySelector('[data-testid="current-status"]').textContent};
    });
    check(status.angle===`${angle.toFixed(1)}°`&&status.margin===margin,`${angle}° evaluated: one-decimal critical angle and signed difference`);
    check(status.wording===wording&&status.pass===passes&&status.color===(passes?'rgb(33, 107, 85)':'rgb(179, 50, 43)'),`${angle}° evaluated: correct upper-limit wording and green/red margin`);
    check(status.designPass===passes&&status.designText===(passes?'符合規格':'超過規格')&&status.designColor===(passes?'rgb(33, 107, 85)':'rgb(179, 50, 43)'),`${angle}° evaluated: correct PASS/FAIL design status and color`);
    check(status.current==='未達臨界角',`${angle}° evaluated: current 16° physical state stays independent`);
    await tab.playwright.getByRole('button',{name:/計算過程/}).click();
    inspect(await geometry(),16);
    const conclusion=await tab.playwright.locator('.calculation-card:last-child').innerText();
    check(conclusion.includes(margin)&&conclusion.includes(angle===22?'剛好達到 22° 規格上限':passes?'未超過 22° 規格上限':'已超過 22° 規格上限'),`${angle}° evaluated: expanded calculation conclusion uses the same upper-limit rule`);
    await capture(`status-${angle}`,tab);
    await tab.playwright.getByRole('button',{name:/計算過程/}).click();
  }
  await reset();
  await tab.playwright.getByRole('button',{name:/重心設定/}).click();
  await tab.playwright.getByRole('button',{name:'手動調整',exact:true}).click();
  await set('重心高度（離地）',1164);
  await set('重心左右偏移',83);
  await set('目前傾角',19.1);
  await tab.playwright.getByRole('button',{name:/計算過程/}).click();
  inspect(await geometry(),19.1);
  await capture('reference-manual-19.1',tab);
  await reset();
  await tab.playwright.getByRole('button',{name:/計算過程/}).click();
  check((await tab.dev.logs({levels:['error'],limit:10})).length===0,'No browser console errors in targeted revision checks');
  return {checkedAt:new Date().toISOString(),checks:records.length,records};
}
