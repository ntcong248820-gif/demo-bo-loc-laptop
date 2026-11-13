/* Thử 2 cách cho riêng bộ lọc Ổ cứng ở cột Phương án 2 cấp (owner 13/11/2026, để sếp xem 1 trường hợp).
 * build-trinh-bay-3-ban.py chép file này vào trang và chèn vào cot-pa3.html, sau bo-loc-pa3.js, trước demo.js.
 * Trang ngoài đổi cách bằng cách nạp lại khung cột với ?oc=1 hoặc ?oc=2 (trinh-bay-o-cung-2-cach-nut.js).
 *   Cách 1 (mặc định, như luật Quy_Trình): SSD 256 GB, SSD 512 GB, SSD 1 TB, Ổ cứng khác ▾ (SSD 2 TB, 3 TB, 6 TB).
 *   Cách 2: SSD 2 TB ra màn hình đầu; SSD 3 TB và SSD 6 TB gộp thành 1 nút "Ổ cứng khác", không mở khung.
 * Có ?oc thì sau khi trang dựng xong, cả 2 cột cuộn tới bộ lọc Ổ cứng; cách 1 mở sẵn khung Ổ cứng khác. */
(function () {
  const oc = new URLSearchParams(location.search).get('oc');
  if (!oc) return;
  const D = window.DEMO_DATA, T = window.TB, G = 'ổ-cứng';
  const K = G + '/ổ-cứng-khác', K2 = K + '/ssd-2-tb', K3 = K + '/ssd-3-tb', K6 = K + '/ssd-6-tb', MOI = G + '/ssd-2-tb';
  const N = D.nodes;
  if (oc === '2' && N[K] && N[K2] && N[K3] && N[K6]) {
    const dau = s => s.split('\n')[0];
    const may = [...new Set([...N[K3].may, ...N[K6].may])].sort((a, b) => a - b);
    const ra = Object.assign({}, N[K2], { id: MOI, cha: '', cap: 1, luat_k: '',
      luat: dau(N[K2].luat) + '\nCách 2: đưa SSD 2 TB ra màn hình đầu' });
    const gop = Object.assign({}, N[K], { con: [], may, web: [...N[K3].web, ...N[K6].web],
      luat: `0 lượt tìm/tháng, ${may.length} máy\nCách 2: gộp SSD 3 TB và SSD 6 TB thành 1 nút, không mở khung` });
    const moi = {};                                      // giữ thứ tự node (demo dùng thứ tự này để xếp), chèn SSD 2 TB ngay trước Ổ cứng khác
    for (const id of Object.keys(N)) {
      if (id === K2 || id === K3 || id === K6) continue;
      if (id === K) { moi[MOI] = ra; moi[K] = gop; } else moi[id] = N[id];
    }
    D.nodes = moi;
    const g = D.groups.find(x => x.id === G);
    g.nut = g.nut.filter(x => x !== K).concat(MOI, K);
    T.chip[MOI] = Object.assign({}, T.chip[K2], { m: '', cau: ra.luat });
    T.chip[K] = { m: 'gop', cau: gop.luat, lt: '0', it: true, k: [...T.chip[K3].k, ...T.chip[K6].k] };
    [K2, K3, K6].forEach(id => delete T.chip[id]);
  }
  addEventListener('load', () => setTimeout(() => {
    if (oc === '1' && window.demoMoKhung) window.demoMoKhung(G, K);
    const nhom = (T.nhom || []).find(x => x.ten === 'Ổ cứng');
    if (nhom && parent !== window)                       // như bấm tên bộ lọc: trang ngoài báo mọi cột cuộn tới Ổ cứng
      parent.postMessage({ tb: 1, ban: T.ban, type: 'nhom', keys: nhom.k }, '*');
  }, 1200));
})();
