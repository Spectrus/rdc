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
    const all = [...section.querySelectorAll('.document-card')];
    const identity = card => {
      const raw = card.querySelector('a.read-button,.video-thumbnail a,a.timeline-button-horizontal')?.getAttribute('href');
      if (!raw || raw === '#') return null;
      try {
        const u = new URL(window.bibliotecaPdfUrl(raw),location.href);
        const drive = u.pathname.match(/(?:\/file\/d\/|\/pdfs\/drive-)([\w-]+?)(?:\.pdf|\/|$)/);
        if (drive) return 'drive:' + drive[1];
        if (u.hostname === 'youtu.be') return 'youtube:' + u.pathname.slice(1);
        if (u.hostname.endsWith('youtube.com')) return 'youtube:' + (u.searchParams.get('v') || u.searchParams.get('list') || u.pathname);
        return u.origin + decodeURIComponent(u.pathname);
      } catch (_) { return raw; }
    };
    const keepers = new Map();
    const priority = card => ['376','377'].includes(original(card)) ? -1 : Number(original(card));
    all.forEach(card => {
      const key = identity(card);
      if (!key) return;
      const previous = keepers.get(key);
      if (!previous) keepers.set(key,card);
      else if (priority(card) < priority(previous)) { previous.remove(); keepers.set(key,card); }
      else card.remove();
    });
    const timelineKeys = new Set();
    document.querySelectorAll('.timeline-item-horizontal').forEach(item=>{
      const key=identity(item);
      if(!key)return;
      if(timelineKeys.has(key))item.remove();else timelineKeys.add(key);
    });
    const cards = all.filter(card => card.isConnected);
    document.querySelectorAll('#obras-stat .stat-number,.stat-item.obras .stat-number').forEach(el=>{el.textContent='120+';});
    window.bibliotecaUniqueCount = cards.length;
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
  function installReader() {
    if (document.getElementById('rdc-reader-dialog')) return;
    const style = document.createElement('style');
    style.textContent = `
      #rdc-reader-dialog{position:fixed;inset:auto;margin:0;box-sizing:border-box;width:min(1000px,calc(100vw - 32px));height:min(86vh,850px);max-width:none;max-height:none;padding:0;border:1px solid #d3b35d;border-radius:12px;background:#f7f0e4;color:#4a2c2a;box-shadow:0 24px 90px #0008;overflow:hidden;resize:both}
      #rdc-reader-dialog::backdrop{background:rgba(32,23,20,.78);backdrop-filter:blur(5px)}
      #rdc-reader-dialog[open]{display:flex;flex-direction:column}
      #rdc-reader-dialog header{display:flex;flex:none;align-items:center;gap:8px;padding:10px 12px;cursor:grab;touch-action:none;user-select:none;background:#f7f0e4}
      #rdc-reader-dialog header:active{cursor:grabbing}
      #rdc-reader-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0;font:600 clamp(16px,2vw,22px)/1.3 Georgia,serif}
      #rdc-reader-dialog button,#rdc-reader-dialog .rdc-reader-external{display:grid;place-items:center;flex:none;width:42px;height:42px;padding:0;border:1px solid #b4964c;border-radius:50%;background:transparent;color:#4a2c2a;font:24px/1 Georgia,serif;text-decoration:none;cursor:pointer}
      #rdc-reader-dialog button:hover,#rdc-reader-dialog .rdc-reader-external:hover{background:#e9d7a3}
      #rdc-reader-stage{position:relative;flex:1;min-height:0;background:#e7e1d8}
      #rdc-reader-stage iframe{display:block;position:absolute;inset:0;width:100%;height:100%;border:0;background:white}
      @media(max-width:480px){#rdc-reader-dialog header{gap:4px;padding:8px}#rdc-reader-dialog button,#rdc-reader-dialog .rdc-reader-external{width:36px;height:36px;font-size:21px}}
    `;
    document.head.append(style);
    const dialog = document.createElement('dialog');
    dialog.id = 'rdc-reader-dialog';
    dialog.setAttribute('aria-labelledby','rdc-reader-title');
    dialog.innerHTML = '<header><h2 id="rdc-reader-title"></h2><button type="button" data-scale=".86" aria-label="Reduzir janela" title="Reduzir janela">−</button><button type="button" data-scale="1.16" aria-label="Aumentar janela" title="Aumentar janela">+</button><a class="rdc-reader-external" target="_blank" rel="noopener noreferrer" aria-label="Abrir em nova aba" title="Abrir em nova aba">↗</a><button type="button" data-close aria-label="Fechar arquivo" title="Fechar">×</button></header><div id="rdc-reader-stage"></div>';
    document.body.append(dialog);
    const stage = dialog.querySelector('#rdc-reader-stage');
    const heading = dialog.querySelector('h2');
    const external = dialog.querySelector('.rdc-reader-external');
    const center = () => {
      const box = dialog.getBoundingClientRect();
      dialog.style.left = Math.max(8,(innerWidth-box.width)/2) + 'px';
      dialog.style.top = Math.max(8,(innerHeight-box.height)/2) + 'px';
    };
    dialog.querySelectorAll('[data-scale]').forEach(button => button.addEventListener('click', () => {
      const box = dialog.getBoundingClientRect();
      const factor = Number(button.dataset.scale);
      dialog.style.width = Math.max(320,Math.min(innerWidth-16,box.width*factor)) + 'px';
      dialog.style.height = Math.max(240,Math.min(innerHeight-16,box.height*factor)) + 'px';
      requestAnimationFrame(center);
    }));
    let drag;
    const header = dialog.querySelector('header');
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button,a')) return;
      const box = dialog.getBoundingClientRect();
      drag = {id:event.pointerId,x:event.clientX,y:event.clientY,left:box.left,top:box.top};
      header.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const box = dialog.getBoundingClientRect();
      dialog.style.left = Math.max(8,Math.min(innerWidth-box.width-8,drag.left+event.clientX-drag.x)) + 'px';
      dialog.style.top = Math.max(8,Math.min(innerHeight-box.height-8,drag.top+event.clientY-drag.y)) + 'px';
    });
    const stopDrag = event => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
    };
    header.addEventListener('pointerup',stopDrag);
    header.addEventListener('pointercancel',stopDrag);
    dialog.querySelector('[data-close]').addEventListener('click',() => dialog.close());
    dialog.addEventListener('close',() => stage.replaceChildren());
    dialog.addEventListener('click',event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest('#acervo .document-card a[href]');
      if (!link || dialog.contains(link)) return;
      const card = link.closest('.document-card');
      const type = card?.querySelector('.document-type')?.textContent.trim() || '';
      const label = link.textContent.trim();
      if (!/^ler$/i.test(label) || /^(mídia|midia|vídeo|video)$/i.test(type)) return;
      let url;
      try {
        const raw = window.bibliotecaPdfUrl ? window.bibliotecaPdfUrl(link.href) : link.href;
        url = new URL(raw,location.href);
      } catch (_) { return; }
      if (!/^https?:$/.test(url.protocol)) return;
      let preview = new URL(url.href);
      if (url.hostname === 'drive.google.com') {
        const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id');
        if (id) preview = new URL('https://drive.google.com/file/d/' + id + '/preview');
      } else if (url.hostname === 'docs.google.com') {
        const id = url.pathname.match(/\/(?:document|spreadsheets|presentation)\/d\/([\w-]+)/)?.[1];
        const kind = url.pathname.split('/').filter(Boolean)[0];
        if (id && kind) preview = new URL('https://docs.google.com/' + kind + '/d/' + id + '/preview');
      }
      event.preventDefault();
      event.stopPropagation();
      heading.textContent = card?.querySelector('h3')?.textContent.trim() || 'Leitura';
      external.href = url.href;
      const iframe = document.createElement('iframe');
      iframe.title = heading.textContent;
      iframe.src = preview.href;
      iframe.allow = 'fullscreen';
      stage.replaceChildren(iframe);
      dialog.style.width = 'min(1000px,calc(100vw - 32px))';
      dialog.style.height = 'min(86vh,850px)';
      dialog.showModal();
      requestAnimationFrame(center);
    });
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
    installReader();
    refresh();
    document.addEventListener('click', e => { if (e.target.closest('.filter-button')) schedule(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
