/* HONOR–Entel · filtros reactivos + tendencia ejecutiva v16 */
(() => {
  'use strict';

  if (window.__HONOR_PANEL_V16_FILTERS__) return;
  window.__HONOR_PANEL_V16_FILTERS__ = true;

  const VERSION = 'V20261102.5 · FILTROS + TENDENCIA';
  const MONTHS = ['may-26', 'jun-26', 'jul-26', 'ago-26', 'sep-26', 'oct-26', 'nov-26', 'dic-26'];
  const MONTH_NAME = {
    'may-26': 'Mayo', 'jun-26': 'Junio', 'jul-26': 'Julio', 'ago-26': 'Agosto',
    'sep-26': 'Septiembre', 'oct-26': 'Octubre', 'nov-26': 'Noviembre', 'dic-26': 'Diciembre'
  };
  const CANONICAL_NAME = 'Fiorella Zoe Canales Gomez';
  const TARGET_RUCS = new Set(['20114803228', '20100318696']);
  const FILTER_IDS = ['fMonth', 'fChannel', 'fExec', 'fState', 'fCloseMonth', 'fCloseYear'];

  const $ = id => document.getElementById(id);
  const n = value => {
    const parsed = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n(value));
  const money = value => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(n(value));
  const percent = value => `${Math.round(Number(value) || 0)}%`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
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

  function normalizeState(value) {
    const key = normalize(value);
    if (!key) return '';
    if (key === 'ganada') return 'Ganada';
    if (key === 'perdida') return 'Perdida';
    if (['en proceso', 'en curso', 'por definir', 'sin definir'].includes(key)) return 'En curso';
    return String(value || '');
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
    let state = normalizeState(row.estado || 'En curso') || 'En curso';
    if (Array.isArray(row.modelItems) && row.modelItems.length) {
      state = hasOpen ? 'En curso' : (hasWon ? 'Ganada' : 'Perdida');
    }

    const pending = hasOpen ? Math.max(0, approved - cost) : 0;
    const released = Math.max(0, approved - cost - pending);
    return { items, approved, wonUnits, cost, pending, released, state, refUnits: n(row.unidades) };
  }

  function readFilters({ ignoreMonth = false } = {}) {
    return {
      month: ignoreMonth ? '' : ($('fMonth')?.value || ''),
      channel: $('fChannel')?.value || '',
      executive: $('fExec')?.value || '',
      state: normalizeState($('fState')?.value || ''),
      closeMonth: $('fCloseMonth')?.value || '',
      closeYear: $('fCloseYear')?.value || '',
      query: normalize($('fSearch')?.value || '')
    };
  }

  function filteredRows(options = {}) {
    const f = readFilters(options);
    return rows().filter(row => {
      const info = metrics(row);
      const rowExecutive = canonicalExecutive(row.ejecutivo, row.ruc);
      const searchable = normalize([
        row.cliente, row.ruc, rowExecutive, row.canal, row.modelos,
        info.items.map(item => item.modelo).join(' '), row.comentario, row.nota
      ].join(' '));
      return (!f.month || row.mesOrigen === f.month)
        && (!f.channel || row.canal === f.channel)
        && (!f.executive || rowExecutive === f.executive)
        && (!f.state || info.state === f.state)
        && (!f.closeMonth || (f.closeMonth === 'SIN' ? !row.mesCierre : row.mesCierre === f.closeMonth))
        && (!f.closeYear || String(row.anioCierre || '') === f.closeYear)
        && (!f.query || searchable.includes(f.query));
    });
  }

  function aggregate(list) {
    const out = {
      clients: new Set(), ops: 0, won: 0, lost: 0, open: 0,
      refUnits: 0, wonUnits: 0, approved: 0, cost: 0, pending: 0, released: 0
    };
    list.forEach(row => {
      const info = metrics(row);
      out.clients.add(row.ruc || row.cliente || row.id);
      out.ops += 1;
      out.refUnits += info.refUnits;
      out.wonUnits += info.wonUnits;
      out.approved += info.approved;
      out.cost += info.cost;
      out.pending += info.pending;
      out.released += info.released;
      if (info.state === 'Ganada') out.won += 1;
      else if (info.state === 'Perdida') out.lost += 1;
      else out.open += 1;
    });
    out.closed = out.won + out.lost;
    out.winRate = out.closed ? out.won / out.closed * 100 : 0;
    out.executionRate = out.approved ? out.cost / out.approved * 100 : 0;
    return out;
  }

  function monthData(list) {
    const extras = [...new Set(list.map(row => row.mesOrigen).filter(Boolean))].filter(month => !MONTHS.includes(month));
    return [...MONTHS, ...extras]
      .map(month => {
        const monthRows = list.filter(row => row.mesOrigen === month);
        return { month, label: MONTH_NAME[month] || month, list: monthRows, data: aggregate(monthRows) };
      })
      .filter(item => item.list.length > 0);
  }

  function kamData(list) {
    const map = new Map();
    list.forEach(row => {
      const name = canonicalExecutive(row.ejecutivo, row.ruc) || 'Sin KAM';
      const info = metrics(row);
      const item = map.get(name) || {
        name, ops: 0, won: 0, lost: 0, open: 0,
        refUnits: 0, wonUnits: 0, approved: 0, cost: 0, pending: 0
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
        name, ops: 0, won: 0, lost: 0, open: 0,
        refUnits: 0, wonUnits: 0, approved: 0, cost: 0, pending: 0
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
          name, accounts: new Set(), refUnits: 0, wonUnits: 0, approved: 0, cost: 0, pending: 0
        };
        item.accounts.add(row.id);
        item.refUnits += model.unidades;
        item.wonUnits += model.estado === 'Ganada' ? model.unidadesGanadas : 0;
        const potential = model.unidades * model.aporteUnitario;
        const confirmed = model.estado === 'Ganada' ? model.unidadesGanadas * model.aporteUnitario : 0;
        const pending = (model.estado === 'En curso' || model.estado === 'Sin definir')
          ? Math.max(0, potential - confirmed)
          : 0;
        item.approved += potential;
        item.cost += confirmed;
        item.pending += pending;
        map.set(name, item);
      });
    });
    return [...map.values()];
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
    if (state?.value) parts.push(state.options[state.selectedIndex]?.textContent || state.value);
    if ($('fSearch')?.value) parts.push(`Buscar: ${$('fSearch').value}`);
    return parts.length ? parts.join(' · ') : 'Vista general';
  }

  function kpi(label, value, sub, tone = '') {
    return `<article class="v14-kpi ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub || '')}</small></article>`;
  }

  function empty(message = 'Sin datos para el filtro seleccionado.') {
    return `<div class="v14-empty">${esc(message)}</div>`;
  }

  function barRow(label, value, max, formatted, tone = 'navy', meta = '') {
    const width = max > 0 ? Math.max(value > 0 ? 3 : 0, value / max * 100) : 0;
    return `<div class="v14-bar-row"><div class="v14-bar-label" title="${esc(label)}">${esc(label)}</div><div class="v14-track"><i class="${tone}" style="width:${width}%"></i></div><div class="v14-bar-value"><b>${esc(formatted)}</b>${meta ? `<small>${esc(meta)}</small>` : ''}</div></div>`;
  }

  function statusBadge(state) {
    const tone = state === 'Ganada' ? 'good' : state === 'Perdida' ? 'bad' : 'open';
    return `<span class="v14-badge ${tone}">${esc(state)}</span>`;
  }

  function ensureCompatibilityNodes() {
    const filters = document.querySelector('.filters');
    const grid = filters?.querySelector('.filters-grid');
    let totals = $('filterTotals');
    if (filters && !totals) {
      totals = document.createElement('div');
      totals.id = 'filterTotals';
      totals.className = 'kpis';
      if (grid?.nextSibling) filters.insertBefore(totals, grid.nextSibling);
      else filters.appendChild(totals);
    }
    if (totals) {
      totals.setAttribute('aria-hidden', 'true');
      totals.style.setProperty('display', 'none', 'important');
    }
    const context = $('v14FilterContext');
    if (context) context.style.setProperty('display', 'none', 'important');
  }

  function repairFilterValues() {
    rows().forEach(row => { row.ejecutivo = canonicalExecutive(row.ejecutivo, row.ruc); });
    const state = $('fState');
    if (state) {
      [...state.options].forEach(option => {
        if (normalize(option.value || option.textContent) === 'en proceso') option.value = 'En curso';
      });
    }
  }

  function installStyles() {
    if ($('v16TrendStyle')) return;
    const style = document.createElement('style');
    style.id = 'v16TrendStyle';
    style.textContent = `
      #filterTotals,#v14FilterContext{display:none!important}
      .v16-trend-card{background:#fff;border:1px solid #e4e7ec;border-radius:13px;padding:15px;box-shadow:0 5px 18px rgba(23,32,42,.035)}
      .v16-trend-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:13px;flex-wrap:wrap}
      .v16-trend-title{font-size:13px;font-weight:850;color:#17202a}
      .v16-trend-sub{font-size:10px;color:#667085;margin-top:3px;line-height:1.4}
      .v16-trend-period{font-size:10px;font-weight:800;color:#315f91;background:#edf4fb;border:1px solid #d8e7f4;border-radius:999px;padding:6px 10px}
      .v16-trend-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:14px}
      .v16-trend-stat{background:#f7f8fa;border-radius:10px;padding:11px}
      .v16-trend-stat span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.35px;font-weight:800;color:#667085}
      .v16-trend-stat b{display:block;font-size:19px;color:#17202a;margin:5px 0 3px}
      .v16-trend-stat small{font-size:9px;font-weight:750}
      .v16-up{color:#247a4b}.v16-down{color:#c91f26}.v16-flat{color:#667085}
      .v16-trend-table{display:grid;gap:7px}
      .v16-trend-row{display:grid;grid-template-columns:76px minmax(90px,1fr) 92px 105px 112px;gap:8px;align-items:center;padding:7px 9px;border:1px solid transparent;border-radius:9px}
      .v16-trend-row.selected{background:#f4f7fb;border-color:#d8e7f4}
      .v16-trend-row>strong{font-size:10px;color:#344054}
      .v16-trend-track{height:9px;background:#edf0f3;border-radius:999px;overflow:hidden}
      .v16-trend-track i{display:block;height:100%;background:#315f91;border-radius:999px;transition:width .25s ease}
      .v16-trend-row span{font-size:9px;color:#667085;text-align:right;white-space:nowrap}
      .v16-trend-row span b{color:#344054;font-size:10px}
      @media(max-width:760px){.v16-trend-summary{grid-template-columns:1fr}.v16-trend-row{grid-template-columns:64px 1fr 80px}.v16-trend-row span:nth-last-child(-n+2){grid-column:2/4;text-align:left}}
    `;
    document.head.appendChild(style);
  }

  function mountTrend() {
    const summary = $('v13Summary');
    if (!summary) return false;
    if ($('v16TrendCard')) return true;
    summary.insertAdjacentHTML('beforeend', `
      <section id="v16TrendCard" class="v16-trend-card">
        <div class="v16-trend-head"><div><div class="v16-trend-title">Tendencia mensual</div><div class="v16-trend-sub">Evolución de oportunidades, unidades ganadas y costo confirmado. El mes filtrado se resalta.</div></div><span id="v16TrendPeriod" class="v16-trend-period">Vista general</span></div>
        <div id="v16TrendSummary" class="v16-trend-summary"></div>
        <div id="v16TrendRows" class="v16-trend-table"></div>
      </section>`);
    return true;
  }

  function renderSummary(list, data) {
    const openRows = list.map(row => ({ row, info: metrics(row) })).filter(item => item.info.state === 'En curso');
    const openUnits = openRows.reduce((sum, item) => sum + item.info.refUnits, 0);
    if ($('v14SummaryScope')) $('v14SummaryScope').textContent = currentScope();
    if ($('v14SummaryKpis')) $('v14SummaryKpis').innerHTML = [
      kpi('Oportunidades', number(data.ops), `${number(data.clients.size)} clientes`),
      kpi('Tasa de éxito', percent(data.winRate), `${number(data.won)} ganadas de ${number(data.closed)} cerradas`, 'good'),
      kpi('Cartera en curso', number(data.open), `${number(openUnits)} unidades en evaluación`, 'open'),
      kpi('Unidades ganadas', number(data.wonUnits), `${number(data.won)} oportunidades ganadas`, 'good')
    ].join('');

    const total = Math.max(1, data.ops);
    if ($('v14PortfolioStatus')) $('v14PortfolioStatus').innerHTML = `
      <div class="v14-status-strip"><i style="width:${data.won / total * 100}%;background:#247a4b">${data.won ? number(data.won) : ''}</i><i style="width:${data.lost / total * 100}%;background:#c91f26">${data.lost ? number(data.lost) : ''}</i><i style="width:${data.open / total * 100}%;background:#315f91">${data.open ? number(data.open) : ''}</i></div>
      <div class="v14-status-grid"><div class="v14-status-item"><span>Ganadas</span><b style="color:#247a4b">${number(data.won)}</b></div><div class="v14-status-item"><span>Perdidas</span><b style="color:#c91f26">${number(data.lost)}</b></div><div class="v14-status-item"><span>En curso</span><b style="color:#315f91">${number(data.open)}</b></div></div>`;

    const months = monthData(list);
    if ($('v14MonthlyOutcome')) $('v14MonthlyOutcome').innerHTML = months.map(item => {
      const monthTotal = Math.max(1, item.data.ops);
      return `<div class="v14-month-row"><strong>${esc(item.label)}</strong><div class="v14-mini-stack"><i style="width:${item.data.won / monthTotal * 100}%;background:#247a4b"></i><i style="width:${item.data.lost / monthTotal * 100}%;background:#c91f26"></i><i style="width:${item.data.open / monthTotal * 100}%;background:#315f91"></i></div><span>G ${number(item.data.won)} · P ${number(item.data.lost)} · EC ${number(item.data.open)}</span></div>`;
    }).join('') || empty();

    const channels = channelData(list).sort((a, b) => b.ops - a.ops);
    if ($('v14ChannelMix')) $('v14ChannelMix').innerHTML = channels.map(item => {
      const closed = item.won + item.lost;
      const conversion = closed ? item.won / closed * 100 : 0;
      return `<div class="v14-channel-row"><strong title="${esc(item.name)}">${esc(item.name)}</strong><span><b>${number(item.ops)}</b>oportunidades</span><span><b>${number(item.wonUnits)}</b>unid. ganadas</span><span><b>${percent(conversion)}</b>éxito</span></div>`;
    }).join('') || empty();

    const kamOpen = kamData(list).filter(item => item.open > 0).sort((a, b) => b.open - a.open || b.refUnits - a.refUnits)[0];
    const largestOpen = openRows.slice().sort((a, b) => b.info.refUnits - a.info.refUnits)[0];
    const bestMonth = months.slice().sort((a, b) => b.data.wonUnits - a.data.wonUnits)[0];
    const insights = [];
    if (kamOpen) insights.push({ icon: '1', title: 'Mayor carga abierta', text: `${kamOpen.name}: ${number(kamOpen.open)} cuentas en curso.` });
    if (largestOpen) insights.push({ icon: '2', title: 'Mayor oportunidad abierta', text: `${largestOpen.row.cliente}: ${number(largestOpen.info.refUnits)} unidades referenciales.` });
    if (bestMonth && bestMonth.data.wonUnits > 0) insights.push({ icon: '3', title: 'Mes con más unidades ganadas', text: `${bestMonth.label}: ${number(bestMonth.data.wonUnits)} unidades confirmadas.` });
    if (!insights.length) insights.push({ icon: '—', title: 'Sin señales disponibles', text: 'El filtro actual no contiene cuentas suficientes para generar una lectura.' });
    if ($('v14DirectorInsights')) $('v14DirectorInsights').innerHTML = insights.slice(0, 3).map(item => `<div class="v14-insight"><i>${esc(item.icon)}</i><div><b>${esc(item.title)}</b><span>${esc(item.text)}</span></div></div>`).join('');
  }

  function renderFunds(list, data) {
    if ($('v14FundsScope')) $('v14FundsScope').textContent = currentScope();
    if ($('v14FundsKpis')) $('v14FundsKpis').innerHTML = [
      kpi('Aporte aprobado', money(data.approved), 'Referencia total del filtro', 'money'),
      kpi('Costo confirmado', money(data.cost), `${number(data.wonUnits)} unidades ganadas`, 'good'),
      kpi('Aporte pendiente', money(data.pending), `${money(data.released)} ya liberado`, 'open'),
      kpi('Nivel de ejecución', percent(data.executionRate), 'Confirmado sobre aprobado', 'money')
    ].join('');

    const months = monthData(list);
    const max = Math.max(1, ...months.flatMap(item => [item.data.approved, item.data.cost, item.data.pending]));
    if ($('v14FundsMonths')) $('v14FundsMonths').innerHTML = months.map(item => `<div class="v14-fin-row"><strong>${esc(item.label)}</strong><div class="v14-fin-bars"><div class="v14-fin-track"><i style="width:${item.data.approved / max * 100}%;background:#98a2b3"></i></div><div class="v14-fin-track"><i style="width:${item.data.cost / max * 100}%;background:#247a4b"></i></div><div class="v14-fin-track"><i style="width:${item.data.pending / max * 100}%;background:#315f91"></i></div></div><span>${money(item.data.cost)} conf. · ${money(item.data.pending)} pend.</span></div>`).join('') || empty();

    const channels = channelData(list).filter(item => item.pending > 0).sort((a, b) => b.pending - a.pending);
    const maxChannel = Math.max(1, ...channels.map(item => item.pending));
    if ($('v14FundsChannels')) $('v14FundsChannels').innerHTML = channels.map(item => barRow(item.name, item.pending, maxChannel, money(item.pending), 'navy', `${item.open} cuentas abiertas`)).join('') || empty('No hay aporte pendiente.');

    const openAccounts = list.map(row => ({ row, info: metrics(row) })).filter(item => item.info.pending > 0).sort((a, b) => b.info.pending - a.info.pending).slice(0, 7);
    if ($('v14FundsAccounts')) $('v14FundsAccounts').innerHTML = openAccounts.map(item => `<tr><td><strong>${esc(item.row.cliente)}</strong></td><td>${esc(canonicalExecutive(item.row.ejecutivo, item.row.ruc) || 'Sin KAM')}</td><td>${esc(MONTH_NAME[item.row.mesOrigen] || item.row.mesOrigen || '')}</td><td class="right"><strong>${money(item.info.pending)}</strong></td></tr>`).join('') || '<tr><td colspan="4">No hay cuentas con aporte pendiente.</td></tr>';

    const models = modelData(list).filter(item => item.cost > 0 || item.pending > 0).sort((a, b) => (b.cost + b.pending) - (a.cost + a.pending)).slice(0, 7);
    const maxModel = Math.max(1, ...models.map(item => item.cost + item.pending));
    if ($('v14FundsModels')) $('v14FundsModels').innerHTML = models.map(item => barRow(item.name, item.cost + item.pending, maxModel, money(item.cost), item.cost >= item.pending ? 'green' : 'amber', `${money(item.pending)} pendiente`)).join('') || empty();
  }

  function renderAccounts(list) {
    const openRows = list.map(row => ({ row, info: metrics(row) })).filter(item => item.info.state === 'En curso');
    const openUnits = openRows.reduce((sum, item) => sum + item.info.refUnits, 0);
    const openKams = new Set(openRows.map(item => canonicalExecutive(item.row.ejecutivo, item.row.ruc) || 'Sin KAM'));
    const average = openRows.length ? openUnits / openRows.length : 0;

    if ($('v14AccountsScope')) $('v14AccountsScope').textContent = currentScope();
    if ($('v14AccountsKpis')) $('v14AccountsKpis').innerHTML = [
      kpi('Cuentas en curso', number(openRows.length), 'Requieren seguimiento', 'open'),
      kpi('KAM con cartera activa', number(openKams.size), 'Responsables con cuentas abiertas'),
      kpi('Unidades en evaluación', number(openUnits), 'Volumen referencial abierto', 'open'),
      kpi('Promedio por cuenta', number(average), 'Unidades por oportunidad abierta')
    ].join('');

    const months = monthData(list).map(item => {
      const open = item.list.map(row => ({ row, info: metrics(row) })).filter(entry => entry.info.state === 'En curso');
      return { label: item.label, accounts: open.length, units: open.reduce((sum, entry) => sum + entry.info.refUnits, 0) };
    });
    const maxUnits = Math.max(1, ...months.map(item => item.units));
    if ($('v14AccountsMonths')) $('v14AccountsMonths').innerHTML = months.map(item => `<div class="v14-pipeline-row"><strong>${esc(item.label)}</strong><div class="v14-track"><i class="navy" style="width:${item.units / maxUnits * 100}%"></i></div><span>${number(item.accounts)} cuentas · ${number(item.units)} unid.</span></div>`).join('') || empty();

    const kams = kamData(list).filter(item => item.open > 0).sort((a, b) => b.open - a.open || b.refUnits - a.refUnits).slice(0, 8);
    const maxOpen = Math.max(1, ...kams.map(item => item.open));
    if ($('v14AccountsKam')) $('v14AccountsKam').innerHTML = kams.map(item => barRow(item.name, item.open, maxOpen, number(item.open), 'navy', `${number(item.refUnits)} unid. ref.`)).join('') || empty('No hay cuentas abiertas.');

    const priority = openRows.slice().sort((a, b) => b.info.refUnits - a.info.refUnits || b.info.items.length - a.info.items.length).slice(0, 10);
    if ($('v14AccountsCount')) $('v14AccountsCount').textContent = `${number(openRows.length)} cuentas abiertas en el filtro`;
    if ($('v14AccountsPriority')) $('v14AccountsPriority').innerHTML = priority.map(item => `<tr><td><strong>${esc(item.row.cliente)}</strong><div class="mut">${esc(item.row.ruc || '')}</div></td><td>${esc(canonicalExecutive(item.row.ejecutivo, item.row.ruc) || 'Sin KAM')}</td><td>${esc(MONTH_NAME[item.row.mesOrigen] || item.row.mesOrigen || '')}</td><td>${number(item.info.items.length)}</td><td class="right"><strong>${number(item.info.refUnits)}</strong></td><td>${statusBadge(item.info.state)}</td></tr>`).join('') || '<tr><td colspan="6">No hay cuentas en curso para el filtro seleccionado.</td></tr>';
  }

  function renderTrend() {
    if (!mountTrend()) return;
    const base = filteredRows({ ignoreMonth: true });
    const selectedMonth = $('fMonth')?.value || '';
    const ordered = monthData(base);
    if (!ordered.length) {
      $('v16TrendPeriod').textContent = 'Sin datos';
      $('v16TrendSummary').innerHTML = '';
      $('v16TrendRows').innerHTML = '<div class="v14-empty">No hay información para construir la tendencia con los filtros seleccionados.</div>';
      return;
    }

    let targetIndex = selectedMonth ? ordered.findIndex(item => item.month === selectedMonth) : ordered.length - 1;
    if (targetIndex < 0) targetIndex = ordered.length - 1;
    const current = ordered[targetIndex];
    const previous = targetIndex > 0 ? ordered[targetIndex - 1] : null;

    const deltaInfo = (currentValue, previousValue) => {
      const curr = Number(currentValue) || 0;
      const prev = Number(previousValue) || 0;
      if (!prev && !curr) return { cls: 'v16-flat', text: 'Sin variación' };
      if (!prev) return { cls: 'v16-up', text: '▲ Inicio de actividad' };
      const pct = Math.round((curr - prev) / Math.abs(prev) * 100);
      if (pct > 0) return { cls: 'v16-up', text: `▲ ${pct}% vs. mes anterior` };
      if (pct < 0) return { cls: 'v16-down', text: `▼ ${Math.abs(pct)}% vs. mes anterior` };
      return { cls: 'v16-flat', text: 'Sin variación' };
    };

    const opsDelta = deltaInfo(current.data.ops, previous?.data.ops || 0);
    const unitsDelta = deltaInfo(current.data.wonUnits, previous?.data.wonUnits || 0);
    const costDelta = deltaInfo(current.data.cost, previous?.data.cost || 0);
    $('v16TrendPeriod').textContent = previous ? `${current.label} vs. ${previous.label}` : current.label;
    $('v16TrendSummary').innerHTML = `
      <div class="v16-trend-stat"><span>Oportunidades</span><b>${number(current.data.ops)}</b><small class="${opsDelta.cls}">${esc(opsDelta.text)}</small></div>
      <div class="v16-trend-stat"><span>Unidades ganadas</span><b>${number(current.data.wonUnits)}</b><small class="${unitsDelta.cls}">${esc(unitsDelta.text)}</small></div>
      <div class="v16-trend-stat"><span>Costo confirmado</span><b>${money(current.data.cost)}</b><small class="${costDelta.cls}">${esc(costDelta.text)}</small></div>`;

    const maxOps = Math.max(1, ...ordered.map(item => item.data.ops));
    $('v16TrendRows').innerHTML = ordered.map(item => `<div class="v16-trend-row ${item.month === current.month ? 'selected' : ''}"><strong>${esc(item.label)}</strong><div class="v16-trend-track"><i style="width:${Math.max(item.data.ops ? 4 : 0, item.data.ops / maxOps * 100)}%"></i></div><span><b>${number(item.data.ops)}</b> cuentas</span><span><b>${number(item.data.wonUnits)}</b> unid. gan.</span><span><b>${money(item.data.cost)}</b> confirmado</span></div>`).join('');
  }

  function filterOperationalRows(list) {
    const ids = new Set(list.map(row => String(row.id)));
    document.querySelectorAll('#accountRows tr').forEach(row => {
      const button = row.querySelector('[data-edit]');
      if (!button) return;
      let id = button.dataset.edit || '';
      try { id = decodeURIComponent(id); } catch {}
      row.style.display = ids.has(String(id)) ? '' : 'none';
    });
    document.querySelectorAll('#accountCards .account-card').forEach(card => {
      const button = card.querySelector('[data-edit]');
      if (!button) return;
      let id = button.dataset.edit || '';
      try { id = decodeURIComponent(id); } catch {}
      card.style.display = ids.has(String(id)) ? '' : 'none';
    });
    if ($('activeFilter')) $('activeFilter').innerHTML = `Filtro activo: <b>${esc(currentScope())}</b> · ${number(aggregate(list).clients.size)} cliente(s)`;
  }

  function setVersion() {
    const version = document.querySelector('.version');
    if (!version) return;
    const textNode = [...version.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = VERSION;
    else version.insertBefore(document.createTextNode(VERSION), version.firstChild);
  }

  function renderEverything() {
    repairFilterValues();
    ensureCompatibilityNodes();
    const list = filteredRows();
    const data = aggregate(list);
    renderSummary(list, data);
    renderFunds(list, data);
    renderAccounts(list);
    renderTrend();
    filterOperationalRows(list);
    setVersion();
    document.body.dataset.v16FilteredCount = String(list.length);
  }

  let renderTimer = null;
  function scheduleRender(delay = 25) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderEverything, delay);
  }

  function bindFilters() {
    FILTER_IDS.forEach(id => {
      const element = $(id);
      if (!element || element.dataset.v16Bound === '1') return;
      element.dataset.v16Bound = '1';
      element.addEventListener('change', () => {
        scheduleRender(0);
        setTimeout(renderEverything, 80);
      }, true);
    });

    const search = $('fSearch');
    if (search && search.dataset.v16Bound !== '1') {
      search.dataset.v16Bound = '1';
      search.addEventListener('input', () => scheduleRender(35), true);
    }

    const clear = $('clearFilters');
    if (clear && clear.dataset.v16Bound !== '1') {
      clear.dataset.v16Bound = '1';
      clear.addEventListener('click', () => {
        setTimeout(renderEverything, 0);
        setTimeout(renderEverything, 120);
      }, true);
    }
  }

  function start(attempt = 0) {
    if (typeof DATA === 'undefined' || !$('fMonth') || !$('v14SummaryKpis') || !$('v14FundsKpis') || !$('v14AccountsKpis')) {
      if (attempt < 150) setTimeout(() => start(attempt + 1), 100);
      return;
    }

    installStyles();
    mountTrend();
    repairFilterValues();
    ensureCompatibilityNodes();
    bindFilters();
    renderEverything();

    const accountRows = $('accountRows');
    if (accountRows) new MutationObserver(() => scheduleRender(35)).observe(accountRows, { childList: true, subtree: true });
    const sync = $('syncText');
    if (sync) new MutationObserver(() => scheduleRender(35)).observe(sync, { childList: true, subtree: true, characterData: true });

    let lastSnapshot = '';
    setInterval(() => {
      bindFilters();
      const snapshot = [
        ...FILTER_IDS.map(id => $(id)?.value || ''),
        $('fSearch')?.value || '',
        rows().length,
        $('syncText')?.textContent || ''
      ].join('|');
      if (snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        renderEverything();
      }
    }, 250);

    [250, 700, 1400, 2500].forEach(delay => setTimeout(renderEverything, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(), { once: true });
  else start();
})();
