/**
 * UI 검수 측정기 — 체크리스트 10장(버튼·글자·여백·표 행 겹침)을 숫자로 잰다.
 * 브라우저에서 `await page.evaluate(UI_AUDIT)` 또는 내장 브라우저의 자바스크립트 실행으로 돌린다.
 * 폭(PC·모바일)마다 따로 돌리고, 결과가 나온 항목은 반드시 캡처로 다시 확인한다
 * (측정은 오탐이 있고, 캡처로만 보이는 깨짐도 있다).
 *
 * 돌려주는 것 (각 항목 n = 건수, ex = 예시)
 *  wrapped        : 버튼 글자가 두 줄 이상으로 꺾임
 *  small44        : 모바일(폭 768 미만)에서 누르는 영역이 44px 미만인 버튼
 *  cutByBox       : 잘림 상자(overflow) 경계에 걸려 일부만 보이는 버튼·탭
 *  offscreen      : 화면 밖으로 나간 버튼
 *  overlapButtons : 서로 겹쳐 보이는 버튼
 *  offCenter      : 버튼 안 아이콘·글자가 가운데에서 벗어남
 *  tinyText       : 12px 미만 글자
 *  inputUnder16   : 모바일에서 글자가 16px 미만인 입력 칸(iOS 에서 누르면 화면이 확대된다)
 *  siblingOverlap : 이웃한 행·칸·카드끼리 겹침 (표의 tr·td 포함)
 *  badgeOverlap   : 같은 상자 위에 띄운 배지·라벨끼리 겹침
 *  fontSizes      : 글자 크기별 개수 (기준 화면과 비교할 때 쓴다)
 * 겹침은 화면에 실제로 보이는 영역(잘림 상자 안쪽) 기준으로 계산한다.
 */
