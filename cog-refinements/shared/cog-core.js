/*
 * cog-core.js — shared engine for the five concept previews.
 *
 * Mirrors the published "2D 重心 / 翻覆穩定性計算機" (defaults, ranges, formulas, judgements, wording).
 * It holds NO visual design: each concept supplies its own markup, CSS and SVG drawing.
 *
 *   const app = CoG.mount({ onUpdate(ctx) {…} });
 *   app.drawing(hostEl, { margins, pivotFrac, draw(L, ctx) { return '<g>…</g>'; } });
 *
 * Declarative hooks in markup:
 *   input[data-field="tilt"]          number box   (type=number)  /  slider (type=range)
 *   [data-error-for="tilt"]           range-error message
 *   [data-action="reset|upright|critical|spec|help|help-close"]
 *   [data-mode-set="theoretical|manual"]   (aria-pressed is kept in sync)
 *   [data-v="crit.title"]  textContent    [data-vh="…"]  innerHTML
 *   [data-state-from="crit|spec"]  → sets data-state="pass|boundary|fail"
 *   dialog[data-help]  [data-help-body]
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ model */
  const DEFAULTS = Object.freeze({
    palletHeight: 153, palletWidth: 1092, cabinetHeight: 2448,
    tilt: 16, specLimitAngle: 22, mode: 'theoretical', cgHeight: 1377, cgOffset: 0,
  });
  // [min, max, step]
  const RANGE = {
    palletHeight: [0, 1000, 1], palletWidth: [100, 6000, 1], cabinetHeight: [100, 10000, 1],
    tilt: [0, 75, 0.1], specLimitAngle: [1, 60, 0.1], cgHeight: [1, 11000, 1], cgOffset: [-6000, 6000, 1],
  };
  const LABEL = {
    palletHeight: '棧板高度', palletWidth: '棧板寬度', cabinetHeight: '機櫃高度',
    tilt: '目前傾角', specLimitAngle: '規格上限角度', cgHeight: '重心高度（離地）', cgOffset: '重心左右偏移',
  };
  const SYM_HTML = {
    palletHeight: 'H<sub>p</sub>', palletWidth: 'B<sub>p</sub>', cabinetHeight: 'H<sub>c</sub>',
    tilt: 'θ', specLimitAngle: '', cgHeight: 'Zcg', cgOffset: 'Xcg',
  };
  const unitOf = (k) => (k === 'tilt' || k === 'specLimitAngle' ? '°' : 'mm');
  const rad = (d) => (d * Math.PI) / 180;

  function compute(p) {
    const { palletWidth: Bp, palletHeight: Hp, cabinetHeight: Hc, mode, tilt, specLimitAngle: spec } = p;
    const z = mode === 'theoretical' ? Hc / 2 + Hp : p.cgHeight;
    const x = mode === 'theoretical' ? 0 : p.cgOffset;
    if (![Bp, Hp, Hc, z, x, tilt].every(Number.isFinite) || Bp <= 0 || Hp < 0 || Hc <= 0 || z <= 0)
      throw new RangeError('尺寸必須有效；棧板寬度、機櫃高度與重心高度須大於零。');
    if (!Number.isFinite(spec) || spec < 1 || spec > 60) throw new RangeError('規格上限角度須介於 1.0° 與 60.0°。');
    const halfWidth = Bp / 2;
    const distance = halfWidth - x;
    const criticalAngle = (Math.atan(distance / z) * 180) / Math.PI;
    const margin = spec - criticalAngle;
    const specStatus = Math.abs(margin) <= 1e-8 ? 'boundary' : margin > 0 ? 'pass' : 'fail';
    const requiredHalfWidth = z * Math.tan(rad(spec)) + x;
    const recommendedHalfWidth = Math.max(0, Math.ceil((requiredHalfWidth - 1e-9) / 10) * 10);
    const v = tilt - criticalAngle;
    return {
      z, x, halfWidth, distance, criticalAngle, margin, specStatus,
      requiredHalfWidth, preciseRequiredWidth: 2 * requiredHalfWidth,
      recommendedHalfWidth, recommendedWidth: 2 * recommendedHalfWidth,
      stability: Math.abs(v) <= 1e-8 ? 'critical' : v < 0 ? 'stable' : 'exceeded',
    };
  }

  function specJudgement(p) {
    const margin = p.specLimitAngle - p.tilt;
    const status = Math.abs(margin) <= 1e-8 ? 'boundary' : margin > 0 ? 'pass' : 'fail';
    return { margin, status, passes: status !== 'fail' };
  }

  /* ------------------------------------------------------------- formatting */
  const se = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const signed = (n) => { const t = Number(n.toFixed(1)); return t === 0 ? '0.0' : `${t > 0 ? '+' : ''}${t.toFixed(1)}`; };
  const fieldFmt = (k, v) => (k === 'tilt' || k === 'specLimitAngle' || !Number.isInteger(v) ? v.toFixed(1) : String(v));

  function steps(P, R) {
    const specStr = se(P.specLimitAngle);
    const j = specJudgement(P);
    const o = R.x === 0 ? '' : R.x > 0 ? ` + ${se(R.x)}` : ` − ${se(-R.x)}`;
    const theo = P.mode === 'theoretical';
    return [
      { n: 1, title: '計算重心高度', extra: 'Zcg', lines: [
        { k: 'p', h: theo ? 'Zcg = 機櫃高度 H<sub>c</sub> / 2<br>＋ 棧板高度 H<sub>p</sub>' : 'Zcg = 手動重心高度<br>（已由地面起算）' },
        { k: 'sub', h: theo ? `= ${se(P.cabinetHeight)} / 2 + ${se(P.palletHeight)}` : '不再加上棧板高度' },
        { k: 'ans', h: `Zcg = ${se(R.z)} <small>mm</small>` },
      ] },
      { n: 2, title: '臨界條件', extra: `${specStr}° 規格`, lines: [
        { k: 'eq', h: `tan⁻¹(${R.x === 0 ? 'W' : '(W − Xcg)'} / Zcg)<br>= ${P.specLimitAngle.toFixed(1)}°` },
        { k: 'foot', h: '重力線通過右側支點' },
      ] },
      { n: 3, title: '解得臨界半寬', extra: 'W', lines: [
        { k: 'p', h: `W = Zcg × tan(${specStr}°)${R.x === 0 ? '' : ' + Xcg'}` },
        { k: 'sub', h: `= ${se(R.z)} × tan(${specStr}°)${o}` },
        { k: 'p', h: `≈ ${R.requiredHalfWidth.toFixed(1)} mm` },
        { k: 'ans', h: `W ≈ ${R.recommendedHalfWidth} <small>mm</small>` },
        { k: 'foot', h: '半寬向上取 10 mm' },
      ] },
      { n: 4, title: '所需棧板寬度', extra: '', lines: [
        { k: 'p', h: '棧板寬度 B<sub>p</sub> = 2W' },
        { k: 'sub', h: `精確 ≈ ${R.preciseRequiredWidth.toFixed(1)} mm` },
        { k: 'ans', h: `2W ≈ ${R.recommendedWidth} <small>mm</small>` },
        { k: 'foot', h: `工程建議：2 × ${R.recommendedHalfWidth} mm` },
      ] },
      { n: 5, title: '目前設計', extra: '現有棧板', lines: [
        { k: 'sub', h: `${se(P.palletWidth)} / 2 = ${se(R.halfWidth)} mm` },
        ...(R.x !== 0 ? [{ k: 'sub', h: `D = ${se(R.halfWidth)} − (${se(R.x)})` }] : []),
        { k: 'eq', h: `tan⁻¹(${se(R.distance)} / ${se(R.z)})<br>臨界角 θc = ${R.criticalAngle.toFixed(1)}°` },
        { k: 'foot', h: `${R.x === 0 ? '現有半寬 W' : '重心至右支點距離 D'} = ${se(R.distance)} mm` },
      ] },
      { n: 6, title: '結論', extra: '目前傾角', state: j.status === 'boundary' ? 'boundary' : j.passes ? 'pass' : 'fail', lines: [
        { k: 'p', h: `${P.specLimitAngle.toFixed(1)}° − ${P.tilt.toFixed(1)}°` },
        { k: 'ans', h: `${signed(j.margin)}°` },
        { k: 'foot', h: `目前傾角${j.status === 'boundary' ? '剛好位於' : j.passes ? '未超過' : '已超過'} ${specStr}° 規格上限` },
      ] },
    ];
  }

  function view(P, R) {
    const j = specJudgement(P);
    const critState = { stable: 'pass', critical: 'boundary', exceeded: 'fail' }[R.stability];
    const crit = {
      state: critState,
      title: { stable: '未達臨界角', critical: '已達臨界角', exceeded: '已超過臨界角' }[R.stability],
      gap: R.stability === 'critical'
        ? '目前傾角等於臨界角'
        : `${R.stability === 'stable' ? '距臨界角尚有' : '超過臨界角'} ${Math.abs(R.criticalAngle - P.tilt).toFixed(1)}°`,
      cmp: `${P.tilt.toFixed(1)}° ${R.stability === 'stable' ? '<' : R.stability === 'critical' ? '=' : '>'} ${R.criticalAngle.toFixed(1)}°`,
    };
    const spec = {
      state: j.status,
      title: `目前傾角${j.passes ? '符合規格' : '超過規格'}`,
      gap: j.status === 'boundary' ? '剛好位於規格上限' : `${j.passes ? '距規格上限尚有' : '超過規格上限'} ${Math.abs(j.margin).toFixed(1)}°`,
      cmp: `${P.tilt.toFixed(1)}° ${j.status === 'boundary' ? '=' : j.passes ? '<' : '>'} ${P.specLimitAngle.toFixed(1)}°`,
    };
    const specStr = se(P.specLimitAngle);
    const helpHTML = [
      '<p>機櫃與棧板繞棧板右下角旋轉。重力線保持世界座標鉛直，當其通過支點時達到靜態翻覆臨界條件。</p>',
      '<p>重心高度 Zcg 以直立時的地面起算；手動模式不再加棧板高度。偏移正值向右、負值向左。</p>',
      `<p>規格上限可調整，目前為 ${P.specLimitAngle.toFixed(1)}°：目前傾角不超過上限為符合，超過為不符合。餘量 = 規格上限 − 目前傾角，正數為尚有餘量，負數為已超過。此規格判讀與目前傾斜狀態分開；目前傾角超過臨界角表示靜態模型失穩，不是動態翻倒模擬。</p>`,
      '<p>機櫃側視寬度依棧板寬度示意；本模型不包含滑動、彈性變形與動態衝擊。</p>',
      `<p>所需寬度顯示 ${specStr}° 對應的反算值。半寬先向上取整至 10 mm，再乘以 2 得工程取整值；取整值本身不表示通過上限檢核。手動偏移時 W = Zcg × tan(${specStr}°) + Xcg。</p>`,
    ].join('');
    return {
      tilt: P.tilt.toFixed(1), critical: R.criticalAngle.toFixed(1), specAngle: P.specLimitAngle.toFixed(1), specShort: specStr,
      width: String(R.recommendedWidth), widthHalf: String(R.recommendedHalfWidth), widthPrecise: R.preciseRequiredWidth.toFixed(1),
      z: se(R.z), x: `${R.x > 0 ? '+' : ''}${se(R.x)}`, halfWidth: se(R.halfWidth),
      modeLabel: P.mode === 'theoretical' ? '理論置中' : '手動調整',
      cgNote: P.mode === 'manual' ? `離地 · 偏移 Xcg ${R.x > 0 ? '+' : ''}${se(R.x)} mm` : '離地 · 直立座標',
      margin: signed(j.margin), specMargin: signed(j.margin),
      critMargin: signed(R.criticalAngle - P.tilt), critMarginAbs: Math.abs(R.criticalAngle - P.tilt).toFixed(1), specMarginAbs: Math.abs(j.margin).toFixed(1),
      palletWidth: se(P.palletWidth), palletHeight: se(P.palletHeight), cabinetHeight: se(P.cabinetHeight),
      distance: se(R.distance), criticalFormula: R.x === 0 ? 'tan⁻¹(W / Zcg)' : 'tan⁻¹((W − Xcg) / Zcg)',
      crit, spec,
      message: `目前傾角${j.passes ? '未超過' : '超過'} ${specStr}° 規格上限；翻覆臨界獨立判讀。所需棧板寬度仍依臨界角對應上限反算。`,
      processSummary: `Zcg ${se(R.z)} mm · 目前傾角 ${P.tilt.toFixed(1)}° · ${signed(j.margin)}°`,
      processLead: `由重心高度，一步步驗算 ${specStr}° 規格`,
      steps: steps(P, R),
      dims: [
        ['棧板高度 H<sub>p</sub>', se(P.palletHeight)], ['棧板寬度 B<sub>p</sub>', se(P.palletWidth)],
        ['機櫃高度 H<sub>c</sub>', se(P.cabinetHeight)], ['現有半寬 W', se(R.halfWidth)],
      ],
      helpHTML,
      footA: '理論置中為早期設計篩選 · 2D 靜態模型',
      footB: '2D 靜態翻覆模型',
    };
  }

  /* ------------------------------------------------------------------ store */
  // Optional deep-link overrides, e.g. ?tilt=30  ?mode=manual&z=1500&x=-100  ?spec=25  (used for review screenshots)
  function initialState() {
    const s = { ...DEFAULTS };
    try {
      const q = new URLSearchParams(location.search);
      const map = { tilt: 'tilt', spec: 'specLimitAngle', ph: 'palletHeight', pw: 'palletWidth', ch: 'cabinetHeight', z: 'cgHeight', x: 'cgOffset' };
      Object.entries(map).forEach(([param, key]) => {
        if (q.has(param) && q.get(param) !== '' && Number.isFinite(Number(q.get(param)))) {
          const [lo, hi] = RANGE[key];
          s[key] = Math.min(hi, Math.max(lo, Number(q.get(param))));
        }
      });
      if (q.get('mode') === 'manual') s.mode = 'manual';
    } catch (e) { /* defaults */ }
    return s;
  }

  function createStore() {
    let state = initialState();
    const subs = new Set();
    const emit = () => subs.forEach((fn) => fn());
    const clampField = (k, n) => {
      const [lo, hi] = RANGE[k];
      return Math.min(hi, Math.max(lo, k === 'specLimitAngle' ? Math.round(n * 10) / 10 : n));
    };
    const api = {
      get state() { return state; },
      get result() { return compute(state); },
      subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
      set(k, n) { state = { ...state, [k]: clampField(k, n) }; emit(); },
      setCG(x, z) {
        state = {
          ...state, mode: 'manual',
          cgOffset: Math.round(Math.max(RANGE.cgOffset[0], Math.min(RANGE.cgOffset[1], x))),
          cgHeight: Math.round(Math.max(RANGE.cgHeight[0], Math.min(RANGE.cgHeight[1], z))),
        };
        emit();
      },
      setMode(mode) { const r = compute(state); state = { ...state, mode, cgHeight: r.z, cgOffset: r.x }; emit(); },
      reset() { state = { ...DEFAULTS }; emit(); },
      clamp: clampField,
    };
    return api;
  }

  /* --------------------------------------------------------------- geometry */
  const rot = (pt, pivotX, deg) => {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)), a = pt.x - pivotX;
    return { x: pivotX + a * c + pt.z * s, z: -a * s + pt.z * c };
  };
  const unrot = (pt, pivotX, deg) => {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)), a = pt.x - pivotX;
    return { x: pivotX + a * c - pt.z * s, z: a * s + pt.z * c };
  };
  const r2 = (v) => Math.round(v * 100) / 100;

  /**
   * Fit the tilted cabinet inside a viewport and expose helpers in screen space.
   * Local coordinates: x centred on the pallet (+ right), z up from the floor, mm, upright pose.
   * The cabinet+pallet tilt clockwise about the pallet's lower-right edge, which stays fixed on screen.
   */
  function layout(P, R, size, o) {
    const { w, h } = size;
    const m = Object.assign({ t: 59, r: 135, b: 96, l: 105, below: 28 }, o.margins);
    let pivotX = w * (o.pivotFrac == null ? 0.55 : o.pivotFrac);
    const floorY = h - m.b;
    const W = R.halfWidth, Hp = P.palletHeight, u = P.cabinetHeight + P.palletHeight;
    const tilt = P.tilt;
    const corners = [[-W, 0], [W, 0], [W, u], [-W, u]].map(([x, z]) => rot({ x, z }, W, tilt));
    const cgT = rot({ x: R.x, z: R.z }, W, tilt);
    const xs = [...corners.map((c) => c.x), cgT.x], zs = [...corners.map((c) => c.z), cgT.z];
    const xmin = Math.min(...xs), xmax = Math.max(...xs), zmin = Math.min(0, ...zs), zmax = Math.max(...zs);
    let T;
    if (o.autoPivot) {
      // centre the tilted body in the available width instead of pinning the pivot at a fixed fraction
      const lw = Math.max(100, W - xmin), rw = Math.max(100, xmax - W), span = Math.max(80, w - m.l - m.r);
      T = Math.max(0.001, Math.min((h - m.b - m.t) / Math.max(100, zmax), span / (lw + rw), zmin < 0 ? m.below / -zmin : Infinity));
      pivotX = m.l + (span - (lw + rw) * T) / 2 + lw * T;
    } else {
      T = Math.max(0.001, Math.min(
        (h - m.b - m.t) / Math.max(100, zmax),
        Math.max(40, pivotX - m.l) / Math.max(100, W - xmin),
        Math.max(40, w - pivotX - m.r) / Math.max(100, xmax - W),
        zmin < 0 ? m.below / -zmin : Infinity,
      ));
    }
    const map = (pt) => ({ x: pivotX + (pt.x - W) * T, y: floorY - pt.z * T });
    const L = {
      w, h, T, pivotX, floorY, W, Hp, u, tilt, margins: m,
      pivot: { x: pivotX, y: floorY },
      pt: (x, z) => map(rot({ x, z }, W, tilt)),      // local point → screen, tilted
      up: (x, z) => map({ x, z }),                      // local point → screen, upright reference
      toLocal: (sx, sy) => unrot({ x: W + (sx - pivotX) / T, z: (floorY - sy) / T }, W, tilt),
      poly: (pts) => pts.map((p) => `${r2(p.x)},${r2(p.y)}`).join(' '),
      path: (pts) => `M${pts.map((p) => `${r2(p.x)},${r2(p.y)}`).join('L')}Z`,
    };
    L.cabinet = [[-W, Hp], [W, Hp], [W, u], [-W, u]].map(([x, z]) => L.pt(x, z));   // BL BR TR TL
    L.pallet = [[-W, 0], [W, 0], [W, Hp], [-W, Hp]].map(([x, z]) => L.pt(x, z));
    L.cg = map(cgT);
    L.gravityEnd = Math.max(floorY + 22, L.cg.y + 34);
    L.arc = (r) => {
      const a = rad(tilt);
      return `M${r2(pivotX)},${r2(floorY - r)}A${r},${r} 0 0 1 ${r2(pivotX + r * Math.sin(a))},${r2(floorY - r * Math.cos(a))}`;
    };
    L.tiltPoint = (r) => ({ x: pivotX + r * Math.sin(rad(tilt)), y: floorY - r * Math.cos(rad(tilt)) });
    L.cgHit = (r = 22) => `<circle data-cg-handle cx="${r2(L.cg.x)}" cy="${r2(L.cg.y)}" r="${r}" fill="transparent" style="cursor:grab"/>`;
    return L;
  }

  /* ------------------------------------------------------------------ icons */
  const ICONS = {
    check: 'M4 12.5l5 5L20 6',
    cross: 'M5 5l14 14M19 5L5 19',
    triangle: 'M12 4.5l9 15.5H3z',
    chevron: 'M6 9l6 6 6-6',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    reset: 'M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5',
    help: 'M9.5 9a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1.9-1.1 1.8M12 17.2v.1',
  };
  function icon(name, { size = 18, stroke = 2, cap = 'round', cls = '' } = {}) {
    return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="${cap}" stroke-linejoin="${cap === 'butt' ? 'miter' : 'round'}" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
  }
  const statusIcon = (state, opts) => icon(state === 'pass' ? 'check' : state === 'boundary' ? 'triangle' : 'cross', opts);

  /* -------------------------------------------------------------- drawing */
  function createDrawing(host, getCtx, opts, store) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'cog-svg' + (opts.svgClass ? ' ' + opts.svgClass : ''));
    svg.setAttribute('role', 'img');
    svg.setAttribute('tabindex', '0');
    svg.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    host.appendChild(svg);
    let size = { w: Math.max(300, host.clientWidth || 800), h: Math.max(250, host.clientHeight || 450) };
    let L = null;

    function draw(ctx) {
      ctx = ctx || getCtx();
      L = layout(ctx.P, ctx.R, size, opts);
      svg.setAttribute('viewBox', `0 0 ${size.w} ${size.h}`);
      svg.setAttribute('aria-label', `機櫃繞右棧板邊緣傾斜的 2D 工程側視圖；重心離地 ${se(ctx.R.z)} 毫米，左右偏移 ${se(ctx.R.x)} 毫米；拖曳或以方向鍵移動重心`);
      svg.innerHTML = opts.draw(L, ctx);
    }
    new ResizeObserver((es) => {
      const r = es[0].contentRect;
      if (!Number.isFinite(r.width) || !Number.isFinite(r.height)) return;
      size = { w: Math.max(300, r.width), h: Math.max(250, r.height) };
      draw();
    }).observe(host);

    const toLocal = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      return L.toLocal(q.x, q.y);
    };
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !e.target.closest || !e.target.closest('[data-cg-handle]')) return;
      e.preventDefault();
      const { R } = getCtx(), p = toLocal(e);
      drag = { id: e.pointerId, dx: p.x - R.x, dz: p.z - R.z };
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer: keep going */ }
      svg.classList.add('dragging');
      svg.focus();
      store.setCG(R.x, R.z);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const p = toLocal(e);
      store.setCG(p.x - drag.dx, p.z - drag.dz);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => svg.addEventListener(t, (e) => {
      if (drag && drag.id === e.pointerId) { drag = null; svg.classList.remove('dragging'); }
    }));
    svg.addEventListener('keydown', (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const n = e.shiftKey ? 10 : 1, { R } = getCtx();
      store.setCG(R.x + (e.key === 'ArrowRight' ? n : e.key === 'ArrowLeft' ? -n : 0), R.z + (e.key === 'ArrowUp' ? n : e.key === 'ArrowDown' ? -n : 0));
    });
    draw();
    return { svg, draw, get L() { return L; } };
  }

  /* ------------------------------------------------------------------ mount */
  function mount(opts = {}) {
    const root = opts.root || document;
    const store = createStore();
    const drawings = [];
    const syncs = [];
    const ctx = () => { const P = store.state, R = compute(P); return { P, R, V: view(P, R), store }; };

    // fields -------------------------------------------------------------
    root.querySelectorAll('input[data-field]').forEach((input) => {
      const k = input.dataset.field;
      const [lo, hi, step] = RANGE[k];
      const isRange = input.type === 'range';
      const errEls = () => root.querySelectorAll(`[data-error-for="${k}"]`);
      const valueOf = ({ P, R }) => (k === 'cgHeight' ? R.z : k === 'cgOffset' ? R.x : P[k]);
      input.min = lo; input.max = hi;
      if (isRange) {
        input.step = step;
        input.addEventListener('input', () => store.set(k, Number((Math.round(Number(input.value) / step) * step).toFixed(6))));
        input.addEventListener('keydown', (e) => {
          if (!e.shiftKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
          e.preventDefault();
          const d = (e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 1) * step * 10;
          store.set(k, Number((valueOf(ctx()) + d).toFixed(6)));
        });
        syncs.push((c) => {
          const v = valueOf(c);
          input.value = v;
          input.style.setProperty('--pct', `${((v - lo) / (hi - lo)) * 100}%`);
          input.disabled = (k === 'cgHeight' || k === 'cgOffset') && c.P.mode === 'theoretical';
        });
      } else {
        input.step = (k === 'specLimitAngle' || opts.stepInputs) ? step : 'any';
        let editing = false, dirty = false;
        const markInvalid = (bad) => {
          if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
          errEls().forEach((el) => { el.hidden = !bad; el.textContent = bad ? `範圍 ${lo}–${hi} ${unitOf(k)}；離開欄位時修正` : ''; });
        };
        const commit = () => {
          const { P, R } = ctx();
          if (!dirty) { input.value = fieldFmt(k, valueOf({ P, R })); markInvalid(false); return; }
          dirty = false;
          const raw = input.value, n = Number(raw);
          if (raw === '' || !Number.isFinite(n)) { input.value = fieldFmt(k, valueOf({ P, R })); markInvalid(false); return; }
          store.set(k, n);
          input.value = fieldFmt(k, valueOf(ctx()));
          markInvalid(false);
        };
        input.addEventListener('focus', () => { editing = true; dirty = false; });
        input.addEventListener('input', () => {
          dirty = true;
          const raw = input.value, n = Number(raw);
          const ok = raw !== '' && Number.isFinite(n) && n >= lo && n <= hi;
          markInvalid(raw !== '' && !ok);
          if (ok) store.set(k, n);
        });
        input.addEventListener('blur', () => { editing = false; commit(); });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
        syncs.push((c) => {
          if (!editing) input.value = fieldFmt(k, valueOf(c));
          input.disabled = (k === 'cgHeight' || k === 'cgOffset') && c.P.mode === 'theoretical';
        });
      }
    });

    // actions ------------------------------------------------------------
    const helpDialog = () => root.querySelector('dialog[data-help]');
    root.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('[data-action],[data-mode-set]');
      if (e.target.matches && e.target.matches('dialog[data-help]')) { e.target.close(); return; }
      if (!a) return;
      if (a.dataset.modeSet) { store.setMode(a.dataset.modeSet); return; }
      const { P, R } = ctx();
      switch (a.dataset.action) {
        case 'reset': store.reset(); break;
        case 'upright': store.set('tilt', 0); break;
        case 'critical': store.set('tilt', R.criticalAngle); break;
        case 'spec': store.set('tilt', P.specLimitAngle); break;
        case 'help': { const d = helpDialog(); if (d && !d.open) d.showModal(); break; }
        case 'help-close': { const d = helpDialog(); if (d) d.close(); break; }
        default: break;
      }
    });

    // render pipeline ----------------------------------------------------
    const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
    function update() {
      const c = ctx();
      syncs.forEach((fn) => fn(c));
      document.documentElement.dataset.crit = c.V.crit.state;
      document.documentElement.dataset.spec = c.V.spec.state;
      document.documentElement.dataset.mode = c.P.mode;
      drawings.forEach((d) => d.draw(c));
      if (opts.onUpdate) opts.onUpdate(c);
      root.querySelectorAll('[data-v]').forEach((el) => { const v = get(c.V, el.dataset.v); if (el.textContent !== String(v)) el.textContent = v; });
      root.querySelectorAll('[data-vh]').forEach((el) => { const v = get(c.V, el.dataset.vh); if (el.innerHTML !== String(v)) el.innerHTML = v; });
      root.querySelectorAll('[data-state-from]').forEach((el) => { el.dataset.state = c.V[el.dataset.stateFrom].state; });
      root.querySelectorAll('[data-mode-set]').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.modeSet === c.P.mode)));
      root.querySelectorAll('[data-help-body]').forEach((el) => { if (el.innerHTML !== c.V.helpHTML) el.innerHTML = c.V.helpHTML; });
    }
    store.subscribe(update);
    const app = {
      store, ctx, update,
      drawing(host, o) { const d = createDrawing(host, ctx, o, store); drawings.push(d); return d; },
    };
    update();
    return app;
  }

  global.CoG = { DEFAULTS, RANGE, LABEL, SYM_HTML, unitOf, compute, specJudgement, view, steps, layout, icon, statusIcon, mount, createStore, se, signed, fieldFmt, rad, r2 };
})(window);
