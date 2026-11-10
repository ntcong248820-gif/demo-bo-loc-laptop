/* Demo bộ lọc 3 cấp trang /laptop, nhái đúng cách trang Hãng làm với dòng sản phẩm.
 *
 * Cách trang Hãng làm (đã đo trên laptop-asus và laptop-asus-vivobook):
 *  - Bấm một nút (Asus, VivoBook...) là CHUYỂN SANG TRANG RIÊNG của nút đó (địa chỉ mới, tải lại trang).
 *  - Trang đó: dòng 1 có nút Lọc, mỗi cấp đã chọn là một chip ("Asus ✕", "VivoBook ✕"), "Xóa tất cả".
 *    Dòng 2 là MỘT hàng nút trắng viền xám: nút con của trang đang đứng. Trang không có nút con
 *    (như VivoBook) thì hàng là các nút cùng cấp, nút đang đứng viền + chữ xanh.
 * Bộ lọc 3 cấp làm y vậy: RTX 50 series là một trang, trên đó hiện hàng RTX 5050, 5060, 5070...
 * Bảng "Tất cả bộ lọc" chỉ có nút cấp 1; chọn xong bấm Xem kết quả cũng chuyển sang trang mới.
 * Nút hết máy tự ẩn. Thêm ?hien-nut-trong=1 vào địa chỉ để xem cả nút chưa có máy (hiện mờ).
 *
 * Địa chỉ trang: index.html?l=laptop-rtx-50-series (nhiều nút cách nhau dấu phẩy), &h=hãng, &gia=từ-đến (triệu).
 * Tên lớp CSS là của chính web (Tailwind), chép từ trang thật, nên giao diện giống 100%.
 */
