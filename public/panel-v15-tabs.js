/* HONOR–Entel · separación real de pestañas v15 */
(() => {
  'use strict';

  if (window.__HONOR_PANEL_V15_TABS__) return;
  window.__HONOR_PANEL_V15_TABS__ = true;

  const VERSION = 'V20261102.2 · VISTA DIRECTIVA';
  const VIEWS = ['res', 'funds', 'accounts'];
  const LABELS = {
    res: 'Resumen',
    funds: 'Aportes',
    accounts: 'Cuentas'
  };

  const $ = id => document.getElementById(id);
  let activeView = 'res';
  let applying = false;
  let scheduled = false;

  function installStyles() {
    if ($('v15TabsStyle')) return;
    const style = document.createElement('style');
    style.id = 'v15TabsStyle';
    style.textContent = `
      /* Ningún KPI se comparte entre pestañas. */
      #filterTotals,
      .filters > #filterTotals,
      .filters > .kpis,
      #resKpis,
      #accountKpis,
      #followKpis,
      #fundKpis { display:none!important; }

      /* Solo puede existir una vista activa. */
      #res,#funds,#accounts,#follow { display:none!important; }
      #res.v15-active,#funds.v15-active,#accounts.v15-active { display:block!important; }

      /* Retira todos los paneles heredados de Resumen y Aportes. */
      #res > :not(#v13Summary),
      #funds > :not(#v13Funds) { display:none!important; }

      /* En Cuentas se conserva la operación: acceso, tabla y edición. */
      #accounts > .kpis,
      #accounts > #accountKpis { display:none!important; }
      #v13Summary,#v13Funds,#v13AccountAnalysis { width:100%; }

      .tabs[data-v15-tabs="1"] {
        display:grid!important;
        grid-template-columns:repeat(3,minmax(140px,1fr))!important;
        max-width:720px;
        margin-left:auto;
        margin-right:auto;
      }
      .tabs[data-v15-tabs="1"] .tab { min-width:0!important; }
      .tabs[data-v15-tabs="1"] .tab.on {
        background:#17202a!important;
        color:#fff!important;
      }
      .v15-tab-note {
        margin:8px 2px 0;
        font-size:10px;
        color:#667085;
        text-align:right;
      }
      @media(max-width:720px){
        .tabs[data-v15-tabs="1"]{display:grid!important;grid-template-columns:repeat(3,1fr)!important;max-width:none}
        .tabs[data-v15-tabs="1"] .tab{font-size:11px;padding:9px 6px}
        .v15-tab-note{text-align:left}
      }
    `;
    document.head.appendChild(style);
  }

  function removeSharedPanels() {
    // La fila que generaba los mismos cuadros sobre las tres pestañas.
    $('filterTotals')?.remove();

    // Totales heredados que algunos scripts antiguos intentan volver a mostrar.
    ['resKpis', 'accountKpis', 'followKpis', 'fundKpis'].forEach(id => {
      const element = $(id);
      if (element) {
        element.replaceChildren();
        element.style.setProperty('display', 'none', 'important');
      }
    });

    // Elimina cualquier grilla KPI que haya quedado directamente dentro de filtros.
    document.querySelectorAll('.filters > .kpis').forEach(element => element.remove());
  }

  function setVersion() {
    const version = document.querySelector('.version');
    if (!version) return;
    const textNode = [...version.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = VERSION;
    else version.insertBefore(document.createTextNode(VERSION), version.firstChild);
  }

  function setView(view) {
    if (!VIEWS.includes(view)) view = 'res';
    activeView = view;

    VIEWS.forEach(id => {
      const section = $(id);
      if (!section) return;
      const selected = id === view;
      section.classList.toggle('v15-active', selected);
      section.classList.toggle('on', selected);
      section.setAttribute('aria-hidden', selected ? 'false' : 'true');
    });

    const follow = $('follow');
    if (follow) {
      follow.classList.remove('on', 'v15-active');
      follow.setAttribute('aria-hidden', 'true');
    }

    document.querySelectorAll('[data-v15-view]').forEach(button => {
      const selected = button.dataset.v15View === view;
      button.classList.toggle('on', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    });

    document.body.dataset.v15View = view;
  }

  function rebuildNavigation() {
    const nav = document.querySelector('.tabs');
    if (!nav) return false;

    if (nav.dataset.v15Tabs !== '1') {
      nav.dataset.v15Tabs = '1';
      nav.setAttribute('role', 'tablist');
      nav.innerHTML = VIEWS.map(view =>
        `<button type="button" class="tab" role="tab" data-v15-view="${view}">${LABELS[view]}</button>`
      ).join('');

      nav.querySelectorAll('[data-v15-view]').forEach(button => {
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopImmediatePropagation();
          setView(button.dataset.v15View);
        }, true);
      });

      if (!document.querySelector('.v15-tab-note')) {
        nav.insertAdjacentHTML('afterend', '<div class="v15-tab-note">Cada pestaña presenta indicadores y análisis exclusivos.</div>');
      }
    }

    return true;
  }

  function isolateLegacyContent() {
    const summaryRoot = $('v13Summary');
    const fundsRoot = $('v13Funds');
    const accountsRoot = $('v13AccountAnalysis');

    if (summaryRoot) {
      [...$('res').children].forEach(child => {
        if (child !== summaryRoot) child.style.setProperty('display', 'none', 'important');
      });
      summaryRoot.style.removeProperty('display');
    }

    if (fundsRoot) {
      [...$('funds').children].forEach(child => {
        if (child !== fundsRoot) child.style.setProperty('display', 'none', 'important');
      });
      fundsRoot.style.removeProperty('display');
    }

    if (accountsRoot) accountsRoot.style.removeProperty('display');
  }

  function apply() {
    if (applying) return false;
    applying = true;
    try {
      if (!$('v14SummaryKpis') || !$('v14FundsKpis') || !$('v14AccountsKpis')) return false;
      installStyles();
      removeSharedPanels();
      if (!rebuildNavigation()) return false;
      isolateLegacyContent();
      setVersion();
      setView(activeView);
      return true;
    } finally {
      applying = false;
    }
  }

  function scheduleApply(delay = 0) {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      apply();
    }, delay);
  }

  function start(attempt = 0) {
    if (!apply()) {
      if (attempt < 100) setTimeout(() => start(attempt + 1), 120);
      return;
    }

    const app = document.querySelector('.app');
    if (app) {
      new MutationObserver(() => scheduleApply(20)).observe(app, {
        childList: true,
        subtree: true
      });
    }

    [250, 700, 1500, 3000, 6000].forEach(delay => setTimeout(apply, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => start(), { once: true });
  } else {
    start();
  }
})();
