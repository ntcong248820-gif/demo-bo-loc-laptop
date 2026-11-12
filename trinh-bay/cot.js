
/* Lớp ghi chú của trang trình bày, chạy sau demo.js trong từng cột. */
(function () {
  const TB = window.TB, D = window.DEMO_DATA, N = D.nodes, BAN = TB.ban;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const post = m => parent !== window && parent.postMessage(Object.assign({ tb: 1, ban: BAN }, m), '*');
  const root = document.documentElement;
  let notesOn = true;
  root.classList.add('tb-on');

  /* ---------- mở sẵn bảng Lọc, cho bảng vừa khung cột ---------- */
  const pbody = () => $('#demo-pbody');
  function ensureOpen() { if (!$('#demo-pop')) { const b = $('#demo-lockbtn'); if (b) b.click(); } }
  /* Bỏ phần không cần cho việc so bộ lọc: thanh trên, menu, banner, đường dẫn (mọi khối đứng trước hàng Lọc),
     và bài viết cuối trang. Hàng Lọc + bảng "Tất cả bộ lọc" lên sát đầu khung. */
  function trimPage() {
    let el = $('#demo-filter-root');
    while (el && el.parentElement && el !== document.body) {
      for (let s = el.previousElementSibling; s; s = s.previousElementSibling) s.style.setProperty('display', 'none', 'important');
      el = el.parentElement;
    }
    $$('article').forEach(a => a.style.setProperty('display', 'none', 'important'));
  }
  let lastW = 0;
  function reportWidth() {                              // bề ngang cần hiện: tới mép phải bảng Lọc, trang ngoài cắt phần lưới máy còn lại
    const p = $('#demo-pop'); if (!p) return;
    const w = Math.ceil(p.getBoundingClientRect().right + 16);
    if (w !== lastW) { lastW = w; post({ type: 'rong', w }); }
  }
  function fit() {
    const b = pbody(); if (!b) return;
    const top = b.getBoundingClientRect().top + scrollY;
    const foot = $('#demo-pfoot');
    const h = Math.max(240, innerHeight - top - (foot ? foot.offsetHeight : 70) - 14);
    b.style.setProperty('max-height', h + 'px', 'important');
    b.style.setProperty('padding-bottom', Math.max(10, h - 80) + 'px', 'important');   // bộ lọc cuối vẫn cuộn lên đỉnh được khi bấm để so
    reportWidth();
  }

  /* ---------- tô chip sau mỗi lần demo vẽ lại ---------- */
  const IMG = src => `<div class="w-full h-auto overflow-hidden relative" style="height: 40px; width: 40px;"><img width="40" height="40" alt="" loading="lazy" class="object-contain" src="${src}" style="width: 40px; height: 40px;"></div>`;
  const ghi = id => TB.chip[id];
  const nhomByTen = Object.fromEntries(TB.nhom.map((g, i) => [g.ten, i]));
  function decorate() {
    const b = pbody(); if (!b) return;
    for (const el of $$('[data-pnode],[data-pexp]', b)) {
      if (el.dataset.tbid || el.title === 'Bỏ chọn') continue;      // hàng "Đã chọn" giữ đúng như demo
      const id = el.dataset.pnode || el.dataset.pexp.split('|')[1];
      const g = ghi(id); if (!g) continue;
      el.dataset.tbid = id;
      el.classList.add('tb-chip');
      if (g.m) el.dataset.tbm = g.m;
      if (g.lt != null) el.insertAdjacentHTML('beforeend', `<i class="tb-ma${g.it ? ' it' : ''}">${g.lt}</i>`);   // số ở góc = lượt tìm/tháng
      if (g.anh && !el.querySelector('img')) el.insertAdjacentHTML('afterbegin', IMG(g.anh));
    }
    const wrap = b.firstElementChild;
    if (wrap) for (const bl of wrap.children) {
      if (bl.dataset.tbg) continue;
      const p = bl.firstElementChild; if (!p || p.tagName !== 'P') continue;
      const ten = (p.firstChild && p.firstChild.textContent || '').trim();
      if (ten === 'Thương hiệu') bl.dataset.tbg = 'th';
      else if (ten in nhomByTen) { bl.dataset.tbg = String(nhomByTen[ten]); if (TB.nhom[nhomByTen[ten]].cau) bl.dataset.tbgn = '1'; }
    }
    applySel();
  }
  let pend = false;
  new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; trimPage(); decorate(); fit(); placePin(); }); })
    .observe(document.body, { childList: true, subtree: true });

  /* ---------- vị trí bộ lọc trong bảng, cuộn đồng bộ ---------- */
  const blockKeys = bl => bl.dataset.tbg === 'th' ? ['Thương hiệu'] : TB.nhom[+bl.dataset.tbg].k;
  const blockPos = bl => bl.getBoundingClientRect().top - pbody().getBoundingClientRect().top + pbody().scrollTop;
  function findBlock(keys) {
    const ks = new Set(keys), bls = $$('[data-tbg]', pbody());
    const exact = bls.find(bl => blockKeys(bl).some(k => k.startsWith('ten|') && ks.has(k)));
    return exact || bls.find(bl => blockKeys(bl).some(k => ks.has(k)));
  }
  function goTo(keys, frac, smooth) {
    const b = pbody(), bl = b && findBlock(keys); if (!bl) return;
    const y = blockPos(bl) + (frac ? frac * bl.offsetHeight : -6);
    b.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
  }
  // Mỗi cột cuộn riêng (owner chốt 11/11): cuộn tay không kéo cột khác theo. Chỉ khi bấm tên bộ lọc hay chip thì các cột mới cùng cuộn tới.
  document.addEventListener('scroll', e => {
    if (e.target === pbody()) { hideHover(); placePin(); }
    else if (e.target === document) placePin();
  }, true);

  /* ---------- câu ghi chú ---------- */
  const hov = document.createElement('div'); hov.className = 'tb-bub';
  const pin = document.createElement('div'); pin.className = 'tb-bub pin';
  document.body.append(hov, pin);
  let pinFor = null;                                    // {sel: chuỗi chọn phần tử, text}
  function place(bub, el) {
    if (!el || !el.isConnected) { bub.classList.remove('show'); return; }
    const r = el.getBoundingClientRect(), b = pbody(), br = b ? b.getBoundingClientRect() : { top: 0, bottom: innerHeight };
    if (r.bottom < br.top || r.top > br.bottom) { bub.classList.remove('show'); return; }
    bub.classList.add('show');
    const w = bub.offsetWidth, h = bub.offsetHeight, gap = 8 * (+getComputedStyle(root).getPropertyValue('--k') || 2);
    let x = Math.min(Math.max(6, r.left), innerWidth - w - 6), y = r.bottom + gap;
    if (y + h > innerHeight - 4) y = r.top - gap - h;
    bub.style.left = x + 'px'; bub.style.top = y + 'px';
  }
  function showHover(el, text) { if (!notesOn || !text) return; hov.textContent = text; place(hov, el); }
  function hideHover() { hov.classList.remove('show'); }
  function pinEl() { return pinFor && $(pinFor.sel); }
  function placePin() { if (!pinFor) { pin.classList.remove('show'); return; } pin.textContent = pinFor.text; place(pin, pinEl()); }
  document.addEventListener('mouseover', e => {
    if (!notesOn) return;
    const c = e.target.closest('#demo-pbody [data-tbid]');
    if (c) return showHover(c, (ghi(c.dataset.tbid) || {}).cau);
    const h = e.target.closest('#demo-pbody [data-tbg] > p');
    if (h) { const g = TB.nhom[+h.parentElement.dataset.tbg]; return showHover(h, g && g.cau); }
    hideHover();
  });

  /* ---------- chọn chip / bộ lọc: các cột cùng mở, cùng cuộn ---------- */
  let sel = null;                                       // {keys:Set, src, id}
  function deepestMatches(keys, ten) {
    const ks = new Set(keys);
    let hit = Object.keys(TB.chip).filter(id => TB.chip[id].k.some(k => ks.has(k)) && N[id].may.length);
    const same = hit.filter(id => ten && N[id].ten.toLowerCase() === ten);   // có chip cùng tên với chip vừa bấm thì chỉ lấy chip đó
    if (same.length) hit = hit.filter(id => same.includes(id) || same.some(s => isAnc(id, s)));
    const hs = new Set(hit);
    return hit.filter(id => !N[id].con.some(c => hs.has(c)));
  }
  function topOf(id) { while (N[id].cha) id = N[id].cha; return id; }
  function isAnc(a, id) { for (let c = N[id].cha; c; c = N[c].cha) if (c === a) return true; return false; }
  function applySel() {
    $$('.tb-hl').forEach(x => x.classList.remove('tb-hl'));
    $$('.tb-hl-g').forEach(x => x.classList.remove('tb-hl-g'));
    if (!sel || !notesOn) return;
    if (sel.nhom) { const bl = findBlock(sel.keys); if (bl) bl.classList.add('tb-hl-g'); return; }
    for (const id of sel.ids) $$(`#demo-pbody [data-tbid="${CSS.escape(id)}"]`).forEach(x => x.classList.add('tb-hl'));
  }
  function openFor(ids) {                                // mở khung ▾ chứa chip đầu tiên chưa thấy trên màn hình (bản 2 cấp)
    for (const id of ids) {
      if ($(`#demo-pbody [data-pnode="${CSS.escape(id)}"]`)) return;
      const top = topOf(id);
      const ex = $$('#demo-pbody [data-pexp]').find(x => x.dataset.pexp.endsWith('|' + top));
      if (ex) {                                         // chỉ mở khung để so, không chọn: bấm chip ▾ bây giờ là lọc
        if (!ex.classList.contains('is-open')) { const [gid, id] = ex.dataset.pexp.split('|'); window.demoMoKhung ? demoMoKhung(gid, id) : ex.click(); decorate(); }
        return;
      }
    }
  }
  function onChon(m) {
    ensureOpen(); decorate();
    const ids = deepestMatches(m.keys, m.ten);
    const mine = m.ban === BAN;
    if (!mine) openFor(ids); else if (m.id && !$(`#demo-pbody [data-tbid="${CSS.escape(m.id)}"]`)) openFor([m.id]);
    sel = { keys: m.keys, ids: mine && m.id ? [m.id, ...ids.filter(x => x !== m.id)] : ids };
    decorate(); applySel();
    const want = new Set(sel.ids);                      // chip đầu tiên theo thứ tự trên màn hình (chip vừa bấm luôn đứng đầu)
    const firstId = mine && m.id && $(`#demo-pbody [data-tbid="${CSS.escape(m.id)}"]`) ? m.id
      : ($$('#demo-pbody [data-tbid]').find(el => want.has(el.dataset.tbid)) || { dataset: {} }).dataset.tbid;
    if (firstId) {
      const el = $(`#demo-pbody [data-tbid="${CSS.escape(firstId)}"]`);
      const bl = el.closest('[data-tbg]');
      if (bl) goTo(blockKeys(bl), 0, true);
      // cột vừa bấm là đang lọc: không ghim ghi chú để khỏi đè lên khung vừa mở; cột kia mới ghim
      pinFor = mine ? null : { sel: `#demo-pbody [data-tbid="${CSS.escape(firstId)}"]`, text: ghi(firstId).cau };
    } else {
      pinFor = null;
      if (m.nhomKeys) goTo(m.nhomKeys, 0, true);
    }
    hideHover();
    setTimeout(placePin, 30); setTimeout(placePin, 700);
  }
  function onNhom(m) {
    ensureOpen(); decorate();
    sel = { nhom: true, keys: m.keys };
    applySel();
    const bl = findBlock(m.keys);
    if (bl) {
      goTo(m.keys, 0, true);
      const g = bl.dataset.tbg === 'th' ? null : TB.nhom[+bl.dataset.tbg];
      pinFor = g && g.cau ? { sel: `#demo-pbody [data-tbg="${bl.dataset.tbg}"] > p`, text: g.cau } : null;
    } else pinFor = null;
    hideHover(); setTimeout(placePin, 30); setTimeout(placePin, 700);
  }
  function clearSel() { sel = null; pinFor = null; applySel(); placePin(); }

  document.addEventListener('click', e => {
    if (!notesOn || !e.isTrusted) return;
    const h = e.target.closest('#demo-pbody [data-tbg] > p');
    if (h) { const bl = h.parentElement; return post({ type: 'nhom', keys: blockKeys(bl) }); }
    // Bấm giá trị là lọc thật ở cột này (owner chốt 12/11), đồng thời cột kia cuộn tới giá trị tương ứng.
    const c = e.target.closest('#demo-pbody [data-pnode]');
    if (c && c.dataset.tbid) {
      if (c.className.includes('!border-blue-5')) return post({ type: 'bo' });   // đang chọn: bấm là bỏ chọn, thôi tô
      const bl = c.closest('[data-tbg]');
      return post({ type: 'chon', keys: ghi(c.dataset.tbid).k, id: c.dataset.tbid, ten: N[c.dataset.tbid].ten.toLowerCase(), nhomKeys: bl ? blockKeys(bl) : null });
    }
    const x = e.target.closest('#demo-pbody [data-pexp]');
    if (x && x.dataset.tbid) {
      if (x.classList.contains('is-open')) { post({ type: 'bo' }); return; }
      const bl = x.closest('[data-tbg]');
      return post({ type: 'chon', keys: ghi(x.dataset.tbid).k, id: x.dataset.tbid, ten: N[x.dataset.tbid].ten.toLowerCase(), nhomKeys: bl ? blockKeys(bl) : null });
    }
    if (e.target.closest('#demo-pbody') && !e.target.closest('a,button,input')) post({ type: 'bo' });
  }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape') post({ type: 'bo' }); });

  /* ---------- nhận lệnh từ trang ngoài ---------- */
  addEventListener('message', e => {
    const m = e.data; if (!m || !m.tb) return;
    if (m.type === 'k') {
      root.style.setProperty('--k', m.k);
      trimPage(); fit(); scrollTo(0, 0);
      placePin();
    }
    else if (m.type === 'pop') { root.style.setProperty('--popw', m.w + 'px'); fit(); placePin(); }
    else if (m.type === 'moc') root.classList.toggle('tb-moc', !!m.on);
    else if (m.type === 'ghi-chu') { notesOn = !!m.on; root.classList.toggle('tb-on', notesOn); if (!notesOn) { hideHover(); } applySel(); placePin(); }
    else if (m.type === 'chon') onChon(m);
    else if (m.type === 'nhom') onNhom(m);
    else if (m.type === 'bo') clearSel();
  });
  addEventListener('resize', () => { fit(); placePin(); });

  ensureOpen(); trimPage(); decorate(); fit();
  post({ type: 'san-sang' });
})();
