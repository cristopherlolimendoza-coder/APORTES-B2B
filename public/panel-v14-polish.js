/* HONOR–Entel · v14 header stability */
(() => {
  'use strict';
  if (window.__HONOR_PANEL_V14_POLISH__) return;
  window.__HONOR_PANEL_V14_POLISH__ = true;

  const VERSION = 'V20261102 · VISTA DIRECTIVA';
  const TITLE = 'HONOR–Entel · Panel de Aportes B2B';
  const SUBTITLE = 'Vista ejecutiva para dirección, control financiero y gestión de cuentas';

  function setTextNode(element, value) {
    if (!element) return;
    const node = [...element.childNodes].find(item => item.nodeType === Node.TEXT_NODE);
    if (node) {
      if (node.nodeValue.trim() !== value) node.nodeValue = value;
    } else {
      element.insertBefore(document.createTextNode(value), element.firstChild);
    }
  }

  function apply() {
    if (!document.getElementById('v14SummaryKpis')) return false;
    document.title = TITLE;
    const heading = document.querySelector('.top h1');
    const subtitle = document.querySelector('.top .mut');
    const version = document.querySelector('.version');
    if (heading && heading.textContent !== TITLE) heading.textContent = TITLE;
    if (subtitle && subtitle.textContent !== SUBTITLE) subtitle.textContent = SUBTITLE;
    setTextNode(version, VERSION);
    return true;
  }

  function start(attempt = 0) {
    if (!apply()) {
      if (attempt < 80) setTimeout(() => start(attempt + 1), 150);
      return;
    }
    const targets = [document.querySelector('.top'), document.querySelector('.version')].filter(Boolean);
    targets.forEach(target => new MutationObserver(apply).observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    }));
    [300, 800, 1600, 3000, 5000].forEach(delay => setTimeout(apply, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(), { once: true });
  else start();
})();
