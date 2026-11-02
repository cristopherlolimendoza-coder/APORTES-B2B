/* HONOR–Entel · vista directiva v14 */
(() => {
  'use strict';

  if (window.__HONOR_PANEL_V14__) return;
  window.__HONOR_PANEL_V14__ = true;

  const VERSION = 'V20261102 · VISTA DIRECTIVA';
  const CANONICAL_NAME = 'Fiorella Zoe Canales Gomez';
  const TARGET_RUCS = new Set(['20114803228', '20100318696']);
  const MONTHS = ['may-26', 'jun-26', 'jul-26', 'ago-26', 'sep-26', 'oct-26', 'nov-26', 'dic-26'];
  const MONTH_NAME = {
    'may-26': 'Mayo',
    'jun-26': 'Junio',
    'jul-26': 'Julio',
    'ago-26': 'Agosto',
    'sep-26': 'Septiembre',
    'oct-26': 'Octubre',
    'nov-26': 'Noviembre',
    'dic-26': 'Diciembre'
  };

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const n = value => {
    const parsed = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n(value));
  const money = value => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(n(value));
  const percent = value => `${Math.round(Number(value) || 0)}%`;
  const normalize = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  function rows() {
    try {
      return typeof DATA !== 'undefined' && Array.isArray(DATA) ? DATA : [];
    } catch {
      return [];
    }
  }

  function canonicalExecutive(value, ruc = '') {
    const cleanRuc = String(ruc || '').replace(/\D/g, '');
    const key = normalize(value);
    if (TARGET_RUCS.has(cleanRuc)) return CANONICAL_NAME;
    if (key === 'fiorella zoe canales gomez' || key === 'fiorella zoe canales jean') return CANONICAL_NAME;
    return String(value || '').trim();
  }

  function normalizeNames() {
    rows().forEach(row => {
      row.ejecutivo = canonicalExecutive(row.ejecutivo, row.ruc);
    });
  }

  function parseModels(row) {
    if (Array.isArray(row?.modelItems) && row.modelItems.length) {
      return row.modelItems.map((item, index) => ({
        id: String(item.id || `M${index + 1}`),
        modelo: String(item.modelo || '').trim() || 'Modelo sin definir',
        unidades: n(item.unidades),
        aporteUnitario: n(item.aporteUnitario),
        unidadesGanadas: n(item.unidadesGanadas),
        estado: ['Sin definir', 'En curso', 'Ganada', 'Perdida', 'Descartado'].includes(item.estado)
          ? item.estado
          : 'En curso'
      }));
    }

    const raw = String(row?.modelos || '').trim();
    if (!raw) return [];
    const parts = raw.split(/\s*\|\s*/).filter(Boolean);
    return parts.map((part, index) => {
      const bits = part.split('·').map(value => value.trim());
      const unitsMatch = (bits[1] || '').match(/([\d,.]+|\?)\s*u/i);
      const rateMatch = (bits[2] || '').match(/\$\s*([\d,.]+)/i);
      const units = unitsMatch && unitsMatch[1] !== '?' ? n(unitsMatch[1]) : 0;
      const rate = rateMatch ? n(rateMatch[1]) : 0;
      let state = 'En curso';
      let won = 0;
      if (row.estado === 'Perdida') state = 'Perdida';
      else if (row.estado === 'Ganada' && parts.length === 1) {
        state = 'Ganada';
        won = n(row.unidadesEntregadas || row.unidades || units);
      } else if (row.estado === 'Ganada') state = 'Sin definir';
      return {
        id: `M${index + 1}`,
        modelo: bits[0] || part,
        unidades: units,
        aporteUnitario: rate,
        unidadesGanadas: won,
        estado: state
      };
    });
  }

  function metrics(row) {
    const items = parseModels(row);
    const approved = n(row.aporte);
    const wonUnits = items
      .filter(item => item.estado === 'Ganada')
      .reduce((sum, item) => sum + item.unidadesGanadas, 0);
    let cost = items
      .filter(item => item.estado === 'Ganada')
      .reduce((sum, item) => sum + item.unidadesGanadas * item.aporteUnitario, 0);

    if (!Array.isArray(row.modelItems) && row.estado === 'Ganada' && items.length === 1 && !cost) {
      cost = n(row.unidadesEntregadas || row.unidades || items[0].unidades) * items[0].aporteUnitario;
    }

    const hasOpen = items.some(item => item.estado === 'En curso' || item.estado === 'Sin definir');
    const hasWon = items.some(item => item.estado === 'Ganada');
    let state = row.estado || 'En curso';
    if (Array.isArray(row.modelItems) && row.modelItems.length) {
      state = hasOpen ? 'En curso' : (hasWon ? 'Ganada' : 'Perdida');
    }

    const pending = hasOpen ? Math.max(0, approved - cost) : 0;
    const released = Math.max(0, approved - cost - pending);
    return {
      items,
      approved,
      wonUnits,
      cost,
      pending,
      released,
      state,
      refUnits: n(row.unidades)
    };
  }

  function filteredRows() {
    const month = $('fMonth')?.value || '';
    const channel = $('fChannel')?.value || '';
    const executive = $('fExec')?.value || '';
    const state = $('fState')?.value || '';
    const closeMonth = $('fCloseMonth')?.value || '';
    const closeYear = $('fCloseYear')?.value || '';
    const query = normalize($('fSearch')?.value || '');

    return rows().filter(row => {
      const info = metrics(row);
      const rowExecutive = canonicalExecutive(row.ejecutivo, row.ruc);
      const modelText = info.items.map(item => item.modelo).join(' ');
      const searchable = normalize([
        row.cliente,
        row.ruc,
        rowExecutive,
        row.canal,
        row.modelos,
        modelText,
        row.comentario,
        row.nota
      ].join(' '));
      return (!month || row.mesOrigen === month)
        && (!channel || row.canal === channel)
        && (!executive || rowExecutive === executive)
        && (!state || info.state === state)
        && (!closeMonth || (closeMonth === 'SIN' ? !row.mesCierre : row.mesCierre === closeMonth))
        && (!closeYear || String(row.anioCierre || '') === closeYear)
        && (!query || searchable.includes(query));
    });
  }

  function aggregate(list) {
    const result = {
      clients: new Set(),
      ops: list.length,
      won: 0,
      lost: 0,
      open: 0,
      refUnits: 0,
      wonUnits: 0,
      approved: 0,
      cost: 0,
      pending: 0,
      released: 0
    };
    list.forEach(row => {
      const info = metrics(row);
      result.clients.add(row.ruc || row.cliente || row.id);
      result.refUnits += info.refUnits;
      result.wonUnits += info.wonUnits;
      result.approved += info.approved;
      result.cost += info.cost;
      result.pending += info.pending;
      result.released += info.released;
      if (info.state === 'Ganada') result.won += 1;
      else if (info.state === 'Perdida') result.lost += 1;
      else result.open += 1;
    });
    result.closed = result.won + result.lost;
    result.winRate = result.closed ? result.won / result.closed * 100 : 0;
    result.executionRate = result.approved ? result.cost / result.approved * 100 : 0;
    return result;
  }

  function monthData(list) {
    const known = MONTHS.filter(month => list.some(row => row.mesOrigen === month));
    const extra = [...new Set(list.map(row => row.mesOrigen).filter(Boolean))]
      .filter(month => !MONTHS.includes(month));
    return [...known, ...extra].map(month => {
      const items = list.filter(row => row.mesOrigen === month);
      return { month, label: MONTH_NAME[month] || month, list: items, data: aggregate(items) };
    });
  }

  function kamData(list) {
    const map = new Map();
    list.forEach(row => {
      const name = canonicalExecutive(row.ejecutivo, row.ruc) || 'Sin KAM';
      const info = metrics(row);
      const item = map.get(name) || {
        name,
        ops: 0,
        won: 0,
        lost: 0,
        open: 0,
        refUnits: 0,
        wonUnits: 0,
        approved: 0,
        cost: 0,
        pending: 0
      };
      item.ops += 1;
      item.refUnits += info.refUnits;
      item.wonUnits += info.wonUnits;
      item.approved += info.approved;
      item.cost += info.cost;
      item.pending += info.pending;
      if (info.state === 'Ganada') item.won += 1;
      else if (info.state === 'Perdida') item.lost += 1;
      else item.open += 1;
      map.set(name, item);
    });
    return [...map.values()];
  }

  function channelData(list) {
    const map = new Map();
    list.forEach(row => {
      const name = row.canal || 'Sin canal';
      const info = metrics(row);
      const item = map.get(name) || {
        name,
        ops: 0,
        won: 0,
        lost: 0,
        open: 0,
        refUnits: 0,
        wonUnits: 0,
        approved: 0,
        cost: 0,
        pending: 0
      };
      item.ops += 1;
      item.refUnits += info.refUnits;
      item.wonUnits += info.wonUnits;
      item.approved += info.approved;
      item.cost += info.cost;
      item.pending += info.pending;
      if (info.state === 'Ganada') item.won += 1;
      else if (info.state === 'Perdida') item.lost += 1;
      else item.open += 1;
      map.set(name, item);
    });
    return [...map.values()];
  }

  function modelData(list) {
    const map = new Map();
    list.forEach(row => {
      const info = metrics(row);
      info.items.forEach(model => {
        const name = model.modelo || 'Modelo sin definir';
        const item = map.get(name) || {
          name,
          accounts: new Set(),
          refUnits: 0,
          wonUnits: 0,
          approved: 0,
          cost: 0,
          pending: 0
        };
        item.accounts.add(row.id);
        item.refUnits += model.unidades;
        item.wonUnits += model.estado === 'Ganada' ? model.unidadesGanadas : 0;
        const potential = model.unidades * model.aporteUnitario;
        const confirmed = model.estado === 'Ganada' ? model.unidadesGanadas * model.aporteUnitario : 0;
        const pending = (model.estado === 'En curso' || model.estado === 'Sin definir') ? Math.max(0, potential - confirmed) : 0;
        item.approved += potential;
        item.cost += confirmed;
        item.pending += pending;
        map.set(name, item);
      });
    });
    return [...map.values()];
  }

  function kpi(label, value, sub, tone = '') {
    return `<article class="v14-kpi ${tone}">
      <span>${esc(label)}</span>
      <strong>${esc(value)}</strong>
      <small>${esc(sub || '')}</small>
    </article>`;
  }

  function empty(message = 'Sin datos para el filtro seleccionado.') {
    return `<div class="v14-empty">${esc(message)}</div>`;
  }

  function barRow(label, value, max, formatted, tone = 'navy', meta = '') {
    const width = max > 0 ? Math.max(value > 0 ? 3 : 0, value / max * 100) : 0;
    return `<div class="v14-bar-row">
      <div class="v14-bar-label" title="${esc(label)}">${esc(label)}</div>
      <div class="v14-track"><i class="${tone}" style="width:${width}%"></i></div>
      <div class="v14-bar-value"><b>${esc(formatted)}</b>${meta ? `<small>${esc(meta)}</small>` : ''}</div>
    </div>`;
  }

  function statusBadge(state) {
    const tone = state === 'Ganada' ? 'good' : state === 'Perdida' ? 'bad' : 'open';
    return `<span class="v14-badge ${tone}">${esc(state)}</span>`;
  }

  function currentScope() {
    const parts = [];
    const month = $('fMonth');
    const channel = $('fChannel');
    const executive = $('fExec');
    const state = $('fState');
    if (month?.value) parts.push(month.options[month.selectedIndex]?.textContent || MONTH_NAME[month.value] || month.value);
    if (channel?.value) parts.push(channel.value);
    if (executive?.value) parts.push(executive.value);
    if (state?.value) parts.push(state.value);
    return parts.length ? parts.join(' · ') : 'Vista general';
  }

  function installStyles() {
    if ($('v14DirectorStyle')) return;
    const style = document.createElement('style');
    style.id = 'v14DirectorStyle';
    style.textContent = `
      :root{--v14-ink:#17202a;--v14-muted:#667085;--v14-line:#e4e7ec;--v14-soft:#f7f8fa;--v14-red:#c91f26;--v14-green:#247a4b;--v14-blue:#315f91;--v14-amber:#b36b00}
      #filterTotals{display:none!important}
      .v14-filter-context{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:11px;padding-top:10px;border-top:1px solid var(--v14-line);font-size:11px;color:var(--v14-muted);flex-wrap:wrap}
      .v14-filter-context b{color:var(--v14-ink);font-size:12px}
      .v14-director{display:grid;gap:12px}
      .v14-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:2px 2px 0;flex-wrap:wrap}
      .v14-section-head h2{margin:0;font-size:18px;color:var(--v14-ink)}
      .v14-section-head p{margin:4px 0 0;font-size:11px;color:var(--v14-muted)}
      .v14-scope{font-size:10px;font-weight:800;color:var(--v14-blue);background:#edf4fb;border:1px solid #d8e7f4;border-radius:999px;padding:6px 10px}
      .v14-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .v14-kpi{background:#fff;border:1px solid var(--v14-line);border-radius:12px;padding:14px;min-height:92px;box-shadow:0 5px 18px rgba(23,32,42,.035)}
      .v14-kpi span{display:block;font-size:9px;letter-spacing:.45px;text-transform:uppercase;font-weight:850;color:var(--v14-muted)}
      .v14-kpi strong{display:block;margin:7px 0 5px;font-size:24px;line-height:1;color:var(--v14-ink);font-weight:720}
      .v14-kpi small{display:block;font-size:10px;color:var(--v14-muted)}
      .v14-kpi.good{border-top:3px solid var(--v14-green)}
      .v14-kpi.open{border-top:3px solid var(--v14-blue)}
      .v14-kpi.bad{border-top:3px solid var(--v14-red)}
      .v14-kpi.money{border-top:3px solid var(--v14-amber)}
      .v14-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .v14-card{background:#fff;border:1px solid var(--v14-line);border-radius:13px;padding:15px;box-shadow:0 5px 18px rgba(23,32,42,.035);min-width:0}
      .v14-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:13px}
      .v14-title{font-size:13px;font-weight:850;color:var(--v14-ink)}
      .v14-sub{font-size:10px;color:var(--v14-muted);margin-top:3px;line-height:1.4}
      .v14-status-strip{height:28px;display:flex;overflow:hidden;border-radius:8px;background:#eef1f4;margin:8px 0 11px}
      .v14-status-strip i{display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-style:normal;font-weight:800;min-width:0}
      .v14-status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
      .v14-status-item{background:var(--v14-soft);border-radius:9px;padding:9px}
      .v14-status-item span{display:block;font-size:9px;color:var(--v14-muted)}
      .v14-status-item b{display:block;font-size:16px;margin-top:3px}
      .v14-month-list,.v14-rank,.v14-insights{display:grid;gap:8px}
      .v14-month-row{display:grid;grid-template-columns:72px minmax(100px,1fr) 142px;gap:8px;align-items:center}
      .v14-month-row>strong{font-size:10px;color:#344054}
      .v14-month-row>span{font-size:9px;color:var(--v14-muted);text-align:right;white-space:nowrap}
      .v14-mini-stack{height:15px;background:#eef1f4;border-radius:5px;overflow:hidden;display:flex}
      .v14-mini-stack i{height:100%}
      .v14-bar-row{display:grid;grid-template-columns:minmax(90px,145px) minmax(90px,1fr) 100px;gap:8px;align-items:center}
      .v14-bar-label{font-size:10px;color:#344054;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .v14-track{height:10px;background:#edf0f3;border-radius:999px;overflow:hidden}
      .v14-track i{height:100%;display:block;border-radius:999px}
      .v14-track i.navy{background:var(--v14-blue)}
      .v14-track i.green{background:var(--v14-green)}
      .v14-track i.red{background:var(--v14-red)}
      .v14-track i.amber{background:var(--v14-amber)}
      .v14-bar-value{text-align:right;font-size:9px;color:var(--v14-muted)}
      .v14-bar-value b{display:block;color:#344054;font-size:10px}
      .v14-bar-value small{display:block;font-size:8px;margin-top:1px}
      .v14-channel{display:grid;gap:9px}
      .v14-channel-row{display:grid;grid-template-columns:minmax(120px,1fr) repeat(3,80px);gap:7px;align-items:center;padding:10px;background:var(--v14-soft);border-radius:10px}
      .v14-channel-row strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .v14-channel-row span{font-size:9px;color:var(--v14-muted);text-align:right}
      .v14-channel-row b{display:block;color:var(--v14-ink);font-size:11px}
      .v14-insight{display:grid;grid-template-columns:26px 1fr;gap:9px;align-items:start;padding:9px 0;border-bottom:1px solid #eef0f3}
      .v14-insight:last-child{border-bottom:0}
      .v14-insight i{width:24px;height:24px;border-radius:7px;background:#eef3f8;color:var(--v14-blue);display:grid;place-items:center;font-size:10px;font-style:normal;font-weight:900}
      .v14-insight b{display:block;font-size:10px;color:var(--v14-ink);margin-bottom:2px}
      .v14-insight span{display:block;font-size:9px;color:var(--v14-muted);line-height:1.4}
      .v14-fin-row{display:grid;grid-template-columns:70px 1fr 138px;gap:9px;align-items:center}
      .v14-fin-row>strong{font-size:10px;color:#344054}
      .v14-fin-bars{display:grid;gap:3px}
      .v14-fin-track{height:6px;background:#edf0f3;border-radius:999px;overflow:hidden}
      .v14-fin-track i{height:100%;display:block;border-radius:999px}
      .v14-fin-row>span{font-size:9px;color:var(--v14-muted);text-align:right;white-space:nowrap}
      .v14-table-wrap{overflow:auto;border:1px solid var(--v14-line);border-radius:10px}
      .v14-table{width:100%;border-collapse:collapse;min-width:680px}
      .v14-table th{padding:9px 10px;background:#f8f9fb;color:var(--v14-muted);font-size:8px;text-transform:uppercase;letter-spacing:.35px;text-align:left;white-space:nowrap}
      .v14-table td{padding:10px;border-top:1px solid #eef0f3;font-size:9px;color:#344054;vertical-align:top}
      .v14-table td.right,.v14-table th.right{text-align:right}
      .v14-table strong{font-size:10px;color:var(--v14-ink)}
      .v14-badge{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:8px;font-weight:850}
      .v14-badge.good{background:#eaf6ef;color:#1f6d42}
      .v14-badge.bad{background:#fdeced;color:#a91b22}
      .v14-badge.open{background:#edf4fb;color:#28547d}
      .v14-pipeline-row{display:grid;grid-template-columns:70px minmax(100px,1fr) 120px;gap:8px;align-items:center}
      .v14-pipeline-row>strong{font-size:10px;color:#344054}
      .v14-pipeline-row>span{font-size:9px;color:var(--v14-muted);text-align:right}
      .v14-empty{padding:18px;text-align:center;color:var(--v14-muted);font-size:10px;background:var(--v14-soft);border-radius:9px}
      .v14-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;color:var(--v14-muted);font-size:9px}
      .v14-legend span{display:flex;align-items:center;gap:5px}
      .v14-legend i{width:8px;height:8px;border-radius:3px}
      @media(max-width:1050px){.v14-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.v14-channel-row{grid-template-columns:1fr repeat(3,70px)}}
      @media(max-width:760px){.v14-two{grid-template-columns:1fr}.v14-month-row,.v14-fin-row,.v14-pipeline-row{grid-template-columns:58px 1fr}.v14-month-row>span,.v14-fin-row>span,.v14-pipeline-row>span{grid-column:2;text-align:left}.v14-channel-row{grid-template-columns:1fr 1fr}.v14-channel-row strong{grid-column:1/-1}.v14-channel-row span{text-align:left}.v14-bar-row{grid-template-columns:100px 1fr 82px}}
      @media(max-width:480px){.v14-kpis{grid-template-columns:1fr 1fr}.v14-kpi{padding:11px;min-height:82px}.v14-kpi strong{font-size:19px}.v14-status-grid{grid-template-columns:1fr}.v14-bar-row{grid-template-columns:90px 1fr}.v14-bar-value{grid-column:2;text-align:left}.v14-channel-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function mount() {
    const summary = $('v13Summary');
    const funds = $('v13Funds');
    const accounts = $('v13AccountAnalysis');
    const filters = document.querySelector('.filters');
    if (!summary || !funds || !accounts || !filters) return false;

    summary.className = 'v14-director';
    summary.innerHTML = `
      <div class="v14-section-head">
        <div><h2>Resumen ejecutivo</h2><p>Lectura general del desempeño comercial para dirección.</p></div>
        <span id="v14SummaryScope" class="v14-scope"></span>
      </div>
      <div id="v14SummaryKpis" class="v14-kpis"></div>
      <div class="v14-two">
        <section class="v14-card">
          <div class="v14-card-head"><div><div class="v14-title">Estado general de la cartera</div><div class="v14-sub">Distribución de oportunidades ganadas, perdidas y en curso.</div></div></div>
          <div id="v14PortfolioStatus"></div>
        </section>
        <section class="v14-card">
          <div class="v14-card-head"><div><div class="v14-title">Evolución mensual</div><div class="v14-sub">Resultado de las oportunidades registradas por mes.</div></div></div>
          <div id="v14MonthlyOutcome" class="v14-month-list"></div>
          <div class="v14-legend"><span><i style="background:#247a4b"></i>Ganadas</span><span><i style="background:#c91f26"></i>Perdidas</span><span><i style="background:#315f91"></i>En curso</span></div>
        </section>
      </div>
      <div class="v14-two">
        <section class="v14-card">
          <div class="v14-card-head"><div><div class="v14-title">Comparación por canal</div><div class="v14-sub">Volumen, resultados y unidades ganadas por segmento.</div></div></div>
          <div id="v14ChannelMix" class="v14-channel"></div>
        </section>
        <section class="v14-card">
          <div class="v14-card-head"><div><div class="v14-title">Puntos para dirección</div><div class="v14-sub">Tres datos concretos que requieren atención.</div></div></div>
          <div id="v14DirectorInsights" class="v14-insights"></div>
        </section>
      </div>`;

    funds.className = 'v14-director';
    funds.innerHTML = `
      <div class="v14-section-head">
        <div><h2>Control de aportes</h2><p>Uso del aporte aprobado, costo confirmado y saldo pendiente.</p></div>
        <span id="v14FundsScope" class="v14-scope"></span>
      </div>
      <div id="v14FundsKpis" class="v14-kpis"></div>
      <div class="v14-two">
        <section class="v14-card">
          <div class="v14-card-head"><div><div class="v14-title">Aportes por mes</div><div class="v14-sub">Aprobado, confirmado y pendiente en una sola lectura.</div></div></div>
          <div id="v14FundsMonths" class="v14-month-list"></div>
          <div class="v14-legend"><span><i style="background:#98a2b3"></i>Aprobado</span><span><i style="background:#247a4b"></i>Confirmado</span><span><i style="background:#315f91"></i>Pendiente</span></div>
        </section>
        <section class="v14-card">
          <div class="v14-card-head"><div><div class="v14-title">Pendiente por canal</div><div class="v14-sub">Dónde se concentra el aporte todavía no definido.</div></div></div>
          <div id="v14FundsChannels" class="v14-rank"></div>
        </section>
      </div>
      <div class="v14-two">
        <section class="v14-card">
          <div class="v14-card-head"><div><div class="v14-title">Principales cuentas pendientes</div><div class="v14-sub">Cuentas que concentran el mayor saldo por definir.</div></div></div>
          <div class="v14-table-wrap"><table class="v14-table"><thead><tr><th>Cuenta</th><th>KAM</th><th>Mes</th><th class="right">Pendiente</th></tr></thead><tbody id="v14FundsAccounts"></tbody></table></div>
        </section>
        <section class="v14-card">
          <div class="v14-card-head"><div><div class="v14-title">Aporte por modelo</div><div class="v14-sub">Modelos con mayor costo confirmado y saldo pendiente.</div></div></div>
          <div id="v14FundsModels" class="v14-rank"></div>
        </section>
      </div>`;

    accounts.className = 'v14-director v14-account-summary';
    accounts.innerHTML = `
      <div class="v14-section-head">
        <div><h2>Gestión de cuentas</h2><p>Carga comercial y prioridades operativas antes de editar el detalle.</p></div>
        <span id="v14AccountsScope" class="v14-scope"></span>
      </div>
      <div id="v14AccountsKpis" class="v14-kpis"></div>
      <div class="v14-two">
        <section class="v14-card">
          <div class="v14-card-head"><div><div class="v14-title">Pipeline abierto por mes</div><div class="v14-sub">Cuentas y unidades que todavía requieren gestión.</div></div></div>
          <div id="v14AccountsMonths" class="v14-month-list"></div>
        </section>
        <section class="v14-card">
          <div class="v14-card-head"><div><div class="v14-title">Carga de seguimiento por KAM</div><div class="v14-sub">KAM con mayor cantidad de cuentas abiertas.</div></div></div>
          <div id="v14AccountsKam" class="v14-rank"></div>
        </section>
      </div>
      <section class="v14-card">
        <div class="v14-card-head"><div><div class="v14-title">Cuentas abiertas prioritarias</div><div class="v14-sub">Ordenadas por volumen referencial de unidades.</div></div><span id="v14AccountsCount" class="v14-sub"></span></div>
        <div class="v14-table-wrap"><table class="v14-table"><thead><tr><th>Cuenta</th><th>KAM</th><th>Mes</th><th>Modelos</th><th class="right">Unid. ref.</th><th>Estado</th></tr></thead><tbody id="v14AccountsPriority"></tbody></table></div>
      </section>`;

    let context = $('v14FilterContext');
    if (!context) {
      context = document.createElement('div');
      context.id = 'v14FilterContext';
      context.className = 'v14-filter-context';
      filters.appendChild(context);
    }

    document.querySelectorAll('[data-v13-view]').forEach(button => {
      const view = button.dataset.v13View;
      if (view === 'res') button.textContent = 'Resumen';
      if (view === 'funds') button.textContent = 'Aportes';
      if (view === 'accounts') button.textContent = 'Cuentas';
    });

    return true;
  }

  function renderFilterContext(list, data) {
    const context = $('v14FilterContext');
    if (!context) return;
    context.innerHTML = `<span><b>${number(data.ops)} oportunidades</b> · ${number(data.clients.size)} clientes · ${number(data.refUnits)} unidades referenciales</span><span>${esc(currentScope())}</span>`;
  }

  function renderSummary(list, data) {
    const openRows = list.map(row => ({ row, info: metrics(row) })).filter(item => item.info.state === 'En curso');
    const openUnits = openRows.reduce((sum, item) => sum + item.info.refUnits, 0);
    $('v14SummaryScope').textContent = currentScope();
    $('v14SummaryKpis').innerHTML = [
      kpi('Oportunidades', number(data.ops), `${number(data.clients.size)} clientes`),
      kpi('Tasa de éxito', percent(data.winRate), `${number(data.won)} ganadas de ${number(data.closed)} cerradas`, 'good'),
      kpi('Cartera en curso', number(data.open), `${number(openUnits)} unidades en evaluación`, 'open'),
      kpi('Unidades ganadas', number(data.wonUnits), `${number(data.won)} oportunidades ganadas`, 'good')
    ].join('');

    const total = Math.max(1, data.ops);
    $('v14PortfolioStatus').innerHTML = `
      <div class="v14-status-strip">
        <i style="width:${data.won / total * 100}%;background:#247a4b">${data.won ? number(data.won) : ''}</i>
        <i style="width:${data.lost / total * 100}%;background:#c91f26">${data.lost ? number(data.lost) : ''}</i>
        <i style="width:${data.open / total * 100}%;background:#315f91">${data.open ? number(data.open) : ''}</i>
      </div>
      <div class="v14-status-grid">
        <div class="v14-status-item"><span>Ganadas</span><b style="color:#247a4b">${number(data.won)}</b></div>
        <div class="v14-status-item"><span>Perdidas</span><b style="color:#c91f26">${number(data.lost)}</b></div>
        <div class="v14-status-item"><span>En curso</span><b style="color:#315f91">${number(data.open)}</b></div>
      </div>`;

    const months = monthData(list);
    $('v14MonthlyOutcome').innerHTML = months.map(item => {
      const monthTotal = Math.max(1, item.data.ops);
      return `<div class="v14-month-row">
        <strong>${esc(item.label)}</strong>
        <div class="v14-mini-stack">
          <i style="width:${item.data.won / monthTotal * 100}%;background:#247a4b"></i>
          <i style="width:${item.data.lost / monthTotal * 100}%;background:#c91f26"></i>
          <i style="width:${item.data.open / monthTotal * 100}%;background:#315f91"></i>
        </div>
        <span>G ${number(item.data.won)} · P ${number(item.data.lost)} · EC ${number(item.data.open)}</span>
      </div>`;
    }).join('') || empty();

    const channels = channelData(list).sort((a, b) => b.ops - a.ops);
    $('v14ChannelMix').innerHTML = channels.map(item => {
      const closed = item.won + item.lost;
      const conversion = closed ? item.won / closed * 100 : 0;
      return `<div class="v14-channel-row">
        <strong title="${esc(item.name)}">${esc(item.name)}</strong>
        <span><b>${number(item.ops)}</b>oportunidades</span>
        <span><b>${number(item.wonUnits)}</b>unid. ganadas</span>
        <span><b>${percent(conversion)}</b>éxito</span>
      </div>`;
    }).join('') || empty();

    const kamOpen = kamData(list)
      .filter(item => item.open > 0)
      .sort((a, b) => b.open - a.open || b.refUnits - a.refUnits)[0];
    const largestOpen = openRows.sort((a, b) => b.info.refUnits - a.info.refUnits)[0];
    const bestMonth = months.slice().sort((a, b) => b.data.wonUnits - a.data.wonUnits)[0];
    const insights = [];
    if (kamOpen) insights.push({ icon: '1', title: 'Mayor carga abierta', text: `${kamOpen.name}: ${number(kamOpen.open)} cuentas en curso.` });
    if (largestOpen) insights.push({ icon: '2', title: 'Mayor oportunidad abierta', text: `${largestOpen.row.cliente}: ${number(largestOpen.info.refUnits)} unidades referenciales.` });
    if (bestMonth && bestMonth.data.wonUnits > 0) insights.push({ icon: '3', title: 'Mes con más unidades ganadas', text: `${bestMonth.label}: ${number(bestMonth.data.wonUnits)} unidades confirmadas.` });
    if (!insights.length) insights.push({ icon: '—', title: 'Sin señales disponibles', text: 'El filtro actual no contiene cuentas suficientes para generar una lectura.' });
    $('v14DirectorInsights').innerHTML = insights.slice(0, 3).map(item => `
      <div class="v14-insight"><i>${esc(item.icon)}</i><div><b>${esc(item.title)}</b><span>${esc(item.text)}</span></div></div>`).join('');
  }

  function renderFunds(list, data) {
    $('v14FundsScope').textContent = currentScope();
    $('v14FundsKpis').innerHTML = [
      kpi('Aporte aprobado', money(data.approved), 'Referencia total del filtro', 'money'),
      kpi('Costo confirmado', money(data.cost), `${number(data.wonUnits)} unidades ganadas`, 'good'),
      kpi('Aporte pendiente', money(data.pending), `${money(data.released)} ya liberado`, 'open'),
      kpi('Nivel de ejecución', percent(data.executionRate), 'Confirmado sobre aprobado', 'money')
    ].join('');

    const months = monthData(list);
    const max = Math.max(1, ...months.flatMap(item => [item.data.approved, item.data.cost, item.data.pending]));
    $('v14FundsMonths').innerHTML = months.map(item => `
      <div class="v14-fin-row">
        <strong>${esc(item.label)}</strong>
        <div class="v14-fin-bars">
          <div class="v14-fin-track"><i style="width:${item.data.approved / max * 100}%;background:#98a2b3"></i></div>
          <div class="v14-fin-track"><i style="width:${item.data.cost / max * 100}%;background:#247a4b"></i></div>
          <div class="v14-fin-track"><i style="width:${item.data.pending / max * 100}%;background:#315f91"></i></div>
        </div>
        <span>${money(item.data.cost)} conf. · ${money(item.data.pending)} pend.</span>
      </div>`).join('') || empty();

    const channels = channelData(list).filter(item => item.pending > 0).sort((a, b) => b.pending - a.pending);
    const maxChannel = Math.max(1, ...channels.map(item => item.pending));
    $('v14FundsChannels').innerHTML = channels.map(item => barRow(
      item.name,
      item.pending,
      maxChannel,
      money(item.pending),
      'navy',
      `${item.open} cuentas abiertas`
    )).join('') || empty('No hay aporte pendiente.');

    const openAccounts = list
      .map(row => ({ row, info: metrics(row) }))
      .filter(item => item.info.pending > 0)
      .sort((a, b) => b.info.pending - a.info.pending)
      .slice(0, 7);
    $('v14FundsAccounts').innerHTML = openAccounts.map(item => `
      <tr>
        <td><strong>${esc(item.row.cliente)}</strong></td>
        <td>${esc(canonicalExecutive(item.row.ejecutivo, item.row.ruc) || 'Sin KAM')}</td>
        <td>${esc(MONTH_NAME[item.row.mesOrigen] || item.row.mesOrigen || '')}</td>
        <td class="right"><strong>${money(item.info.pending)}</strong></td>
      </tr>`).join('') || '<tr><td colspan="4">No hay cuentas con aporte pendiente.</td></tr>';

    const models = modelData(list)
      .filter(item => item.cost > 0 || item.pending > 0)
      .sort((a, b) => (b.cost + b.pending) - (a.cost + a.pending))
      .slice(0, 7);
    const maxModel = Math.max(1, ...models.map(item => item.cost + item.pending));
    $('v14FundsModels').innerHTML = models.map(item => barRow(
      item.name,
      item.cost + item.pending,
      maxModel,
      money(item.cost),
      item.cost >= item.pending ? 'green' : 'amber',
      `${money(item.pending)} pendiente`
    )).join('') || empty();
  }

  function renderAccounts(list) {
    const openRows = list
      .map(row => ({ row, info: metrics(row) }))
      .filter(item => item.info.state === 'En curso');
    const openUnits = openRows.reduce((sum, item) => sum + item.info.refUnits, 0);
    const openKams = new Set(openRows.map(item => canonicalExecutive(item.row.ejecutivo, item.row.ruc) || 'Sin KAM'));
    const average = openRows.length ? openUnits / openRows.length : 0;

    $('v14AccountsScope').textContent = currentScope();
    $('v14AccountsKpis').innerHTML = [
      kpi('Cuentas en curso', number(openRows.length), 'Requieren seguimiento', 'open'),
      kpi('KAM con cartera activa', number(openKams.size), 'Responsables con cuentas abiertas'),
      kpi('Unidades en evaluación', number(openUnits), 'Volumen referencial abierto', 'open'),
      kpi('Promedio por cuenta', number(average), 'Unidades por oportunidad abierta')
    ].join('');

    const months = monthData(list).map(item => {
      const open = item.list.map(row => ({ row, info: metrics(row) })).filter(entry => entry.info.state === 'En curso');
      return {
        label: item.label,
        accounts: open.length,
        units: open.reduce((sum, entry) => sum + entry.info.refUnits, 0)
      };
    });
    const maxUnits = Math.max(1, ...months.map(item => item.units));
    $('v14AccountsMonths').innerHTML = months.map(item => `
      <div class="v14-pipeline-row">
        <strong>${esc(item.label)}</strong>
        <div class="v14-track"><i class="navy" style="width:${item.units / maxUnits * 100}%"></i></div>
        <span>${number(item.accounts)} cuentas · ${number(item.units)} unid.</span>
      </div>`).join('') || empty();

    const kams = kamData(list)
      .filter(item => item.open > 0)
      .sort((a, b) => b.open - a.open || b.refUnits - a.refUnits)
      .slice(0, 8);
    const maxOpen = Math.max(1, ...kams.map(item => item.open));
    $('v14AccountsKam').innerHTML = kams.map(item => barRow(
      item.name,
      item.open,
      maxOpen,
      number(item.open),
      'navy',
      `${number(item.refUnits)} unid. ref.`
    )).join('') || empty('No hay cuentas abiertas.');

    const priority = openRows
      .sort((a, b) => b.info.refUnits - a.info.refUnits || b.info.items.length - a.info.items.length)
      .slice(0, 10);
    $('v14AccountsCount').textContent = `${number(openRows.length)} cuentas abiertas en el filtro`;
    $('v14AccountsPriority').innerHTML = priority.map(item => `
      <tr>
        <td><strong>${esc(item.row.cliente)}</strong><div class="mut">${esc(item.row.ruc || '')}</div></td>
        <td>${esc(canonicalExecutive(item.row.ejecutivo, item.row.ruc) || 'Sin KAM')}</td>
        <td>${esc(MONTH_NAME[item.row.mesOrigen] || item.row.mesOrigen || '')}</td>
        <td>${number(item.info.items.length)}</td>
        <td class="right"><strong>${number(item.info.refUnits)}</strong></td>
        <td>${statusBadge(item.info.state)}</td>
      </tr>`).join('') || '<tr><td colspan="6">No hay cuentas en curso para el filtro seleccionado.</td></tr>';
  }

  function renderAll() {
    if (!$('v14SummaryKpis')) return;
    normalizeNames();
    const list = filteredRows();
    const data = aggregate(list);
    renderFilterContext(list, data);
    renderSummary(list, data);
    renderFunds(list, data);
    renderAccounts(list);

    const version = document.querySelector('.version');
    if (version?.firstChild) version.firstChild.textContent = VERSION;
    const title = document.querySelector('.top h1');
    if (title) title.textContent = 'HONOR–Entel · Panel de Aportes B2B';
    const subtitle = document.querySelector('.top .mut');
    if (subtitle) subtitle.textContent = 'Vista ejecutiva para dirección, control financiero y gestión de cuentas';
  }

  let timer = null;
  function scheduleRender(delay = 0) {
    clearTimeout(timer);
    timer = setTimeout(renderAll, delay);
  }

  function bind() {
    ['fMonth', 'fChannel', 'fExec', 'fState', 'fCloseMonth', 'fCloseYear'].forEach(id => {
      $(id)?.addEventListener('change', () => scheduleRender(20));
    });
    $('fSearch')?.addEventListener('input', () => scheduleRender(20));
    $('clearFilters')?.addEventListener('click', () => scheduleRender(80));
    document.querySelectorAll('[data-v13-view]').forEach(button => {
      button.addEventListener('click', () => scheduleRender(20));
    });

    const sync = $('syncText');
    if (sync) new MutationObserver(() => scheduleRender(50)).observe(sync, {
      childList: true, subtree: true, characterData: true
    });
    const accountRows = $('accountRows');
    if (accountRows) new MutationObserver(() => scheduleRender(80)).observe(accountRows, {
      childList: true, subtree: true
    });
  }

  function start(attempt = 0) {
    if (typeof DATA === 'undefined' || !$('v13Summary') || !$('v13Funds') || !$('v13AccountAnalysis')) {
      if (attempt < 60) setTimeout(() => start(attempt + 1), 150);
      return;
    }
    installStyles();
    if (!mount()) return;
    bind();
    renderAll();
    setTimeout(renderAll, 700);
    setTimeout(renderAll, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(), { once: true });
  else start();
})();
