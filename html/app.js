// 立创商城优惠券助手 —— 前端逻辑
// 数据契约（main.py 生成，不改变）：coupon_details.json / run_time.txt
// 交互：分类卡片网格（突出最高优惠）→ 点击弹出该分类品牌券
class CouponApp {
  constructor() {
    this.data = null;
    this.cats = [];
    this.total = 0;
    this.query = '';
    this.sortKey = 'recv'; // 默认按领取热度
    this.currentCat = null;
    this.catQuery = '';
    this.catSort = 'deal';
  }

  async init() {
    try {
      await this.loadRunTime();
      this.data = await this.loadData();
      this.buildMeta();
      this.bindEvents();
      this.renderGrid();
    } catch (e) {
      console.error('初始化失败:', e);
      const isDataErr = e instanceof TypeError && /fetch|json|network/i.test(e.message || '');
      document.getElementById('grid').innerHTML =
        `<div class="empty"><div class="em">⚠️</div><p>${isDataErr ? '数据加载失败，请稍后刷新重试' : '页面异常：' + (e.message || e)}</p></div>`;
    }
  }

  async loadRunTime() {
    try {
      const t = (await (await fetch('run_time.txt')).text()).trim();
      document.querySelectorAll('#rt, #rtTop').forEach(el => { el.textContent = t; });
    } catch (_) { /* 非致命 */ }
  }

