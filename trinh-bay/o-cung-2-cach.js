/* Thử 2 cách cho riêng bộ lọc Ổ cứng ở cột Phương án 2 cấp (owner 13/11/2026, để sếp xem 1 trường hợp).
 * build-trinh-bay-3-ban.py chép file này vào trang và chèn vào cot-pa3.html, sau bo-loc-pa3.js, trước demo.js.
 *   Tắt (mặc định, như luật Quy_Trình): SSD 256 GB, SSD 512 GB, SSD 1 TB, Ổ cứng khác ▾ (SSD 2 TB, 3 TB, 6 TB).
 *   Bật: SSD 2 TB ra màn hình đầu; SSD 3 TB và SSD 6 TB gộp thành 1 nút "Ổ cứng khác", không mở khung.
 * Nút bật tắt nằm ngay cạnh tên bộ lọc Ổ cứng, kèm chữ i giải thích. Đổi tại chỗ, không nạp lại trang, giữ nguyên chỗ đang cuộn.
 * Cả 2 cách đều có sẵn node từ đầu (demo.js tính sẵn tập máy của từng node lúc nạp), bật tắt chỉ đổi danh sách nút của bộ lọc. */
(function () {
  const D = window.DEMO_DATA, T = window.TB, G = 'ổ-cứng';
  const K = G + '/ổ-cứng-khác', K2 = K + '/ssd-2-tb', K3 = K + '/ssd-3-tb', K6 = K + '/ssd-6-tb';
  const MOI = G + '/ssd-2-tb', KB = G + '/ổ-cứng-khác-2';
  const N = D.nodes, g = D.groups.find(x => x.id === G);
  if (!g || !N[K] || !N[K2] || !N[K3] || !N[K6]) return;

  const dau = s => s.split('\n')[0];
  const may = [...new Set([...N[K3].may, ...N[K6].may])].sort((a, b) => a - b);
  const ra = Object.assign({}, N[K2], { id: MOI, cha: '', cap: 1, luat_k: '',
    luat: dau(N[K2].luat) + '\nĐưa SSD 2 TB ra màn hình đầu' });
  const gop = Object.assign({}, N[K], { id: KB, con: [], may, web: [...N[K3].web, ...N[K6].web],
    luat: `0 lượt tìm/tháng, ${may.length} máy\nGộp SSD 3 TB và SSD 6 TB thành 1 nút, không mở khung` });
  const moi = {};                                        // giữ thứ tự node, chèn 2 node của cách bật ngay sau Ổ cứng khác
  for (const id of Object.keys(N)) { moi[id] = N[id]; if (id === K) { moi[MOI] = ra; moi[KB] = gop; } }
  D.nodes = moi;
  T.chip[MOI] = Object.assign({}, T.chip[K2], { m: '', cau: ra.luat });
  T.chip[KB] = { m: 'gop', cau: gop.luat, lt: '0', it: true, k: [...T.chip[K3].k, ...T.chip[K6].k] };

  const NUT_TAT = g.nut.slice(), NUT_BAT = g.nut.filter(x => x !== K).concat(MOI, KB);
  let bat = false;
  const INFO = '<b>Bật:</b> SSD 2 TB hiện riêng ở màn hình đầu.\nSSD 3 TB và SSD 6 TB gộp thành 1 nút "Ổ cứng khác", bấm là lọc luôn, không mở khung.\n\n'
    + '<b>Tắt:</b> như luật hiện tại.\nSSD 2 TB, SSD 3 TB, SSD 6 TB nằm trong khung "Ổ cứng khác ▾".';

  document.head.insertAdjacentHTML('beforeend', `<style>
    [data-oc-p] { display: inline-block !important; }
    .oc-tg { display: inline-flex; align-items: center; gap: 6px; margin-left: 12px; vertical-align: middle; font-size: 13px; font-weight: 500; color: #555;
      background: none; border: 0; padding: 2px 4px; cursor: pointer; font-family: inherit; }
    .oc-sw { position: relative; width: 30px; height: 17px; border-radius: 9px; background: #c9ccd3; transition: background .15s; flex: none; }
    .oc-sw::after { content: ''; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: #fff; transition: left .15s; box-shadow: 0 1px 2px rgba(0,0,0,.25); }
    .oc-tg.on .oc-sw { background: #2a83e9; } .oc-tg.on .oc-sw::after { left: 15px; } .oc-tg.on { color: #2a83e9; }
    .oc-i { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%;
      border: 1px solid #9aa0a6; color: #6b7280; font: italic 700 11px/1 Georgia, serif; margin-left: 6px; vertical-align: middle; cursor: help; }
    .oc-i .oc-bb { display: none; position: absolute; left: 50%; top: 22px; transform: translateX(-50%); width: 300px; z-index: 50; padding: 10px 12px;
      background: #1f2937; color: #fff; border-radius: 8px; font-family: Inter, Arial, sans-serif; font-size: 12.5px; font-weight: 400; line-height: 1.5; font-style: normal; white-space: pre-line; text-align: left;
      box-shadow: 0 4px 14px rgba(0,0,0,.2); }
    .oc-i:hover .oc-bb, .oc-i:focus .oc-bb { display: block; }
  </style>`);

  function veNut() {                                     // demo vẽ lại bảng sau mỗi lần bấm: gắn lại nút nếu bị mất
    const p = [...document.querySelectorAll('#demo-pbody [data-tbg] > p, #demo-pbody p')]
      .find(x => (x.firstChild && x.firstChild.textContent || '').trim() === 'Ổ cứng');
    if (!p || p.nextElementSibling && p.nextElementSibling.classList.contains('oc-wr')) return;
    p.setAttribute('data-oc-p', '');
    p.insertAdjacentHTML('afterend', `<span class="oc-wr"><button type="button" class="oc-tg${bat ? ' on' : ''}" aria-pressed="${bat}">`
      + `<span class="oc-sw"></span>SSD 2 TB ra ngoài</button><span class="oc-i" tabindex="0">i<span class="oc-bb">${INFO}</span></span></span>`);
  }
  new MutationObserver(veNut).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('click', e => {
    const b = e.target.closest('.oc-tg'); if (!b) return;
    e.preventDefault();
    // giá trị sắp bị ẩn mà đang được chọn thì bỏ chọn trước (bấm chip ở hàng "Đã chọn"), để kết quả không còn lọc ngầm
    const an = new Set(bat ? [MOI, KB] : [K, K2, K3, K6]);
    for (let i = 0; i < 8; i++) {
      const c = [...document.querySelectorAll('#demo-pbody [data-pnode][title="Bỏ chọn"]')].find(x => an.has(x.dataset.pnode));
      if (!c) break;
      c.click();
    }
    bat = !bat;
    g.nut = bat ? NUT_BAT : NUT_TAT;
    if (window.demoMoKhung) window.demoMoKhung(G, null);  // vẽ lại bảng tại chỗ, demo giữ nguyên chỗ đang cuộn
  });
})();
