/* HONOR–Entel · separación visual y funcional de vistas v15 */
(() => {
  'use strict';

  if (window.__HONOR_PANEL_V15_DISTINCT__) return;
  window.__HONOR_PANEL_V15_DISTINCT__ = true;

  const VERSION = 'V20261102 · VISTA DIRECTIVA';

  function removeSharedTotals() {
    ['filterTotals', 'v14FilterContext'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.remove();
    });

    document.querySelectorAll('#resKpis,#accountKpis,#followKpis,#fundKpis').forEach(element => {
      element.style.setProperty('display', 'none', 'important');
    });
  }

  function installStyles() {
    if (document.getElementById('v15DistinctStyle')) return;
    const style = document.createElement('style');
    style.id = 'v15DistinctStyle';
    style.textContent = `
      /* Ningún cuadro general permanece fuera de las pestañas. */
      #filterTotals,#v14FilterContext,.filters>.kpis{display:none!important}
      .filters{padding-bottom:14px!important}

      /* RESUMEN: una sola franja ejecutiva oscura, no cuatro tarjetas repetidas. */
      #v14SummaryKpis{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:0!important;
        padding:8px 10px!important;
        border-radius:15px!important;
        background:linear-gradient(135deg,#17202a 0%,#26384d 100%)!important;
        box-shadow:0 12px 30px rgba(23,32,42,.14)!important;
      }
      #v14SummaryKpis .v14-kpi{
        background:transparent!important;
        border:0!important;
        border-radius:0!important;
        box-shadow:none!important;
        min-height:84px!important;
        padding:13px 16px!important;
      }
      #v14SummaryKpis .v14-kpi:not(:last-child){border-right:1px solid rgba(255,255,255,.16)!important}
      #v14SummaryKpis .v14-kpi span{color:#b9c5d2!important}
      #v14SummaryKpis .v14-kpi strong{color:#fff!important;font-size:25px!important}
      #v14SummaryKpis .v14-kpi small{color:#d5dde6!important}

      /* APORTES: tarjetas financieras con lectura y colores propios. */
      #v14FundsKpis{
        display:grid!important;
        grid-template-columns:1.15fr 1.15fr 1.15fr .9fr!important;
        gap:10px!important;
      }
      #v14FundsKpis .v14-kpi{
        min-height:100px!important;
        box-shadow:none!important;
        border-width:1px!important;
        border-top-width:4px!important;
      }
      #v14FundsKpis .v14-kpi:nth-child(1){background:#fff7ed!important;border-color:#f6b56c!important}
      #v14FundsKpis .v14-kpi:nth-child(1) strong{color:#b45309!important}
      #v14FundsKpis .v14-kpi:nth-child(2){background:#effaf4!important;border-color:#6fc393!important}
      #v14FundsKpis .v14-kpi:nth-child(2) strong{color:#1f6d42!important}
      #v14FundsKpis .v14-kpi:nth-child(3){background:#eff6ff!important;border-color:#7fa9d3!important}
      #v14FundsKpis .v14-kpi:nth-child(3) strong{color:#28547d!important}
      #v14FundsKpis .v14-kpi:nth-child(4){background:#f7f8fa!important;border-color:#98a2b3!important}

      /* CUENTAS: barra operativa compacta, no tarjetas financieras ni ejecutivas. */
      #v14AccountsKpis{
        display:flex!important;
        flex-wrap:wrap!important;
        gap:0!important;
        padding:0!important;
        border:1px solid #e4e7ec!important;
        border-radius:13px!important;
        background:#fff!important;
        overflow:hidden!important;
        box-shadow:0 5px 18px rgba(23,32,42,.035)!important;
      }
      #v14AccountsKpis .v14-kpi{
        flex:1 1 180px!important;
        min-height:78px!important;
        padding:13px 16px!important;
        background:#fff!important;
        border:0!important;
        border-radius:0!important;
        box-shadow:none!important;
      }
      #v14AccountsKpis .v14-kpi:not(:last-child){border-right:1px solid #e4e7ec!important}
      #v14AccountsKpis .v14-kpi strong{font-size:22px!important;color:#17202a!important}
      #v14AccountsKpis .v14-kpi:nth-child(1){box-shadow:inset 0 3px 0 #315f91!important}
      #v14AccountsKpis .v14-kpi:nth-child(2){box-shadow:inset 0 3px 0 #667085!important}
      #v14AccountsKpis .v14-kpi:nth-child(3){box-shadow:inset 0 3px 0 #b36b00!important}
      #v14AccountsKpis .v14-kpi:nth-child(4){box-shadow:inset 0 3px 0 #247a4b!important}

      @media(max-width:1000px){
        #v14SummaryKpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        #v14SummaryKpis .v14-kpi:nth-child(2){border-right:0!important}
        #v14SummaryKpis .v14-kpi:nth-child(-n+2){border-bottom:1px solid rgba(255,255,255,.16)!important}
        #v14FundsKpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      }
      @media(max-width:620px){
        #v14SummaryKpis{grid-template-columns:1fr 1fr!important}
        #v14SummaryKpis .v14-kpi{padding:11px!important}
        #v14SummaryKpis .v14-kpi strong{font-size:20px!important}
        #v14FundsKpis{grid-template-columns:1fr!important}
        #v14AccountsKpis{display:grid!important;grid-template-columns:1fr 1fr!important}
        #v14AccountsKpis .v14-kpi{border-right:0!important;border-bottom:1px solid #e4e7ec!important}
      }
    `;
    document.head.appendChild(style);
  }

  function stabilizeHeader() {
    const version = document.querySelector('.version');
    if (!version) return;
    const textNode = [...version.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = VERSION;
  }

  function apply() {
    const summary = document.getElementById('v14SummaryKpis');
    const funds = document.getElementById('v14FundsKpis');
    const accounts = document.getElementById('v14AccountsKpis');
    if (!summary || !funds || !accounts) return false;

    installStyles();
    removeSharedTotals();
    stabilizeHeader();

    summary.setAttribute('aria-label', 'Indicadores exclusivos del resumen ejecutivo');
    funds.setAttribute('aria-label', 'Indicadores exclusivos del control de aportes');
    accounts.setAttribute('aria-label', 'Indicadores exclusivos de gestión de cuentas');
    return true;
  }

  function start(attempt = 0) {
    if (!apply()) {
      if (attempt < 100) setTimeout(() => start(attempt + 1), 120);
      return;
    }

    const observer = new MutationObserver(() => {
      removeSharedTotals();
      stabilizeHeader();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    [250, 700, 1400, 2500, 5000].forEach(delay => setTimeout(apply, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => start(), { once: true });
  } else {
    start();
  }
})();
