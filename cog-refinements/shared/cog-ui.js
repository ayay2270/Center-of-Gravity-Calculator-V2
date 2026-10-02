/*
 * cog-ui.js — shared UI building blocks for the five refinement concepts.
 * Everything here reproduces the CURRENT production components (same icons, same labels, same engineering drawing);
 * concepts decide where they go and how they are grouped.
 */
(function (global) {
  'use strict';
  const { RANGE, LABEL, se, rad } = global.CoG;

  /* ---- production icon paths (viewBox 0 0 36 40, 1.3 stroke) --------------------------------------- */
  const ICON = {
    cabinet: 'M9 3h18v26H9z M14 3v26 M3 29h30v5H3z M6 34v4 M30 34v4',
    palletHeight: 'M4 14h28v5H4z M7 19v8h6v-8 M23 19v8h6v-8 M4 8v4 M32 8v4',
    palletWidth: 'M3 10v16 M33 10v16 M3 18h30 M8 14l-5 4 5 4 M28 14l5 4-5 4',
    cabinetHeight: 'M12 3h17v29H12z M5 3v29 M2 3h6 M2 29h6',
    tilt: 'M4 31h30 M4 31L25 6 M16 31a12 12 0 0 0-4-9',
    results: 'M4 30h28 M7 30V18h5v12 M17 30V10h5v20 M27 30V3h5v27',
    process: 'M5 3h25v31H5z M9 10h3 M17 10h8 M9 18h3 M17 18h8 M9 26h3 M17 26h8',
    cgHeight: 'M18 3v29 M13 8l5-5 5 5 M13 24l5 5 5-5',
    cgOffset: 'M3 18h30 M8 13l-5 5 5 5 M28 13l5 5-5 5',
  };
  const icon = (kind, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 36 40" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="${ICON[kind] || ICON.cabinet}"/></svg>`;
  // small UI glyphs drawn as SVG (the production uses text glyphs for these)
  const GLYPH = {
    check: 'M4.5 12.5l5 5L20 6.5', cross: 'M6 6l12 12M18 6L6 18', triangle: 'M12 5l8.5 14.5h-17z',
    chevron: 'M6 9l6 6 6-6', plus: 'M12 6v12M6 12h12', minus: 'M6 12h12', crosshair: 'M12 3v18M3 12h18',
  };
  const glyph = (name, { size = 16, stroke = 2, cls = '' } = {}) => `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${GLYPH[name]}"/></svg>`;
  const cgSymbol = (size = 20) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg>`;
  const statusMark = (size = 20) => `<span class="status-mark" style="width:${size}px;height:${size}px">${['pass', 'boundary', 'fail'].map((s) => glyph(s === 'pass' ? 'check' : s === 'boundary' ? 'triangle' : 'cross', { size: Math.round(size * .64), stroke: 2.6, cls: 'i-' + s })).join('')}</span>`;

  /* ---- input control template ---------------------------------------------------------------------- */
  const SYM = { palletHeight: 'H<sub>p</sub>', palletWidth: 'B<sub>p</sub>', cabinetHeight: 'H<sub>c</sub>', tilt: 'θ', cgHeight: 'Zcg', cgOffset: 'Xcg', specLimitAngle: '' };
  const UNIT = (k) => (k === 'tilt' || k === 'specLimitAngle' ? '°' : 'mm');
  const LABELS = { ...LABEL, cgHeight: '重心高度', cgOffset: '重心左右偏移' };
  /** opts: icon (bool), slider (bool, default true), label (override), id prefix, marks (bool: tilt reference ticks) */
  function control(field, opts = {}) {
    const id = `${opts.prefix || 'f'}-${field}`;
    const label = opts.label || LABELS[field];
    const slider = opts.slider !== false && field !== 'specLimitAngle';
    const ic = opts.icon ? icon(field === 'specLimitAngle' ? 'tilt' : field) : '';
    const sym = SYM[field] ? ` <i>${SYM[field]}</i>` : '';
    return `<div class="control control-${field}${opts.cls ? ' ' + opts.cls : ''}"${opts.cls && opts.cls.includes('inline') ? ' data-inline' : ''}>
      <div class="control-row">${ic}<label for="${id}">${label}${sym}</label>
        <div class="number-box"><input id="${id}" type="number" data-field="${field}" aria-label="${LABELS[field]}數值"><span>${UNIT(field)}</span></div></div>
      ${slider ? (() => {
        const r = `<input class="range" type="range" data-field="${field}" aria-label="${LABELS[field]}滑桿">`;
        const wrapped = opts.marks ? `<div class="range-wrap">${r}<i class="tick tick-crit" data-tick="crit" title="臨界角 θc"></i><i class="tick tick-spec" data-tick="spec" title="規格上限"></i></div>` : r;
        return wrapped + (opts.ends ? `<div class="range-ends"><span>${RANGE[field][0]}</span><span>${RANGE[field][1]}</span></div>` : '');
      })() : ''}
      <span class="field-error" data-error-for="${field}" hidden></span></div>`;
  }
  /** replace <div data-ctl="tilt" data-opts="icon,ends"> with the control markup */
  function hydrate(root = document) {
    root.querySelectorAll('[data-ctl]').forEach((el) => {
      const o = {}; (el.dataset.opts || '').split(',').filter(Boolean).forEach((k) => { const [a, b] = k.split(':'); o[a] = b === undefined ? true : (b === 'false' ? false : b); });
      if (o.slider === 'false') o.slider = false;
      const html = control(el.dataset.ctl, { prefix: el.dataset.prefix || 'f', ...o });
      el.insertAdjacentHTML('afterend', html); el.remove();
    });
    root.querySelectorAll('[data-icon]').forEach((el) => { el.outerHTML = icon(el.dataset.icon, el.dataset.cls || ''); });
    root.querySelectorAll('[data-glyph]').forEach((el) => { el.innerHTML = glyph(el.dataset.glyph, { size: Number(el.dataset.size) || 16, stroke: Number(el.dataset.stroke) || 2 }); });
    root.querySelectorAll('[data-status-mark]').forEach((el) => { el.outerHTML = statusMark(Number(el.dataset.statusMark) || 20); });
    root.querySelectorAll('[data-cgsym]').forEach((el) => { el.outerHTML = cgSymbol(Number(el.dataset.cgsym) || 20); });
  }

  /* ---- calculation cards (production markup & classes) -------------------------------------------- */
  function stepCards(V, opts = {}) {
    return V.steps.map((s) => {
      const body = s.lines.map((l) => {
        if (l.k === 'ans') return s.state ? `<strong class="equation-answer conclusion" data-state="${s.state}">${l.h}</strong>` : `<strong class="equation-answer">${l.h}</strong>`;
        const cls = { p: '', sub: 'substitution', eq: 'main-equation', foot: 'step-foot' }[l.k];
        return `<p class="${cls}">${l.h}</p>`;
      }).join('');
      return `<article class="calculation-card${opts.cls ? ' ' + opts.cls : ''}" data-step="${s.n}"><h3><b>${s.n}</b>${s.title}${s.extra ? `<small>${s.extra}</small>` : ''}</h3><div class="step-content">${body}</div></article>`;
    }).join('');
  }
  const dimsHTML = (V) => V.dims.map(([k, v]) => `<div><dt>${k}</dt><dd>${v} <small>mm</small></dd></div>`).join('');

  /* ---- the production engineering drawing, ported ------------------------------------------------- */
  /**
   * o.showDims  : draw dimension annotations (production: only while the calculation panel is open)
   * o.groups    : wrap annotation sets in <g class="g-dim|g-angle|g-cg|g-body"> so concepts can emphasise them
   */
  function drawProd(L, ctx, o = {}) {
    const { P, R, V } = ctx;
    const { w, h, T, W, floorY: S, pivot: O, cg: D, tilt, u } = L;
    const x = O.x, Hp = P.palletHeight;
    const E = (px, pz) => L.pt(px, pz);
    const me = P.palletWidth * T;
    const le = 55 / T;
    const up = [L.up(-W, 0), L.up(-W, u), L.up(W, u), L.up(W, 0)];
    const ue = E(-W - le, Hp), de = E(-W - le, u), fe = E(-W - 24 / T, 0), pe = E(-W - 24 / T, Hp);
    const bodyT = `translate(${O.x} ${O.y}) rotate(${tilt})`;
    const ge = Math.max(S + 22, D.y + 34), ge2 = ge - 12, ve = Math.max(D.y, ge - 38);
    const sin = Math.sin(rad(tilt)), cos = Math.cos(rad(tilt));
    const be = { x, y: S - 49 }, xe = { x: x + 49 * sin, y: S - 49 * cos };
    const A = { x: O.x + 49 * Math.sin(rad(tilt) / 2), y: O.y - 49 * Math.cos(rad(tilt) / 2) };
    const Se = { x: O.x + 69 * Math.sin(rad(tilt) / 2) + 12, y: O.y - 69 * Math.cos(rad(tilt) / 2) - 5 };
    const k = { x: Math.min(w - 115, D.x + 30), y: (D.y + S) / 2 + 10 };
    // label collision resolution (production only nudged one pair): CG label, angle label, gravity label, pivot label
    const box = (x, y, bw, bh) => ({ x, y, w: bw, h: bh });
    const hit = (a, b) => a.x < b.x + b.w + 4 && a.x + a.w + 4 > b.x && a.y < b.y + b.h + 2 && a.y + a.h + 2 > b.y;
    const cgLineCount = P.mode === 'manual' ? 3 : 2;
    const cgBox = box(Math.min(w - 240, D.x + 20), Math.max(24, D.y - 15) - 18, 235, 23 * (cgLineCount - 1) + 24);
    const pivBox = box(O.x + 40, O.y - 33 - 15, 100, 20);
    const pick = (cands, bw, bh, avoid) => cands.find((c) => c.x >= 6 && c.x + bw <= w - 6 && !avoid.some((a) => hit(box(c.x, c.y - 16, bw, bh), a))) || cands[0];
    const angC = [0, 26, -26, 52, -52].map((dy) => ({ x: Se.x, y: Se.y + dy })).concat([{ x: O.x - 175, y: Se.y }, { x: O.x - 175, y: Se.y + 26 }]);
    const angPos = pick(angC, 150, 22, [cgBox, pivBox]);
    Se.x = angPos.x; Se.y = angPos.y;
    const angBox = box(Se.x, Se.y - 16, 150, 22);
    const gravC = [0, 28, -28, 56, -56, 84, -84].map((dy) => ({ x: k.x, y: k.y + dy })).filter((c) => c.y > D.y + 30 && c.y < S - 8);
    const gp = pick(gravC.length ? gravC : [k], 92, 22, [cgBox, pivBox, angBox]);
    k.x = gp.x; k.y = gp.y;
    const dimLine = (a, b) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="dimension-line" marker-start="url(#dimension-arrow)" marker-end="url(#dimension-arrow)"/>`;
    const ext = [Hp, u].map((z) => { const a = E(-W, z), b = E(-W - le - 8 / T, z); return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="extension-line"/>`; }).join('');
    const cgX = Math.min(w - 240, D.x + 20), cgY = Math.max(24, D.y - 15);
    const dims = o.showDims === false ? '' : `
      <g class="${o.groups ? 'g-dim' : ''} dimensions">
        ${dimLine(ue, de)}${ext}
        <text x="${(ue.x + de.x) / 2 - 11}" y="${(ue.y + de.y) / 2 - 5}" text-anchor="end">機櫃高度 H<tspan baseline-shift="sub" font-size="10">c</tspan></text>
        ${dimLine(fe, pe)}
        <text x="${pe.x - 12}" y="${pe.y + 5}" text-anchor="end">棧板高度 H<tspan baseline-shift="sub" font-size="10">p</tspan></text>
        <g transform="${bodyT}">
          ${[-me, 0].map((px) => `<line x1="${px}" y1="11" x2="${px}" y2="70" class="extension-line"/>`).join('')}
          ${dimLine({ x: -me, y: 64 }, { x: 0, y: 64 })}
          <text x="${-me / 2}" y="85" text-anchor="middle" class="dimension-value">棧板寬度 B<tspan baseline-shift="sub" font-size="10">p</tspan></text>
          ${dimLine({ x: -me / 2, y: 38 }, { x: 0, y: 38 })}
          <text x="${-me / 4}" y="60" text-anchor="middle">現有半寬 W</text>
        </g>
      </g>`;
    return `
<defs>
  <marker id="dimension-arrow" viewBox="0 0 8 8" markerWidth="7" markerHeight="7" refX="4" refY="4" orient="auto-start-reverse"><path d="M1 4L7 1V7Z" fill="#447194"/></marker>
  <pattern id="wood" width="20" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(${tilt})"><rect width="20" height="9" fill="#e7d9bd"/><path d="M0 2h20M5 6h11" stroke="#b6a27c" stroke-width=".6"/></pattern>
  <linearGradient id="steel"><stop stop-color="#edf4f7"/><stop offset="1" stop-color="#cbdbe5"/></linearGradient>
  <pattern id="floor-hatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#92adbe" stroke-width=".8"/></pattern>
</defs>
<g class="upright-reference"><path d="M${x - me},${S}V${S - u * T}H${x}V${S}"/><line x1="${x - W * T}" x2="${x - W * T}" y1="${S}" y2="${S - u * T}"/></g>
<g><path d="M20 ${S}h${w - 40}v13H20Z" fill="url(#floor-hatch)" stroke="none"/><line x1="20" y1="${S}" x2="${w - 20}" y2="${S}" class="floor-line"/></g>
<text x="${w - 24}" y="${S + 32}" text-anchor="end" class="small-annotation">地面基準</text>
<g class="${o.groups ? 'g-body' : ''}">
  <polygon points="${L.poly(L.cabinet)}" fill="url(#steel)" class="cabinet-shape"/>
  <polygon points="${L.poly(L.pallet)}" fill="url(#wood)" class="pallet-shape"/>
  <line x1="${E(0, Hp).x}" y1="${E(0, Hp).y}" x2="${E(0, u).x}" y2="${E(0, u).y}" class="center-line"/>
  <text x="${E(0, u * 0.77).x}" y="${E(0, u * 0.77).y}" text-anchor="middle" class="cabinet-label">機櫃</text>
</g>
${dims}
<g class="${o.groups ? 'g-cg' : ''}">
  <line x1="${D.x}" y1="${D.y}" x2="${D.x}" y2="${ve + 7}" class="gravity-line"/>
  <line x1="${D.x}" y1="${ve}" x2="${D.x}" y2="${ge2 + 2}" stroke="#d43730" stroke-width="1.8" stroke-linecap="round"/>
  <polygon points="${D.x - 6},${ge2} ${D.x + 6},${ge2} ${D.x},${ge}" fill="#d43730"/>
  <text x="${k.x}" y="${k.y}" class="gravity-label">鉛直重力線</text>
</g>
<g class="${o.groups ? 'g-angle' : ''}">
  <line x1="${x}" y1="${S}" x2="${x}" y2="${S - 49 - 14}" class="angle-reference"/>
  <line x1="${x}" y1="${S}" x2="${xe.x}" y2="${xe.y}" class="angle-reference active"/>
  <path d="M${be.x},${be.y}A49,49 0 0 1 ${xe.x},${xe.y}" class="angle-arc"/>
  <path d="M${A.x},${A.y}L${Se.x - 4},${Se.y + 5}" fill="none" stroke="#d1362b" stroke-width=".8"/>
  <text x="${Se.x}" y="${Se.y}" class="angle-label">目前傾角 θ ${V.tilt}°</text>
  <g class="pivot"><circle cx="${O.x}" cy="${O.y}" r="8"/><circle cx="${O.x}" cy="${O.y}" r="2.5"/><path d="M${O.x + 10},${O.y - 5}l30,-22h82"/><text x="${O.x + 40}" y="${O.y - 33}">右側翻覆支點</text></g>
</g>
<g class="cg-handle ${o.groups ? 'g-cg' : ''}" data-cg-handle>
  <circle cx="${D.x}" cy="${D.y}" r="20" class="cg-hit-area"/>
  <line x1="${D.x - 15}" x2="${D.x + 15}" y1="${D.y}" y2="${D.y}" class="cg-cross"/><line x1="${D.x}" x2="${D.x}" y1="${D.y - 15}" y2="${D.y + 15}" class="cg-cross"/>
  <circle cx="${D.x}" cy="${D.y}" r="8.5" class="cg-point"/>
</g>
<text x="${cgX}" y="${cgY}" class="cg-label">重心 CG<tspan x="${cgX}" dy="23">重心高度 Zcg ${V.z} mm</tspan>${P.mode === 'manual' ? `<tspan x="${cgX}" dy="22">重心左右偏移 Xcg ${V.x} mm</tspan>` : ''}</text>`;
  }
  const legendHTML = '<div class="drawing-legend"><span class="red-dot"></span> CG / 重力線 <span class="pivot-dot"></span> 右側支點 <span>mm</span></div>';

  /* ---- help dialog (production copy) -------------------------------------------------------------- */
  const helpDialog = '<dialog class="help-dialog" data-help aria-label="計算模型說明"><h2>計算模型說明</h2><div data-help-body></div><button type="button" data-action="help-close">知道了</button></dialog>';

  global.UI = { icon, glyph, cgSymbol, statusMark, control, hydrate, stepCards, dimsHTML, drawProd, legendHTML, helpDialog, LABELS, SYM, UNIT };
})(window);