(function () {
  const D = window.DEMO_DATA;
  const P = D.products;
  const N = D.nodes;
  const ORDER = Object.keys(N);
  const POS = Object.fromEntries(ORDER.map((k, i) => [k, i]));
  const SET = {};
  for (const k of ORDER) SET[k] = new Set(N[k].may);
  const BRAND_SET = D.brands.map(b => new Set(b.may));
  const SHOW_EMPTY = new URLSearchParams(location.search).has('hien-nut-trong');

  const prices = P.map(p => p.price).filter(Boolean);
  const PRICE_MIN = Math.floor(Math.min(...prices) / 1e6) * 1e6;
  const PRICE_MAX = Math.ceil(Math.max(...prices) / 1e6) * 1e6;
  const STEPS = (PRICE_MAX - PRICE_MIN) / 1e6;

  const state = { sel: [], brands: [], pmin: PRICE_MIN, pmax: PRICE_MAX, sort: 'hot', priceDir: 'asc', shown: 20 };
  let pending = null;
  let popOpen = false;

  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = v => (v == null ? '' : v.toLocaleString('vi-VN') + 'đ');
  const IMG = 'https://img.tgdd.vn/imgt/ecom/f_webp,fit_outside,quality_100,s_448x448/';

  /* ---------- logic lọc ---------- */
  const kids = id => N[id].con;
  const hasKids = id => N[id].con.length > 0;
  const visible = id => SHOW_EMPTY || N[id].may.length > 0;
  const visKids = id => kids(id).filter(visible);
  const descendants = id => kids(id).flatMap(c => [c, ...descendants(c)]);

  function toggleNode(st, id) {
    if (!N[id]) return;
    if (N[id].may.length === 0 && !st.sel.includes(id)) return;
    if (st.sel.includes(id)) {
      const drop = new Set([id, ...descendants(id)]);
      st.sel = st.sel.filter(x => !drop.has(x));
    } else {
      st.sel.push(id);
    }
  }

  function filterIdx(st) {
    const S = new Set(st.sel);
    const byGroup = {};
    for (const id of st.sel) {
      if (N[id].con.some(c => S.has(c))) continue;               // chỉ lấy nút sâu nhất của nhánh
      (byGroup[N[id].nhom] = byGroup[N[id].nhom] || []).push(id);
    }
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const pr = P[i].price;
      if (pr != null && (pr < st.pmin || pr > st.pmax)) continue;
      if (st.brands.length && !st.brands.some(b => BRAND_SET[b].has(i))) continue;
      let ok = true;
      for (const g in byGroup) {
        if (!byGroup[g].some(id => SET[id].has(i))) { ok = false; break; }
      }
      if (ok) out.push(i);
    }
    return out;
  }

  function sortIdx(idx) {
    const a = idx.slice();
    if (state.sort === 'sell') a.sort((x, y) => P[y].soldN - P[x].soldN);
    else if (state.sort === 'new') a.sort((x, y) => Number(P[y].id) - Number(P[x].id));
    else if (state.sort === 'pct') a.sort((x, y) => (P[y].pct || 0) - (P[x].pct || 0));
    else if (state.sort === 'price') a.sort((x, y) => state.priceDir === 'asc' ? (P[x].price || 1e12) - (P[y].price || 1e12) : (P[y].price || 0) - (P[x].price || 0));
    return a;
  }

  const priceActive = st => st.pmin > PRICE_MIN || st.pmax < PRICE_MAX;
  const anyFilter = st => st.sel.length || st.brands.length || priceActive(st);

  /* ---------- địa chỉ từng trang: mỗi nút là một trang riêng ---------- */
  const ascii = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const SLUG = {}, BY_SLUG = {};
  for (const id of ORDER) {                                 // laptop-rtx-50-series; trùng tên thì ghép thêm tên nút cha
    let chain = [id], cand = 'laptop-' + ascii(N[id].ten), p = N[id].cha;
    while (BY_SLUG[cand] && p) { chain.unshift(p); cand = 'laptop-' + chain.map(c => ascii(N[c].ten)).join('-'); p = N[p].cha; }
    SLUG[id] = cand; BY_SLUG[cand] = id;
  }
  const deepest = sel => { const S = new Set(sel); return sel.filter(id => !N[id].con.some(c => S.has(c))).sort((a, b) => POS[a] - POS[b]); };
  const withAncestors = ids => { const S = new Set(); for (const id of ids) for (let c = id; c; c = N[c].cha) S.add(c); return [...S].sort((a, b) => POS[a] - POS[b]); };
  function urlFor(st) {
    const q = new URLSearchParams();
    const deep = deepest(st.sel);
    if (deep.length) q.set('l', deep.map(id => SLUG[id]).join(','));
    if (st.brands.length) q.set('h', st.brands.map(b => ascii(D.brands[b].ten)).join(','));
    if (priceActive(st)) q.set('gia', `${st.pmin / 1e6}-${st.pmax / 1e6}`);
    if (SHOW_EMPTY) q.set('hien-nut-trong', '1');
    const s = q.toString().replace(/%2C/g, ',');
    return location.pathname + (s ? '?' + s : '');
  }
  const cloneSt = () => ({ sel: [...state.sel], brands: [...state.brands], pmin: state.pmin, pmax: state.pmax });
  function removeNode(st, id) {                              // bỏ nút và mọi nút con của nó
    const drop = new Set([id, ...descendants(id)]);
    st.sel = st.sel.filter(x => !drop.has(x));
    return st;
  }
  function stateAfterClick(c) {                              // bấm nút c trong hàng nút / hàng nhanh
    const st = cloneSt();
    if (st.sel.includes(c)) return removeNode(st, c);        // bấm lại nút đang đứng thì lùi về trang của nút cha
    const p = N[c].cha;
    if (p) for (const d of descendants(p)) st.sel = st.sel.filter(x => x !== d);   // đổi sang nút cùng cấp
    st.sel = withAncestors([...st.sel, c]);
    return st;
  }
  /* Hàng nút dưới thanh lọc: với mỗi nhánh đang đứng, nếu nút sâu nhất có nút con thì hàng là nút con của nó,
     nếu không thì hàng là các nút cùng cấp của nó (nút đang đứng viền xanh), y như trang dòng sản phẩm của Hãng. */
  function rowOwners(st) {
    const owners = [];
    for (const d of deepest(st.sel)) {
      const o = visKids(d).length ? d : (N[d].cha && visKids(N[d].cha).length ? N[d].cha : null);
      if (o && !owners.includes(o)) owners.push(o);
    }
    return owners;
  }

  /* ---------- ghi chú thay đổi so với bộ lọc hiện tại trên web: hiện ngay trên nút để người xem thấy luôn ---------- */
  const webName = w => w.split('|').pop();
  function change(id) {                                      // nút này khác web hiện tại ra sao (null = giữ nguyên)
    const n = N[id], src = (n.web || []).map(webName);
    if (n.de_xuat === 'Gộp') return { k: 'gop', tag: 'Gộp', text: 'Gộp từ: ' + src.join(', ') };
    if (n.de_xuat === 'Tách') return { k: 'tach', tag: 'Tách', text: 'Tách từ: ' + src.join(', ') };
    if (n.de_xuat === 'Thêm mới') return { k: 'moi', tag: 'Mới', text: 'Nút mới, web chưa có' };
    if (n.de_xuat === 'Nhóm') return { k: 'moi', tag: 'Mới', text: 'Nút nhóm mới, gom các nút con' };
    if (n.de_xuat === 'Giữ' && src.length === 1 && ascii(src[0]) !== ascii(n.ten)) return { k: 'doi', tag: 'Đổi tên', text: 'Đổi tên từ: ' + src[0] };
    return null;
  }
  const tagHtml = c => `<span class="demo-tag demo-tag-${c.k}">${c.tag}</span>`;
  function nutLabel(id) {                                    // chỉ tên nút; ghi chú nằm ở góc nút (hasNote), không làm đổi kích thước nút
    return `<span class="">${esc(N[id].ten)}</span>`;
  }
  function noteAttr(id) {                                    // thêm vào thẻ <a> của nút: lớp + nhãn góc + chữ ghi chú, toàn bộ nằm đè lên, không chiếm chỗ
    const c = change(id);
    if (!c) return { cls: '', inner: '' };
    return { cls: ' demo-has-note', inner: `<i class="demo-corner demo-corner-${c.k}" data-note="${esc(c.text)}">${c.tag}</i>` };
  }
  function groupNote(g) {                                    // bộ lọc này lấy từ bộ lọc nào trên web
    if (g.nhan) return `<span class="demo-gnote">${tagHtml({ k: g.nhan.k, tag: { tach: 'Tách', gop: 'Gộp', doi: 'Đổi tên', moi: 'Mới' }[g.nhan.k] })} ${esc(g.nhan.text)}</span>`;
    const w = g.web_cu || [];
    if (w.length > 1) return `<span class="demo-gnote">${tagHtml({ k: 'gop', tag: 'Gộp' })} Gộp từ ${w.length} bộ lọc: ${esc(w.join(', '))}</span>`;
    if (w.length === 1 && ascii(w[0]) !== ascii(g.ten)) return `<span class="demo-gnote">${tagHtml({ k: 'doi', tag: 'Đổi tên' })} Đổi tên từ: ${esc(w[0])}</span>`;
    return '';
  }
  function mountNoteBar() {
    const ban = D.ban === 'tinh-gon' ? 'Demo bản tinh gọn bộ lọc hiện có (1 cấp)' : 'Demo bản 3 cấp';
    const link = D.so_sanh ? `<a href="${esc(D.so_sanh)}">So sánh với bộ lọc hiện tại →</a>` : '';
    document.body.insertAdjacentHTML('afterbegin', `<div id="demo-notebar"><b>${ban}</b>
      <span class="demo-leg">So với bộ lọc hiện tại trên web: ${tagHtml({ k: 'gop', tag: 'Gộp' })} nhiều nút thành 1 ${tagHtml({ k: 'tach', tag: 'Tách' })} 1 nút thành nhiều ${tagHtml({ k: 'doi', tag: 'Đổi tên' })} ${tagHtml({ k: 'moi', tag: 'Mới' })} nút thêm mới.${D.co_nhan_nhom ? ` ${tagHtml({ k: 'xo', tag: 'Nhãn nhóm' })} chữ gom các nút bên cạnh, không bấm được, không có trang riêng.` : ''} Nhãn nhỏ mờ ở góc nút, rê chuột vào nút để đọc chi tiết. Nút không có nhãn là giữ nguyên.</span>
      <label><input type="checkbox" id="demo-notetoggle" checked> Hiện ghi chú</label>${link}</div>`);
    $('#demo-notetoggle').addEventListener('change', e => document.body.classList.toggle('demo-hide-notes', !e.target.checked));
  }

  /* ---------- mẫu giao diện chép từ web thật ---------- */
  const VALUE_CLS = '!border-gray-1 !text-black-7  flex items-center border !bg-white gap-1 rounded-8px px-3 py-2';
  const VALUE_ON = '!border-blue-5 !text-blue-5  flex items-center border !bg-white gap-1 rounded-8px px-3 py-2';
  const ROW_CLS = '!border-gray-1 !text-black-7 flex shrink-0 items-center border !bg-white gap-1 rounded-8px px-3 py-2 whitespace-nowrap';
  const ROW_ON = '!border-blue-5 !text-blue-5 flex shrink-0 items-center border !bg-white gap-1 rounded-8px px-3 py-2 whitespace-nowrap';
  const faded = id => (N[id].may.length === 0 ? ' style="opacity:.45;cursor:not-allowed"' : '');

  /* ---------- thanh lọc + hàng nút cấp con ---------- */
  function renderBar() {
    const root = $('#demo-filter-root');
    const st = state;
    const active = anyFilter(st);
    const S = new Set(st.sel);
    const lockCls = 'rounded-8px text-14 px-3 py-2 whitespace-nowrap cursor-pointer relative border bg-white' +
      (active ? ' border-primary-600 bg-primary-25' : '') + (popOpen ? ' z-[1001]' : '');
    let h = `<div class="gap-10px flex"><div class="relative" id="demo-pop-wrap">
      <div class="${lockCls}" id="demo-lockbtn"><i class="${active ? 'icon__row-4-col-2' : 'icon__row-4-col-1'}"></i>Lọc</div></div>`;
    if (!active) {
      h += '<div class="w-full flex" style="gap:8px">' + D.quick.map(q => {
        const href = q.kieu === 'hang'
          ? urlFor({ sel: [], brands: [q.hang], pmin: PRICE_MIN, pmax: PRICE_MAX })
          : urlFor({ sel: withAncestors([q.nut]), brands: [], pmin: PRICE_MIN, pmax: PRICE_MAX });
        return q.kieu === 'hang'
          ? `<a class="bg-grey-100 gap-4px px-6px rounded-8px flex h-9 shrink-0 cursor-pointer items-center" href="${esc(href)}"><div class="w-full h-auto overflow-hidden relative" style="height:20px"><img src="${esc(q.anh)}" height="20" alt="${esc(q.ten)}" class="object-contain" style="height:20px"/></div></a>`
          : `<a class="bg-grey-100 gap-4px px-6px rounded-8px flex h-9 shrink-0 cursor-pointer items-center" href="${esc(href)}"><div class="icon__row-5-col-18 shrink-0"></div><span>${esc(q.ten)}</span></a>`;
      }).join('') + '</div>';
    } else {
      const chip = (label, href) => `<a class="  !bg-gray-0 !text-black-7 !text-13 rounded-8px shrink-0 px-3 py-2 cursor-pointer" href="${esc(href)}">${esc(label)} ✕</a>`;
      const rest = () => ({ sel: [...st.sel], brands: [...st.brands], pmin: st.pmin, pmax: st.pmax });
      h += '<div class="flex-wrap gap-10px flex items-center">';
      st.brands.forEach(b => { const s = rest(); s.brands = s.brands.filter(x => x !== b); h += chip(D.brands[b].ten, urlFor(s)); });
      if (priceActive(st)) { const s = rest(); s.pmin = PRICE_MIN; s.pmax = PRICE_MAX; h += chip(`${money(st.pmin)} - ${money(st.pmax)}`, urlFor(s)); }
      for (const id of st.sel) h += chip(N[id].ten, urlFor(removeNode(rest(), id)));      // bỏ chip nào thì bỏ cả nhánh con của nó
      h += `<a class="text-13 text-blue-5 shrink-0 cursor-pointer" href="${esc(urlFor({ sel: [], brands: [], pmin: PRICE_MIN, pmax: PRICE_MAX }))}">Xóa tất cả</a></div>`;
    }
    h += '</div>';
    // một hàng nút cho mỗi nhánh đang đứng, y như hàng dòng sản phẩm của trang Hãng
    for (const owner of rowOwners(st)) {
      h += '<div class="w-full flex-wrap gap-10px no-scrollbar flex pt-2">' + visKids(owner).map(c => {
        const on = S.has(c);
        const href = N[c].may.length ? ` href="${esc(urlFor(stateAfterClick(c)))}"` : '';
        return `<a class="${(on ? ROW_ON : ROW_CLS) + noteAttr(c).cls}"${href}${faded(c)}>${nutLabel(c)}${noteAttr(c).inner}</a>`;
      }).join('') + '</div>';
    }
    root.innerHTML = h;
    if (popOpen) mountPopup();
  }

  /* ---------- bảng "Tất cả bộ lọc" (chỉ nút cấp 1) ---------- */
  const NHU_CAU_ANH = { 'laptop-ai': 'Laptop AI', 'gaming': 'Gaming', 'văn-phòng': 'Học tập, văn phòng', 'sinh-viên': 'Học tập, văn phòng', 'đồ-hoạ': 'Đồ hoạ', 'kỹ-thuật': 'Kỹ thuật', 'mỏng-nhẹ': 'Mỏng nhẹ', 'cao-cấp': 'Cao cấp' };
  function valueBtn(id, on, withImg) {
    const src = withImg ? D.anhNhuCau[NHU_CAU_ANH[id.split('/').pop()]] : '';
    const img = src ? `<div class="w-full h-auto overflow-hidden relative" style="height: 40px; width: 40px;"><img width="40" height="40" alt="" loading="lazy" class="object-contain" src="${esc(src)}" style="width: 40px; height: 40px;"></div>` : '';
    return `<a class="${(on ? VALUE_ON : VALUE_CLS) + noteAttr(id).cls}" data-pnode="${esc(id)}"${faded(id)}>${img}${nutLabel(id)}${noteAttr(id).inner}</a>`;
  }
  /* nhãn nhóm: chữ gom 2 đến 3 nút khác thông số (Bàn phím, Bảo mật). Không bấm được, không có trang riêng;
     các nút đứng cạnh nhãn là nút cấp 1, luôn hiện sẵn, mỗi nút một trang. */
  function groupChips(g, S) {
    const ids = g.nut.filter(visible), seen = new Set();
    let out = '';
    for (const id of ids) {
      const lab = N[id].nhan_nhom;
      if (!lab) { out += valueBtn(id, S.has(id), g.ten === 'Nhu cầu sử dụng'); continue; }
      if (seen.has(lab)) continue;
      seen.add(lab);
      out += `<div class="demo-grp" title="Nhãn nhóm: chỉ là chữ gom các nút, không bấm được, không có trang riêng. Các nút bên cạnh là nút có trang riêng."><span class="demo-grplab">${esc(lab)}</span>` +
        ids.filter(x => N[x].nhan_nhom === lab).map(x => valueBtn(x, S.has(x), false)).join('') + '</div>';
    }
    return out;
  }
  function popupBody(st) {
    const S = new Set(st.sel);
    let h = '<div class="gap-8px flex flex-col"><div><p class="text-16 font-700 my-2">Thương hiệu</p><div class="gap-10px grid grid-cols-4 md:grid-cols-6">' +
      D.brands.map((b, i) => `<a class="${st.brands.includes(i) ? '!border-blue-5' : '!border-gray-1'} !text-black-7  h-40px flex items-center justify-center overflow-hidden rounded-8px border !bg-white p-1" data-pbrand="${i}"><div class="w-full h-auto overflow-hidden relative !w-full flex items-center justify-center" style="height: 30px; width: 100%;"><img height="30" alt="${esc(b.ten)}" class="!w-full object-contain" src="${esc(b.logo)}" style="width: 100%; height: 30px;"></div></a>`).join('') + '</div></div>';
    D.groups.forEach(g => {
      h += `<div><p class="text-16 font-700 my-2">${esc(g.ten)}${groupNote(g)}</p><div class="gap-10px flex flex-wrap items-center">` + groupChips(g, S) + '</div>';
      if (g.ten === 'Mức giá') {
        const lo = (st.pmin - PRICE_MIN) / 1e6, hi = (st.pmax - PRICE_MIN) / 1e6;
        h += `<div class="mt-10px gap-8px flex flex-col"><div class="gap-10px  grid grid-cols-[max-content_400px]">
          <p class="text-blue-5 flex-1"><i class="icon__row-4-col-21 mr-5px"></i>Hoặc chọn mức giá phù hợp với bạn</p>
          <div class="w-full rounded-md border border-transparent bg-white"><div class="my-16px h-4px bg-gray-1 relative cursor-pointer rounded">
            <div class="h-4px bg-blue-5 absolute rounded" id="demo-bar" style="left: ${lo / STEPS * 100}%; right: ${100 - hi / STEPS * 100}%;"></div>
            <input min="0" max="${STEPS}" step="1" class="absolute w-full appearance-none" type="range" value="${lo}" id="demo-pmin" style="z-index: 4;">
            <input min="0" max="${STEPS}" step="1" class="absolute w-full appearance-none" type="range" value="${hi}" id="demo-pmax" style="z-index: 3;"></div>
            <div class="pt-4px flex justify-between text-sm">
              <p class="border-gray-1 p-10px rounded-8px flex items-baseline border"><input readonly class="!text-black-7 w-60px border-none bg-transparent text-right outline-none" id="demo-vmin" value="${Math.round(st.pmin / 1000).toLocaleString('vi-VN')}"><span style="color: rgb(189, 189, 189);">.000đ</span></p>
              <p class="border-gray-1 p-10px rounded-8px flex items-baseline border"><input readonly class="!text-black-7 w-60px border-none bg-transparent text-right outline-none" id="demo-vmax" value="${Math.round(st.pmax / 1000).toLocaleString('vi-VN')}"><span style="color: rgb(189, 189, 189);">.000đ</span></p></div></div></div></div>`;
      }
      h += '</div>';
    });
    return h + '</div>';
  }
  function popupFoot() {
    const n = filterIdx(pending).length;
    return `<a class="!text-red-5 !border-red-5 p-10px rounded-8px w-160px border !bg-white !text-center cursor-pointer" id="demo-reset"><span>Bỏ chọn</span></a>` +
      `<button class="relative overflow-hidden rounded-lg bg-blue-5 px-3 py-2 text-white transition-all duration-300 !text-16 font-600 !p-10px min-w-160px shrink-0" id="demo-ok">Xem ${n} kết quả</button>`;
  }
  function mountPopup() {
    const wrap = $('#demo-pop-wrap');
    if (!wrap) return;
    if (!$('#demo-pop')) {
      wrap.insertAdjacentHTML('beforeend', `<div class="rounded-8px top-52px absolute -left-[2px] z-[1000] w-[900px] bg-white" id="demo-pop">
        <div class="fixed h-[110%] bg-[#00000073]" style="inset: 0px;" id="demo-veil"></div>
        <div class="shadow-[ -2px_-2px_5px_-4px_rgba(0,0,0,0.3)] absolute -top-[3px] left-[24px] z-[1001] h-[27px] w-[27px] rotate-45 bg-white content-['']"></div>
        <div class="rounded-12px text-black-7 text-14 relative bg-white"><p class="font-700 border-gray-1 text-18 py-20px shrink-0 border-b text-center leading-7">Tất cả bộ lọc</p>
          <button class="relative overflow-hidden rounded-lg bg-blue-5 px-3 py-2 text-white transition-all duration-300 !text-black-7 border-gray-1 !text-14 top-14px right-14px !absolute border bg-white" id="demo-pclose">✕ Đóng</button>
          <div class="py-10px px-20px gap-32px flex flex-col overflow-auto max-h-[calc(100vh-300px)] xxl:max-h-[465px]" id="demo-pbody"></div>
          <div class="gap-16px border-gray-1 p-12px flex shrink-0 items-center justify-center border-t bg-white" id="demo-pfoot"></div></div></div>`);
    }
    const body = $('#demo-pbody');
    const top = body.scrollTop;
    body.innerHTML = popupBody(pending);
    body.scrollTop = top;
    $('#demo-pfoot').innerHTML = popupFoot();
  }
  function openPopup() { pending = JSON.parse(JSON.stringify(state)); popOpen = true; renderBar(); }
  function closePopup(apply) {
    if (apply && pending) { location.href = urlFor(pending); return; }   // Xem kết quả: chuyển sang trang mới như web thật
    popOpen = false; pending = null;
    renderBar();
  }

  /* ---------- lưới máy ---------- */
  function cardHtml(i) {
    const p = P[i];
    const href = 'https://www.thegioididong.com/' + p.url;
    const labels = p.labels.map(l => `<div class="bg-gray-0 text-gray-7 w-fit p-1 rounded truncate">${esc(l)}</div>`).join('');
    const chips = p.chips.map(c => `<div class="bg-gray-0 px-5px py-4px rounded-2px text-12 text-gray-7 relative cursor-pointer truncate text-nowrap">${esc(c)}</div>`).join('');
    const frame = p.frame ? `<div class="w-full h-auto overflow-hidden relative !absolute !top-0 !left-0 flex !w-[80px] items-center justify-center"><img src="${esc(p.frame)}" alt="" loading="lazy" class="object-contain overflow-hidden rounded-none object-contain"/></div>` : '';
    const price = p.price != null
      ? `<a class="font-700 text-red-7 text-16 text-14" href="${href}" target="_blank"><span>${money(p.price)}</span></a>` +
        (p.sys && p.sys > p.price ? `<a class="flex h-fit w-full items-center" href="${href}" target="_blank"><del class="text-gray-5 truncate text-14">${money(p.sys)}</del><span class="text-13 text-red-7 ms-1 flex h-4 flex-shrink-0 items-center justify-center">-${p.pct}%</span></a>` : '')
      : '<span class="text-gray-7">Liên hệ</span>';
    return `<div data-product-code="${esc(p.code)}" class="hover:shadow-level-2 p-10px border-green-6 gap-11px lg:gap-8px rounded-6px overflow-hidden flex flex-col text-start bg-white border !font-400 w-full h-full">
<div class="gap-4px lg:gap-8px flex flex-auto flex-col">
<a class="-m-10px relative" href="${href}" target="_blank"><div class="min-h-125px aspect-square flex items-center rounded-lg max-h-[350px]"><div class="w-full h-auto overflow-hidden relative !size-full"><img aria-label="${esc(p.name)}" src="${IMG}${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" class="size-full object-contain overflow-hidden p-2 rounded-none object-contain"/></div></div>${frame}</a>
<div class="gap-4px lg:gap-8px flex flex-auto flex-col"><div class="gap-5px mt-10px text-12 flex flex-col flex-auto">
<div class="relative flex flex-wrap items-center gap-1"><div class="flex gap-1">${labels}</div></div>
<a title="${esc(p.name)}" href="${href}" target="_blank"><div class="leading-20 text-14 text-black-7 line-clamp-2">${esc(p.name)}</div></a>
<a class="gap-6px mt-2px flex flex-wrap" href="${href}" target="_blank">${chips}</a>${price}</div>
<a class="leading-12 text-12 text-gray-7 flex shrink-0 flex-wrap items-center gap-y-1 overflow-hidden" href="${href}" target="_blank"><span class="flex items-center gap-1"><i class="icon__row-7-col-1"></i>${p.rate ?? ''}</span><span class="relative flex items-center"><span class="mx-1">•</span><span>${esc(p.sold)}</span></span></a>
<div class="leading-24 text-primary-600 flex cursor-pointer items-center justify-end gap-1"><i class="icon__row-5-col-2"></i>So sánh</div></div></div></div>`;
  }
  function renderGrid() {
    const idx = sortIdx(filterIdx(state));
    const grid = $('#demo-grid');
    const crumb = $('#demo-breadcrumb');
    if (crumb) {                                              // "88 Laptop Asus" như trang Hãng khi chỉ đứng ở một nút
      const deep = deepest(state.sel);
      crumb.textContent = idx.length + ' Laptop' + (deep.length === 1 && !state.brands.length && !priceActive(state) ? ' ' + N[deep[0]].ten : '');
    }
    grid.innerHTML = idx.length ? idx.slice(0, state.shown).map(cardHtml).join('')
      : '<div id="demo-empty">Không có laptop nào phù hợp với bộ lọc này.</div>';
    const more = $('#demo-more');
    if (more) {
      const rest = idx.length - state.shown;
      more.style.display = rest > 0 ? '' : 'none';
      const sp = more.querySelector('span');
      if (sp) sp.textContent = `Xem thêm ${rest} Laptop`;
    }
  }

  /* ---------- sắp xếp ---------- */
  function setupSort() {
    const items = [...$('#demo-sort-bar').querySelectorAll('.flex.w-fit')];
    const keys = ['hot', 'sell', 'new', 'pct', 'price'];
    items.forEach((el, i) => el.addEventListener('click', () => {
      if (keys[i] === 'price') state.priceDir = state.sort === 'price' && state.priceDir === 'asc' ? 'desc' : 'asc';
      state.sort = keys[i];
      items.forEach((x, j) => x.classList.toggle('text-primary-600', j === i));
      renderGrid();
    }));
  }

  /* ---------- sự kiện ---------- */
  document.addEventListener('click', e => {
    // Nút trong hàng nút, chip, hàng nhanh đều là link thật (href) nên trình duyệt tự chuyển sang trang mới.
    // Ở đây chỉ xử lý những thứ nằm trong trang: mở/đóng bảng Lọc, chọn trong bảng, Xem thêm.
    const t = e.target.closest('[id^=demo-],[data-pnode],[data-pbrand]');
    if (!t) return;
    const d = t.dataset;
    if (t.id === 'demo-lockbtn') return popOpen ? closePopup(false) : openPopup();
    if (t.id === 'demo-veil' || t.id === 'demo-pclose') return closePopup(false);
    if (t.id === 'demo-ok') return closePopup(true);
    if (t.id === 'demo-reset') { Object.assign(pending, { sel: [], brands: [], pmin: PRICE_MIN, pmax: PRICE_MAX }); return mountPopup(); }
    if (t.id === 'demo-more') { state.shown += 20; return renderGrid(); }
    if (d.pnode) { toggleNode(pending, d.pnode); return mountPopup(); }
    if (d.pbrand != null && d.pbrand !== '') {
      const b = Number(d.pbrand), i = pending.brands.indexOf(b);
      i >= 0 ? pending.brands.splice(i, 1) : pending.brands.push(b);
      return mountPopup();
    }
  });
  document.addEventListener('input', e => {
    if (!pending || (e.target.id !== 'demo-pmin' && e.target.id !== 'demo-pmax')) return;
    let lo = Number($('#demo-pmin').value), hi = Number($('#demo-pmax').value);
    if (lo > hi) { if (e.target.id === 'demo-pmin') lo = hi; else hi = lo; }
    pending.pmin = PRICE_MIN + lo * 1e6; pending.pmax = PRICE_MIN + hi * 1e6;
    $('#demo-vmin').value = Math.round(pending.pmin / 1000).toLocaleString('vi-VN');
    $('#demo-vmax').value = Math.round(pending.pmax / 1000).toLocaleString('vi-VN');
    const bar = $('#demo-bar');
    bar.style.left = lo / STEPS * 100 + '%'; bar.style.right = 100 - hi / STEPS * 100 + '%';
    $('#demo-pfoot').innerHTML = popupFoot();
  });

  /* ---------- đọc trang đang đứng từ địa chỉ ---------- */
  function loadQuery() {
    const q = new URLSearchParams(location.search);
    const ids = (q.get('l') || '').split(',').map(s => BY_SLUG[s]).filter(Boolean);
    state.sel = withAncestors(ids);
    const hang = (q.get('h') || '').split(',').filter(Boolean);
    state.brands = D.brands.map((b, i) => hang.includes(ascii(b.ten)) ? i : -1).filter(i => i >= 0);
    const g = (q.get('gia') || '').match(/^([\d.]+)-([\d.]+)$/);
    if (g) { state.pmin = Math.max(PRICE_MIN, Number(g[1]) * 1e6); state.pmax = Math.min(PRICE_MAX, Number(g[2]) * 1e6); }
  }

  function renderAll() { renderBar(); renderGrid(); }

  loadQuery();
  setupSort();
  mountNoteBar();
  renderAll();
})();
