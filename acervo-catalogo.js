/* Public display codes are separate from the original identifiers used by the editor. */
(() => {
  'use strict';
  const titleMode = 'Ordenar por Título';
  const originalMode = 'Códigos Originais';
  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
  const title = card => card.querySelector('h3')?.textContent.trim() || '';
  const original = card => card.querySelector('.document-code')?.textContent.trim() || '';
  const cinema = card => title(card) === 'Cine Regina' && original(card) === '100';
  const byTitle = (a, b) => Number(cinema(b)) - Number(cinema(a)) || collator.compare(title(a), title(b)) || Number(original(a)) - Number(original(b));
  let mode = titleMode;
  let timer;
  let observer;
  function refresh() {
    const section = document.getElementById('acervo');
    const select = section?.querySelector('.sort-select');
    if (!section || !select) return;
    observer?.disconnect();
    const cards = [...section.querySelectorAll('.document-card')];
    const alphabetical = [...cards].sort(byTitle);
    let next = 101;
    alphabetical.forEach(card => {
      const code = cinema(card) ? 100 : next++;
      card.dataset.titleCode = String(code);
      const old = card.querySelector('.document-code');
      if (!old) return;
      let badge = card.querySelector('.catalog-code');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'catalog-code';
        old.after(badge);
        badge.addEventListener('dblclick', () => {
          select.value = originalMode;
          mode = originalMode;
          refresh();
          old.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        });
      }
      badge.textContent = String(code);
      badge.title = 'Código por título · Código original: ' + original(card);
      old.hidden = mode !== originalMode;
      old.setAttribute('aria-hidden', String(mode !== originalMode));
      badge.hidden = mode === originalMode;
    });
    select.value = mode;
    const compare = mode === originalMode
      ? (a,b) => Number(original(a)) - Number(original(b))
      : mode === 'Ordenar por Autor'
      ? (a,b) => collator.compare(a.querySelector('.document-author')?.textContent || '', b.querySelector('.document-author')?.textContent || '') || byTitle(a,b)
      : mode === 'Ordenar por Data'
      ? (a,b) => (parseInt(b.querySelector('.document-year')?.textContent) || 0) - (parseInt(a.querySelector('.document-year')?.textContent) || 0) || byTitle(a,b)
      : byTitle;
    for (const id of ['visible-documents', 'hidden-documents']) {
      const grid = document.getElementById(id);
      if (!grid) continue;
      const current = [...grid.children].filter(e => e.matches('.document-card'));
      const sorted = [...current].sort(compare);
      if (sorted.some((e,i) => e !== current[i])) sorted.forEach(e => grid.appendChild(e));
    }
    section.querySelectorAll('a[href]').forEach(a => {
      const value = a.getAttribute('href');
      const pdf = window.bibliotecaPdfUrl(value);
      if (pdf !== value) a.setAttribute('href', pdf);
    });
    window.bibliotecaTitleCatalog = alphabetical.map(card => ({ codigoOriginal: original(card), codigoTitulo: Number(card.dataset.titleCode), titulo: title(card) }));
    if (window.firebaseSyncTitleCatalog) window.firebaseSyncTitleCatalog(window.bibliotecaTitleCatalog);
    observer?.observe(section, { childList: true, subtree: true, characterData: true });
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(refresh, 100); }
  window.bibliotecaDisplayCode = card => mode === originalMode ? original(card) : (card.dataset.titleCode || original(card));
  function init() {
    const select = document.querySelector('#acervo .sort-select');
    if (!select) return;
    select.addEventListener('change', e => {
      e.stopImmediatePropagation();
      mode = select.value;
      refresh();
    }, true);
    observer = new MutationObserver(schedule);
    refresh();
    document.addEventListener('click', e => { if (e.target.closest('.filter-button')) schedule(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
