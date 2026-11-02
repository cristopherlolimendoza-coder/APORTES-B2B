/* HONOR–Entel · filtros reactivos + tendencia ejecutiva v16 */
(() => {
  'use strict';

  if (window.__HONOR_PANEL_V16_FILTERS__) return;
  window.__HONOR_PANEL_V16_FILTERS__ = true;

  const VERSION = 'V20261102.4 · FILTROS + TENDENCIA';
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
    if (key === 'en proceso' || key === 'en curso' || key === 'por definir' || key === 'sin definir') return 'En curso';
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
    return {
      items,
      approved,
      wonUnits,
      cost,
      pending,
      state,
      refUnits: n(row.unidades)
    };
  }

  function allFiltersExceptMonth() {
    const channel = $('fChannel')?.value || '';
    const executive = $('fExec')?.value || '';
    const state = normalizeState($('fState')?.value || '');
    const closeMonth = $('fCloseMonth')?.value || '';
    const closeYear = $('fCloseYear')?.value || '';
    const query = normalize($('fSearch')?.value || '');

    return rows().filter(row => {
      const info = metrics(row);
      const rowExecutive = canonicalExecutive(row.ejecutivo, row.ruc);
      const searchable = normalize([
        row.cliente, row.ruc, rowExecutive, row.canal, row.modelos,
        info.items.map(item => item.modelo).join(' '), row.comentario, row.nota
      ].join(' '));
      return (!channel || row.canal === channel)
        && (!executive || rowExecutive === executive)
        && (!state || info.state === state)
        && (!closeMonth || (closeMonth === 'SIN' ? !row.mesCierre : row.mesCierre === closeMonth))
        && (!closeYear || String(row.anioCierre || '') === closeYear)
        && (!query || searchable.includes(query));
    });
  }

  function aggregate(list) {
    return list.reduce((out, row) => {
      const info = metrics(row);
      out.ops += 1;
      out.refUnits += info.refUnits;
      out.wonUnits += info.wonUnits;
      out.cost += info.cost;
      out.approved += info.approved;
      out.pending += info.pending;
      if (info.state === 'Ganada') out.won += 1;
      else if (info.state === 'Perdida') out.lost += 1;
      else out.open += 1;
      return out;
    }, { ops: 0, won: 0, lost: 0, open: 0, refUnits: 0, wonUnits: 0, cost: 0, approved: 0, pending: 0 });
  }

  function repairFilterValues() {
    rows().forEach(row => {
      row.ejecutivo = canonicalExecutive(row.ejecutivo, row.ruc);
    });
    const state = $('fState');
    if (state) {
      [...state.options].forEach(option => {
        const key = normalize(option.value || option.textContent);
        if (key === 'en proceso') option.value = 'En curso';
      });
    }
  }

  function ensureHiddenCompatibilityNodes() {
    const filters = document.querySelector('.filters');
    const grid = filters?.querySelector('.filters-grid');
    if (filters && !$('filterTotals')) {
      const totals = document.createElement('div');
      totals.id = 'filterTotals';
      totals.className = 'kpis';
      totals.setAttribute('aria-hidden', 'true');
      totals.style.setProperty('display', 'none', 'important');
      if (grid?.nextSibling) filters.insertBefore(totals, grid.nextSibling);
      else filters.appendChild(totals);
    }
    const totals = $('filterTotals');
    if (totals) totals.style.setProperty('display', 'none', 'important');
    const context = $('v14FilterContext');
    if (context) context.style.setProperty('display', 'none', 'important');
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
      .v16-trend-empty{padding:16px;text-align:center;color:#667085;font-size:10px;background:#f7f8fa;border-radius:9px}
      @media(max-width:760px){
        .v16-trend-summary{grid-template-columns:1fr}
        .v16-trend-row{grid-template-columns:64px 1fr 80px}
        .v16-trend-row span:nth-last-child(-n+2){grid-column:2/4;text-align:left}
      }
    `;
    document.head.appendChild(style);
  }

  function deltaInfo(current, previous) {
    const curr = Number(current) || 0;
    const prev = Number(previous) || 0;
    if (!prev && !curr) return { cls: 'v16-flat', text: 'Sin variación' };
    if (!prev) return { cls: 'v16-up', text: '▲ Inicio de actividad' };
    const pct = Math.round((curr - prev) / Math.abs(prev) * 100);
    if (pct > 0) return { cls: 'v16-up', text: `▲ ${pct}% vs. mes anterior` };
    if (pct < 0) return { cls: 'v16-down', text: `▼ ${Math.abs(pct)}% vs. mes anterior` };
    return { cls: 'v16-flat', text: 'Sin variación' };
  }

  function mountTrend() {
    const summary = $('v13Summary');
    if (!summary) return false;
    if ($('v16TrendCard')) return true;
    summary.insertAdjacentHTML('beforeend', `
      <section id="v16TrendCard" class="v16-trend-card">
        <div class="v16-trend-head">
          <div>
            <div class="v16-trend-title">Tendencia mensual</div>
            <div class="v16-trend-sub">Evolución de oportunidades, unidades ganadas y costo confirmado. El mes filtrado se resalta.</div>
          </div>
          <span id="v16TrendPeriod" class="v16-trend-period">Vista general</span>
        </div>
        <div id="v16TrendSummary" class="v16-trend-summary"></div>
        <div id="v16TrendRows" class="v16-trend-table"></div>
      </section>`);
    return true;
  }

  function renderTrend() {
    if (!mountTrend()) return;
    const base = allFiltersExceptMonth();
    const selectedMonth = $('fMonth')?.value || '';
    const extraMonths = [...new Set(base.map(row => row.mesOrigen).filter(Boolean))].filter(month => !MONTHS.includes(month));
    const ordered = [...MONTHS, ...extraMonths]
      .map(month => ({
        month,
        label: MONTH_NAME[month] || month,
        data: aggregate(base.filter(row => row.mesOrigen === month))
      }))
      .filter(item => item.data.ops > 0 || item.month === selectedMonth);

    if (!ordered.length) {
      $('v16TrendPeriod').textContent = 'Sin datos';
      $('v16TrendSummary').innerHTML = '';
      $('v16TrendRows').innerHTML = '<div class="v16-trend-empty">No hay información para construir la tendencia con los filtros seleccionados.</div>';
      return;
    }

    let targetIndex = selectedMonth ? ordered.findIndex(item => item.month === selectedMonth) : ordered.length - 1;
    if (targetIndex < 0) targetIndex = ordered.length - 1;
    const current = ordered[targetIndex];
    const previous = targetIndex > 0 ? ordered[targetIndex - 1] : null;
    const opsDelta = deltaInfo(current.data.ops, previous?.data.ops || 0);
    const unitsDelta = deltaInfo(current.data.wonUnits, previous?.data.wonUnits || 0);
    const costDelta = deltaInfo(current.data.cost, previous?.data.cost || 0);

    $('v16TrendPeriod').textContent = previous
      ? `${current.label} vs. ${previous.label}`
      : current.label;
    $('v16TrendSummary').innerHTML = `
      <div class="v16-trend-stat"><span>Oportunidades</span><b>${number(current.data.ops)}</b><small class="${opsDelta.cls}">${esc(opsDelta.text)}</small></div>
      <div class="v16-trend-stat"><span>Unidades ganadas</span><b>${number(current.data.wonUnits)}</b><small class="${unitsDelta.cls}">${esc(unitsDelta.text)}</small></div>
      <div class="v16-trend-stat"><span>Costo confirmado</span><b>${money(current.data.cost)}</b><small class="${costDelta.cls}">${esc(costDelta.text)}</small></div>`;

    const maxOps = Math.max(1, ...ordered.map(item => item.data.ops));
    $('v16TrendRows').innerHTML = ordered.map(item => `
      <div class="v16-trend-row ${item.month === current.month ? 'selected' : ''}">
        <strong>${esc(item.label)}</strong>
        <div class="v16-trend-track"><i style="width:${Math.max(item.data.ops ? 4 : 0, item.data.ops / maxOps * 100)}%"></i></div>
        <span><b>${number(item.data.ops)}</b> cuentas</span>
        <span><b>${number(item.data.wonUnits)}</b> unid. gan.</span>
        <span><b>${money(item.data.cost)}</b> confirmado</span>
      </div>`).join('');
  }

  let lastSnapshot = '';
  let renderTimer = null;

  function snapshot() {
    return [
      ...FILTER_IDS.map(id => $(id)?.value || ''),
      $('fSearch')?.value || '',
      rows().length,
      $('syncText')?.textContent || ''
    ].join('|');
  }

  function invokeExistingRenderers() {
    repairFilterValues();
    ensureHiddenCompatibilityNodes();
    // Dispara el flujo completo: tabla original + análisis directivo.
    const month = $('fMonth');
    try {
      if (month) {
        const event = new Event('change', { bubbles: true });
        event.__honorV16Synthetic = true;
        month.dispatchEvent(event);
      }
    } catch (error) {
      console.error('HONOR filter render:', error);
    }
    renderTrend();
  }

  function scheduleRefresh(delay = 20) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      ensureHiddenCompatibilityNodes();
      invokeExistingRenderers();
      lastSnapshot = snapshot();
    }, delay);
  }

  function bindFilters() {
    FILTER_IDS.forEach(id => {
      const element = $(id);
      if (!element || element.dataset.v16Bound === '1') return;
      element.dataset.v16Bound = '1';
      element.addEventListener('change', event => {
        if (event.__honorV16Synthetic) return;
        scheduleRefresh(0);
      }, true);
    });

    const search = $('fSearch');
    if (search && search.dataset.v16Bound !== '1') {
      search.dataset.v16Bound = '1';
      search.addEventListener('input', event => {
        if (event.__honorV16Synthetic) return;
        scheduleRefresh(40);
      }, true);
    }

    const clear = $('clearFilters');
    if (clear && clear.dataset.v16Bound !== '1') {
      clear.dataset.v16Bound = '1';
      clear.addEventListener('click', () => {
        setTimeout(() => scheduleRefresh(0), 0);
        setTimeout(() => scheduleRefresh(0), 120);
      }, true);
    }
  }

  function setVersion() {
    const version = document.querySelector('.version');
    if (!version) return;
    const textNode = [...version.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = VERSION;
    else version.insertBefore(document.createTextNode(VERSION), version.firstChild);
  }

  function start(attempt = 0) {
    if (typeof DATA === 'undefined' || !$('fMonth') || !$('v14SummaryKpis')) {
      if (attempt < 120) setTimeout(() => start(attempt + 1), 100);
      return;
    }

    installStyles();
    repairFilterValues();
    ensureHiddenCompatibilityNodes();
    bindFilters();
    mountTrend();
    setVersion();
    scheduleRefresh(0);

    // Respaldo: detecta cambios de valor hechos por scripts o por el navegador.
    setInterval(() => {
      const current = snapshot();
      if (current !== lastSnapshot) {
        bindFilters();
        setVersion();
        scheduleRefresh(0);
      }
    }, 300);

    const sync = $('syncText');
    if (sync) new MutationObserver(() => scheduleRefresh(30)).observe(sync, {
      childList: true, subtree: true, characterData: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => start(), { once: true });
  } else {
    start();
  }
})();
