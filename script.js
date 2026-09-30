// ============ YOUR DATA — edit this block, everything on the page is derived from it ============

const TX = {
  meta: {
    title: 'SPCX To Moon',
    tagline: 'A long-term investment journey',
    ticker: 'SPCX',
    startDate: '2026-09-28',
    endDate: '2031-10-01',
    targetValue: 10000
  },
  rules: [
    'Every month I invest at least $50 in $SPCX.',
    'Extra money may go into this from time to time.',
    'I will not sell for at least 5 years, or until the portfolio reaches $10,000, whichever comes first.',
    'Document everything.'
  ],
  // Add a month = add an entry. The day number is computed from `date`. `title` and `buy` are optional
  // (milestones/notes only). `tiktok` is a link or null.
  entries: [
    {
      id: 'ground-0',
      date: '2026-09-28',
      title: 'Ground 0',
      buy: { amount: 98.0, shares: 0.6658, price: 147.21 },
      note: "First buy. Setting up the destination. Flight plan filed, all systems nominal.",
      tiktok: null
    }
  ]
};

// Price checks. Add one whenever you log an entry; the latest one drives current value.
const PRICES = [
  { date: '2026-09-28', price: 147.21 }
];

// ==================================================================================================

(() => {
  const DAY_MS = 86400000;
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const $ = (sel) => document.querySelector(sel);

  const sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '');
  const fmtUsd = (n) => (n == null ? '—' : usd.format(n));
  const fmtSigned = (n) => sign(n) + usd.format(Math.abs(n));
  const fmtPct = (n) => `${sign(n)}${Math.abs(n).toFixed(2)}%`;
  const fmtShares = (n) => n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  const tone = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : '');
  const utc = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const fmtLongDate = (iso) =>
    new Date(utc(iso)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const fmtDate = (iso) =>
    new Date(utc(iso))
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
      .toUpperCase();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ---- calculations (pure) ----

  function totalsAsOf(buys, isoDate) {
    let invested = 0;
    let shares = 0;
    for (const b of buys) {
      if (b.date > isoDate) continue;
      invested += b.buy.amount;
      shares += b.buy.shares;
    }
    return { invested, shares };
  }

  function computeStats(tx, prices) {
    const { meta } = tx;
    const buys = tx.entries.filter((e) => e.buy);
    const { invested, shares } = totalsAsOf(buys, '9999-12-31');
    const latest = prices[prices.length - 1] ?? null;
    const price = latest ? latest.price : null;
    const value = price == null ? invested : shares * price;
    const pl = value - invested;

    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    // Day 1 is the start date (no day 0), so the span is counted inclusively.
    const totalDays = Math.round((utc(meta.endDate) - utc(meta.startDate)) / DAY_MS) + 1;
    const day = Math.max(1, Math.round((today - utc(meta.startDate)) / DAY_MS) + 1);

    return {
      invested, shares, price, value, pl,
      priceDate: latest ? latest.date : null,
      plPct: invested > 0 ? (pl / invested) * 100 : 0,
      avgPrice: shares > 0 ? invested / shares : null,
      buyCount: buys.length,
      day, totalDays,
      daysLeft: Math.max(0, totalDays - day),
      timeProgress: Math.min(1, day / totalDays),
      valueProgress: Math.min(1, value / meta.targetValue),
      valueToGo: Math.max(0, meta.targetValue - value)
    };
  }

  // ---- rendering ----

  function tile(label, value, sub, toneClass) {
    const t = el('div', 'tile');
    t.append(el('div', 'tile-label', label), el('div', `tile-value${toneClass ? ` ${toneClass}` : ''}`, value));
    if (sub) t.append(el('div', 'tile-sub', sub));
    return t;
  }

  function renderStats(meta, s) {
    $('#title').textContent = meta.title;
    $('#tagline').textContent = meta.tagline;
    $('#day-badge').textContent = `Day ${s.day}`;
    document.title = `${meta.title} — ${meta.tagline}`;
    $('#stats').append(
      tile(`${meta.ticker} price`, fmtUsd(s.price), s.priceDate ? `as of ${fmtDate(s.priceDate)}` : ''),
      tile('Shares', fmtShares(s.shares), s.avgPrice ? `avg ${fmtUsd(s.avgPrice)}` : ''),
      tile('Total invested', fmtUsd(s.invested), `${s.buyCount} buy${s.buyCount === 1 ? '' : 's'}`),
      tile('Current value', fmtUsd(s.value), s.priceDate ? `as of ${fmtDate(s.priceDate)}` : ''),
      tile('P/L', fmtSigned(s.pl), fmtPct(s.plPct), tone(s.pl))
    );
  }

  function bar(label, right, fraction) {
    const wrap = el('div', 'progress');
    const head = el('div', 'progress-head');
    head.append(el('span', null, label), el('span', 'muted', right));
    const track = el('div', 'track');
    const fill = el('div', 'fill');
    fill.style.width = `${Math.max(fraction * 100, 0.6)}%`;
    track.append(fill);
    wrap.append(head, track);
    return wrap;
  }

  function renderProgress(meta, s) {
    $('#progress').append(
      bar(`Altitude → $${meta.targetValue.toLocaleString('en-US')}`, `${fmtUsd(s.valueToGo)} to go`, s.valueProgress),
      bar(`Mission clock → ${fmtLongDate(meta.endDate)}`, `${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'} left`, s.timeProgress)
    );
  }

  function renderRules(rules) {
    rules.forEach((text, i) => {
      const li = el('li', 'rule');
      li.append(el('span', 'rule-num', String(i + 1)), el('span', 'rule-text', text));
      $('#rules').append(li);
    });
  }

  function renderTimeline(tx) {
    const buys = tx.entries.filter((e) => e.buy);
    const entries = [...tx.entries].sort((a, b) => b.date.localeCompare(a.date));

    for (const e of entries) {
      const card = el('article', 'entry');
      card.id = e.id;
      const head = el('div', 'entry-head');
      const dayNo = Math.round((utc(e.date) - utc(tx.meta.startDate)) / DAY_MS) + 1;
      head.append(el('span', 'entry-date', fmtDate(e.date)), el('span', 'entry-day', `Day ${dayNo}`));
      if (e.title) head.append(el('h3', 'entry-title', e.title));
      card.append(head);
      if (e.note) card.append(el('p', 'entry-note', e.note));

      const facts = el('ul', 'entry-facts');
      const line = (text) => facts.append(el('li', null, text));
      if (e.buy) {
        line(`💰 Added: ${fmtUsd(e.buy.amount)}`);
        line(`🚀 Bought: ${fmtShares(e.buy.shares)} shares @ ${fmtUsd(e.buy.price)}`);
      }
      line(`📈 Total invested: ${fmtUsd(totalsAsOf(buys, e.date).invested)}`);
      card.append(facts);

      if (e.tiktok) {
        const a = el('a', 'entry-link', 'Watch on TikTok →');
        a.href = e.tiktok;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        card.append(a);
      }
      $('#timeline').append(card);
    }
  }

  const prices = [...PRICES].sort((a, b) => a.date.localeCompare(b.date));
  const stats = computeStats(TX, prices);
  renderStats(TX.meta, stats);
  renderProgress(TX.meta, stats);
  renderRules(TX.rules);
  renderTimeline(TX);
})();