function UI_AUDIT() {
  const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && r.width > 0 && r.height > 0; };
  const lab = (el) => ((el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || el.tagName) + '').trim().replace(/\s+/g, ' ').slice(0, 24);
  // 잘림 상자(overflow 가 visible 이 아닌 조상) 안쪽에서 실제로 보이는 영역
  const visRect = (el) => {
    const r = el.getBoundingClientRect();
    let b = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const q = p.getBoundingClientRect();
        b = { l: Math.max(b.l, q.left), t: Math.max(b.t, q.top), r: Math.min(b.r, q.right), b: Math.min(b.b, q.bottom) };
      }
      p = p.parentElement;
    }
    return b;
  };
  const inter = (a, c) => ({ w: Math.min(a.r, c.r) - Math.max(a.l, c.l), h: Math.min(a.b, c.b) - Math.max(a.t, c.t) });
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
  const mobile = innerWidth < 768;
  const res = { width: innerWidth, docW: document.documentElement.scrollWidth, buttons: 0, wrapped: [], small44: [], cutByBox: [], offscreen: [], overlapButtons: [], offCenter: [], tinyText: [], inputUnder16: [], siblingOverlap: [], badgeOverlap: [], fontSizes: {} };

  const btns = [...document.querySelectorAll('button, [role=button], input[type=submit], input[type=button], a')].filter(vis);
  res.buttons = btns.length;
  for (const b of btns) {
    const r = b.getBoundingClientRect();
    const s = getComputedStyle(b);
    const v = visRect(b);
    const isBtn = b.tagName !== 'A' || s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderTopWidth) > 0;
    const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4;
    const own = ownText(b);
    if (isBtn && own.length) {
      const tops = [];
      for (const n of own) { const rg = document.createRange(); rg.selectNodeContents(n); for (const x of rg.getClientRects()) tops.push(x.top); }
      if (tops.length && Math.max(...tops) - Math.min(...tops) > lh * 0.6) res.wrapped.push(lab(b));
    }
    if (mobile && isBtn && (r.height < 44 || r.width < 44) && !b.querySelector('img,video')) res.small44.push(`${lab(b)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    const vw = v.r - v.l;
    const vh = v.b - v.t;
    if (isBtn && vw > 0 && vh > 0 && (vw < r.width - 1 || vh < r.height - 1)) res.cutByBox.push(`${lab(b)} 보임 ${Math.round(vw)}/${Math.round(r.width)}`);
    if (vw > 0 && (v.l < -1 || v.r > document.documentElement.clientWidth + 1)) res.offscreen.push(lab(b));
    const kids = [...b.children].filter(vis);
    if (kids.length === 1 && !own.length && (kids[0].tagName === 'svg' || kids[0].tagName === 'IMG')) {
      const k = kids[0].getBoundingClientRect();
      const dx = (k.left + k.width / 2) - (r.left + r.width / 2);
      const dy = (k.top + k.height / 2) - (r.top + r.height / 2);
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) res.offCenter.push(`${lab(b)} 아이콘 dx${dx.toFixed(1)} dy${dy.toFixed(1)}`);
    }
    if (own.length && b.tagName === 'BUTTON' && !kids.length) {
      const rg = document.createRange();
      rg.selectNodeContents(b);
      const t = rg.getBoundingClientRect();
      const dx = (t.left + t.width / 2) - (r.left + r.width / 2);
      const dy = (t.top + t.height / 2) - (r.top + r.height / 2);
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1.5) res.offCenter.push(`${lab(b)} 글자 dx${dx.toFixed(1)} dy${dy.toFixed(1)}`);
    }
  }

  const realBtns = btns.filter((b) => b.tagName !== 'A' || getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)').slice(0, 160);
  const rects = realBtns.map(visRect);
  for (let i = 0; i < realBtns.length; i += 1) {
    for (let j = i + 1; j < realBtns.length; j += 1) {
      if (realBtns[i].contains(realBtns[j]) || realBtns[j].contains(realBtns[i])) continue;
      const o = inter(rects[i], rects[j]);
      if (o.w > 2 && o.h > 2) res.overlapButtons.push(`${lab(realBtns[i])} ↔ ${lab(realBtns[j])} ${Math.round(o.w)}x${Math.round(o.h)}`);
    }
  }

  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const s = getComputedStyle(el);
    if (ownText(el).length) {
      const fs = Math.round(parseFloat(s.fontSize) * 10) / 10;
      res.fontSizes[fs] = (res.fontSizes[fs] || 0) + 1;
      if (fs < 12) res.tinyText.push(`${fs}px ${lab(el)}`);
    }
    if (mobile && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && parseFloat(s.fontSize) < 16) res.inputUnder16.push(`${s.fontSize} ${el.getAttribute('placeholder') || el.name || el.tagName}`);
    const children = [...el.children].filter(vis);
    const isFloat = (c) => /(absolute|fixed)/.test(getComputedStyle(c).position);
    // 이웃한 행·칸·카드(흐름 안 요소)끼리 겹침
    const flow = children.filter((c) => !isFloat(c));
    for (let i = 0; i < flow.length - 1; i += 1) {
      const o = inter(visRect(flow[i]), visRect(flow[i + 1]));
      if (o.w > 1.5 && o.h > 1.5) res.siblingOverlap.push(`${el.tagName}.${(el.className + '').slice(0, 18)}: ${lab(flow[i])} ↔ ${lab(flow[i + 1])} ${Math.round(o.w)}x${Math.round(o.h)}`);
    }
    // 같은 상자 위에 띄운 배지·라벨(글자가 있는 띄운 요소)끼리 겹침
    const badges = children.filter((c) => isFloat(c) && (c.innerText || '').trim());
    for (let i = 0; i < badges.length; i += 1) {
      for (let j = i + 1; j < badges.length; j += 1) {
        const o = inter(visRect(badges[i]), visRect(badges[j]));
        if (o.w > 1.5 && o.h > 1.5) res.badgeOverlap.push(`${lab(badges[i])} ↔ ${lab(badges[j])} ${Math.round(o.w)}x${Math.round(o.h)}`);
      }
    }
  }

  const cut = (a, n = 6) => ({ n: a.length, ex: [...new Set(a)].slice(0, n) });
  for (const k of ['wrapped', 'small44', 'cutByBox', 'offscreen', 'overlapButtons', 'offCenter', 'tinyText', 'inputUnder16', 'siblingOverlap', 'badgeOverlap']) res[k] = cut(res[k]);
  return res;
}

if (typeof module !== 'undefined') module.exports = { UI_AUDIT };