  async loadData() {
    const res = await fetch('coupon_details.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  buildMeta() {
    // 前端兜底：过滤平台新人专享券（与后端口径一致；品牌新人券保留展示）
    const isNewUserOnly = x => (x.coupon_name || '').includes('<新人专享>');
    this.cats = Object.keys(this.data).map(name => {
      const list = (this.data[name] || []).filter(x => !isNewUserOnly(x));
      const best = list.reduce((m, c) => (c.coupon_amount || 0) > (m.coupon_amount || 0) ? c : m, list[0] || {});
      const totalRecv = list.reduce((s, c) => s + (c.receive_customer_num || 0), 0);
      const afters = list.map(c => c.min_order_after_discount).filter(v => typeof v === 'number');
      const minAfter = afters.length ? Math.min(...afters) : null;
      return { name, list, count: list.length, best, totalRecv, minAfter };
    }).filter(c => c.count > 0);
    this.total = this.cats.reduce((s, c) => s + c.count, 0);
    // Hero 统计胶囊
    const hc = document.getElementById('heroCats'), hcp = document.getElementById('heroCoupons');
    if (hc) hc.textContent = this.cats.length;
    if (hcp) hcp.textContent = this.total;
  }

  // 分类内去重品牌全名（悬停 title 用）
  brandList(c) {
    return [...new Set(c.list.map(x => (x.brand_name || '').trim()).filter(Boolean))];
  }

  // 分类内去重品牌短名（取括号前），最多 3 个 + 等 N 家
  brandPreview(c) {
    const names = [...new Set(c.list.map(x => (x.brand_name || '').split('(')[0].trim()).filter(Boolean))];
    const head = names.slice(0, 3).join(' · ');
    return names.length > 3 ? `${head} 等 ${names.length} 家品牌` : `${head} ${names.length} 家品牌`;
  }

  catMatches(c) {
    if (!this.query) return true;
    const q = this.query.toLowerCase();
    return c.name.toLowerCase().includes(q)
      || c.list.some(x => this.couponMatches(x));
  }

  couponMatches(x) {
    const q = this.query.toLowerCase();
    return (x.brand_name || '').toLowerCase().includes(q)
      || (x.coupon_name || '').toLowerCase().includes(q)
      || (x.activity_name || '').toLowerCase().includes(q)
      || (x.catalog_groups || []).join(' ').toLowerCase().includes(q);
  }

  // 搜索模式下：收集所有匹配的券，并按 品牌+券+满减 去重（同品牌同券跨分类只显示一条，
  // 同时合并该券所属的全部分类；命中搜索词的分类排在分类列表最前面）
  matchedCoupons() {
    const q = this.query.toLowerCase();
    const map = new Map();
    for (const c of this.cats) {
      const catHit = c.name.toLowerCase().includes(q);
      const candidates = catHit
        ? c.list
        : c.list.filter(x => this.couponMatches(x));
      for (const x of candidates) {
        const key = `${x.brand_id}|${x.coupon_name}|${x.min_order_amount}|${x.coupon_amount}`;
        const found = map.get(key);
        if (found) {
          if (!found.cats.includes(c.name)) {
            if (catHit) found.cats.unshift(c.name);
            else found.cats.push(c.name);
          }
          continue;
        }
        map.set(key, { cats: [c.name], x });
      }
    }
    return [...map.values()];
  }

  sortCats(a, b) {
    if (this.sortKey === 'recv') return b.totalRecv - a.totalRecv;
    return (b.best.coupon_amount || 0) - (a.best.coupon_amount || 0);
  }

  fmt(n) { return Number.isInteger(n) ? String(n) : Number(n).toFixed(1); }
  esc(s) { return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

  renderGrid() {
    const grid = document.getElementById('grid');
    const countEl = document.getElementById('count');

    // 搜索模式：按品牌分组，只显示匹配到的券
    if (this.query) {
      grid.classList.add('flat');
      const list = this.matchedCoupons();

      // 组内排序键
      const byRecv = this.sortKey === 'recv';
      const innerSort = byRecv
        ? (a, b) => (b.x.receive_customer_num || 0) - (a.x.receive_customer_num || 0)
        : (a, b) => (b.x.coupon_amount || 0) - (a.x.coupon_amount || 0);

      // 按品牌分组
      const groups = new Map();
      for (const it of list) {
        const key = it.x.brand_name || '—';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(it);
      }
      const garr = [...groups.entries()].map(([brand, items]) => ({
        brand, items,
        maxAmt: Math.max(...items.map(i => i.x.coupon_amount || 0)),
        totalRecv: items.reduce((s, i) => s + (i.x.receive_customer_num || 0), 0)
      }));
      garr.forEach(g => g.items.sort(innerSort));
      // 组间排序：deal → 组内最高减额；count/recv → 组内总领取量
      if (byRecv) garr.sort((a, b) => b.totalRecv - a.totalRecv);
      else garr.sort((a, b) => b.maxAmt - a.maxAmt);
      const ordered = [];
      for (const g of garr) for (const it of g.items) ordered.push(it);

      // 每行与弹窗内券条完全一致：品牌名 + 券名 + 所属分类（空白区） + 满减 + 去领券
      grid.innerHTML = ordered.length
        ? ordered.map(it => this.couponCard(it.x, null, false, it.cats)).join('')
        : '<div class="empty"><div class="em">🔍</div><p>没有匹配的优惠券，换个关键词试试</p></div>';
      countEl.innerHTML = `匹配 <b>${ordered.length}</b> 张券 · ${garr.length} 个品牌`;
      return;
    }

    // 浏览模式：分类卡片网格（全宽）
    grid.classList.remove('flat');
    const list = this.cats.filter(c => this.catMatches(c)).sort((a, b) => this.sortCats(a, b));
    if (!list.length) {
      grid.innerHTML = '<div class="empty"><div class="em">🔍</div><p>没有匹配的分类，换个关键词试试</p></div>';
    } else {
      grid.innerHTML = list.map(c => `
        <button class="cat-card" data-name="${this.esc(c.name)}" type="button">
          <div class="cat-top">
            <span class="cat-name">${this.esc(c.name)}</span>
            <span class="cat-count">${c.count} 张</span>
          </div>
          <div class="cat-brands" title="品牌：${this.esc(this.brandList(c).join('、'))}"><b>${this.esc(this.brandPreview(c))}</b></div>
          <div class="cat-deal"><span class="lbl">最高优惠</span><b>满${this.fmt(c.best.min_order_amount)}减${this.fmt(c.best.coupon_amount)}</b></div>
        </button>`).join('');
      grid.querySelectorAll('.cat-card').forEach(el =>
        el.addEventListener('click', () => this.openCat(el.dataset.name)));
    }
    countEl.innerHTML = `共 <b>${this.cats.length}</b> 个分类 · <b>${this.total}</b> 张券`;
  }

  openCat(name) {
    this.currentCat = this.cats.find(c => c.name === name);
    if (!this.currentCat) return;
    this.catQuery = '';
    this.catSort = this.sortKey; // 弹窗排序与主页面同步
    document.getElementById('catSearch').value = '';
    document.getElementById('catModalTitle').textContent = this.currentCat.name;
    document.getElementById('catModalSub').textContent = `${this.currentCat.count} 张品牌券`;
    // 券太少时搜索没有意义，隐藏弹窗内搜索框
    document.querySelector('#catModal .modal-tools').style.display = this.currentCat.list.length < 8 ? 'none' : '';
    document.getElementById('catModal').classList.add('open');
    document.getElementById('catModal').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    this.renderCat();
    document.getElementById('catModalClose').focus();
  }

  closeCat() {
    const m = document.getElementById('catModal');
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  couponCard(c, catName = null, hideBrand = false, cats = null) {
    // 可领数量：总量 - 已领；总量缺失时仅显示已领
    let recv;
    if (typeof c.total_coupon_num === 'number' && c.total_coupon_num > 0) {
      const left = Math.max(0, c.total_coupon_num - (c.receive_customer_num || 0));
      const low = left <= c.total_coupon_num * 0.2; // 剩余 ≤20% 标记即将领完
      recv = `<span class="s${low ? ' low' : ''}" title="剩余 ${left} 张可领">已领 ${c.receive_customer_num}/${c.total_coupon_num}${low ? ` · 仅剩 ${left}` : ''}</span>`;
    } else {
      recv = `<span class="s">已领 ${c.receive_customer_num} 张</span>`;
    }
    // 搜索模式：行中空白区显示所属分类（命中搜索词的分类排最前；最多 3 个 + 等N个分类，悬停看全名）
    let mid = '';
    if (cats && cats.length) {
      const text = cats.length > 3
        ? `${cats.slice(0, 3).join('、')} 等${cats.length}个分类`
        : cats.join('、');
      mid = `<span class="coupon-mid" title="所属分类：${this.esc(cats.join('、'))}">${this.esc(text)}</span>`;
    }
    return `<a class="coupon" href="https://list.szlcsc.com/brand/${c.brand_id}.html" target="_blank" rel="noopener" title="前往品牌券列表页">
      <div class="coupon-main">
        ${hideBrand ? '' : `<span class="coupon-brand">${this.esc(c.brand_name)}</span>`}
        <span class="coupon-name">${catName ? `<i class="coupon-cat">${this.esc(catName)}</i>` : ''}${this.esc(c.coupon_name)}</span>
      </div>
      ${mid}
      <div class="coupon-deal">
        <span class="m">满${this.fmt(c.min_order_amount)}减${this.fmt(c.coupon_amount)}</span>
        ${recv}
      </div>
      <span class="cta">领券</span>
    </a>`;
  }

  renderCat() {
    if (!this.currentCat) return;
    let list = this.currentCat.list.slice();
    if (this.catQuery) {
      const q = this.catQuery.toLowerCase();
      list = list.filter(c => (c.brand_name || '').toLowerCase().includes(q)
        || (c.coupon_name || '').toLowerCase().includes(q));
    }
    if (this.catSort === 'recv') list.sort((a, b) => b.receive_customer_num - a.receive_customer_num);
    else list.sort((a, b) => b.coupon_amount - a.coupon_amount); // deal：优惠力度

    const body = document.getElementById('catModalBody');
    body.innerHTML = list.length ? list.map(c => this.couponCard(c)).join('')
      : '<div class="modal-empty">本分类内没有匹配的券</div>';
  }

  bindEvents() {
    const search = document.getElementById('search');
    search.addEventListener('input', e => {
      this.query = e.target.value.trim();
      this.renderGrid();
    });
    document.getElementById('sort').addEventListener('change', e => {
      this.sortKey = e.target.value; this.renderGrid();
    });
    document.getElementById('catSearch').addEventListener('input', e => {
      this.catQuery = e.target.value.trim(); this.renderCat();
    });
    document.getElementById('catModalClose').addEventListener('click', () => this.closeCat());
    document.getElementById('catModalMask').addEventListener('click', () => this.closeCat());
    document.getElementById('infoBtn').addEventListener('click', () => {
      document.getElementById('usageGuide').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.getElementById('themeBtn').addEventListener('click', () => this.toggleTheme());
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (document.getElementById('catModal').classList.contains('open')) this.closeCat();
    });

    const totop = document.getElementById('totop');
    window.addEventListener('scroll', () => totop.classList.toggle('show', window.scrollY > 480), { passive: true });
    totop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    this.initTheme();
  }

  initTheme() {
    const saved = localStorage.getItem('lcsc-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.setAttribute('data-theme', 'dark');
  }
  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const isDark = cur === 'dark' || (!cur && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lcsc-theme', next);
  }
}

document.addEventListener('DOMContentLoaded', () => new CouponApp().init());
