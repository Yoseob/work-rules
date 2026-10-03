/**
 * 글자·UI 깨짐 자동 검사 — Playwright 에서 `await page.evaluate(TEXT_LAYOUT_CHECK, '#검사할-영역')` 으로 돌린다.
 * (파일을 읽어 문자열로 넘기거나 require 후 함수로 넘긴다. 결과가 빈 배열이면 통과)
 *
 * 잡는 것 (2026-09-29 — 좁은 폰에서 "내 다른 세미나"가 카드 밖으로 삐져나간 사고 이후)
 *  1. overflow  : 요소가 가장 가까운 테두리·배경 있는 상자(카드·칸) 밖으로 나감
 *  2. clipped   : 글자가 자기 칸보다 넓어 잘림(scrollWidth > clientWidth, overflow hidden/ellipsis 의도 제외)
 *  3. orphan    : 여러 줄 글에서 마지막 줄이 한두 글자뿐(예: "외부에 / 서", "남 / 아요")
 *  4. midword   : 한 단어(띄어쓰기 없는 덩어리)가 두 줄로 쪼개짐 — 한국어 어절 중간 줄바꿈
 *  5. page      : 페이지 가로 스크롤(문서 폭 > 화면 폭)
 * 의도된 말줄임(text-overflow: ellipsis, line-clamp)은 clipped 에서 뺀다.
 */
function TEXT_LAYOUT_CHECK(rootSelector) {
  const root = rootSelector ? document.querySelector(rootSelector) : document.body;
  if (!root) return [{ type: 'root', text: `검사 영역 없음: ${rootSelector}` }];
  const out = [];
  const px = (v) => parseFloat(v) || 0;
  const label = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const visible = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  // 테두리나 배경이 있는 가장 가까운 상자 = 눈에 보이는 "칸"
  const boxOf = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const s = getComputedStyle(p);
      const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some((d) => px(s[`border${d}Width`]) > 0 && s[`border${d}Style`] !== 'none');
      const hasBg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
      if (hasBorder || hasBg) return p;
      p = p.parentElement;
    }
    return null;
  };
  const els = [root, ...root.querySelectorAll('*')].filter(visible);
  for (const el of els) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    // 1. 상자 밖으로
    const box = boxOf(el);
    if (box && hasOwnText) {
      const b = box.getBoundingClientRect();
      const bs = getComputedStyle(box);
      const inner = { left: b.left + px(bs.borderLeftWidth), right: b.right - px(bs.borderRightWidth) };
      if (r.right > inner.right + 1 || r.left < inner.left - 1) out.push({ type: 'overflow', text: label(el), by: Math.round(Math.max(r.right - inner.right, inner.left - r.left)) });
    }
    // 2. 잘림
    const intended = s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none' && s.webkitLineClamp !== undefined && s.webkitLineClamp !== '';
    if (hasOwnText && !intended && el.scrollWidth > el.clientWidth + 1 && (s.overflowX === 'hidden' || s.overflow === 'hidden')) out.push({ type: 'clipped', text: label(el), by: el.scrollWidth - el.clientWidth });
    // 3·4. 줄바꿈 모양 — 글자 노드마다 줄을 나눠 본다
    if (hasOwnText && s.whiteSpace !== 'nowrap') {
      for (const node of el.childNodes) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        const text = node.textContent;
        const range = document.createRange();
        const lines = new Map();
        for (let i = 0; i < text.length; i += 1) {
          if (/\s/.test(text[i])) continue;
          range.setStart(node, i); range.setEnd(node, i + 1);
          const rect = range.getClientRects()[0];
          if (!rect) continue;
          const key = Math.round(rect.top);
          const line = lines.get(key) || { text: '', start: i, end: i };
          line.text += text[i];
          line.end = i;
          lines.set(key, line);
        }
        const ordered = [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, t]) => t);
        if (ordered.length >= 2) {
          const last = ordered[ordered.length - 1].text.replace(/[.,!?)\]·]/g, '');
          if (last.length > 0 && last.length <= 2) out.push({ type: 'orphan', text: label(el), last: ordered[ordered.length - 1].text });
          // 어절 중간 줄바꿈: 줄 끝 글자와 다음 줄 첫 글자가 원문에서 공백 없이 붙어 있으면
          for (let li = 0; li < ordered.length - 1; li += 1) {
            // 같은 글자가 반복될 때 indexOf 로 역추적하면 다른 어절을 잘못 찾는다.
            // 실제 Range 에서 기록한 원문 위치 사이에 공백이 있는지 확인한다.
            const line = ordered[li];
            const next = ordered[li + 1];
            const endChar = text[line.end];
            const between = text.slice(line.end + 1, next.start);
            if (!/\s/.test(between) && !/[·,/)\]-]/.test(endChar) && !/[·,/]/.test(text[next.start])) {
              out.push({ type: 'midword', text: label(el), at: `${line.text.slice(-4)} / ${next.text.slice(0, 4)}` });
              break;
            }
          }
        }
      }
    }
  }
  if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push({ type: 'page', text: '페이지 가로 스크롤', by: document.documentElement.scrollWidth - window.innerWidth });
  // 같은 문구 중복 제거
  const seen = new Set();
  return out.filter((o) => { const k = o.type + o.text; if (seen.has(k)) return false; seen.add(k); return true; });
}

if (typeof module !== 'undefined') module.exports = { TEXT_LAYOUT_CHECK };
