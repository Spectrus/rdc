/* Public display codes are separate from the original identifiers used by the editor. */
(() => {
  'use strict';
  const titleMode = 'Ordenar por Título';
  const originalMode = 'Códigos Originais';
  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
  const title = card => card.querySelector('h3')?.textContent.trim() || '';
  const original = card => card.querySelector('.document-code')?.textContent.trim() || '';
  const cinema = card => title(card) === 'Cine Regina' && original(card) === '100';
  const avelinaRank = card => {
    const t = title(card);
    if (t === 'Dona Avelina - Parte 1') return 1;
    if (t === 'Dona Avelina - Parte 2') return 2;
    return 0;
  };
  const byTitle = (a, b) => {
    const ar = avelinaRank(a), br = avelinaRank(b);
    if (ar && br) return ar - br;
    return Number(cinema(b)) - Number(cinema(a)) || collator.compare(title(a), title(b)) || Number(original(a)) - Number(original(b));
  };
  let mode = titleMode;
  let timer;
  let observer;
  const isEditor = () => document.body.classList.contains('edit-mode');
  function refresh() {
    const section = document.getElementById('acervo');
    const select = section?.querySelector('.sort-select');
    if (!section || !select) return;
    if (mode === originalMode && !isEditor()) mode = titleMode;
    observer?.disconnect();
    const all = [...section.querySelectorAll('.document-card')];
    const identity = card => {
      if (card.dataset.cloudId) return 'cloud:' + card.dataset.cloudId;
      if (card.classList.contains('user-added')) return null;
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
    document.querySelectorAll('#obras-stat .stat-number,.stat-item.obras .stat-number').forEach(el=>{if(el.textContent !== '120+') el.textContent='120+';});
    window.bibliotecaUniqueCount = cards.length;
    cards.forEach(card => {
      if (card.querySelector('.document-footer .read-button')) return;
      const source = card.querySelector('.video-thumbnail a[href],.media-thumbnail-container a[href]');
      if (!source || !source.getAttribute('href') || source.getAttribute('href') === '#') return;
      let footer = card.querySelector('.document-footer');
      if (!footer) {
        footer = document.createElement('div');
        footer.className = 'document-footer';
        card.appendChild(footer);
      }
      const button = document.createElement('a');
      button.className = 'read-button';
      button.href = source.href;
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
      button.textContent = 'Ver';
      button.setAttribute('aria-label', 'Ver ' + title(card));
      footer.appendChild(button);
    });
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
          if (!isEditor()) return;
          select.value = originalMode;
          mode = originalMode;
          refresh();
          old.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        });
      }
      if (badge.textContent !== String(code)) badge.textContent = String(code);
      badge.title = 'Código por título · Código original: ' + original(card);
      const showOriginal = mode === originalMode && isEditor();
      old.hidden = !showOriginal;
      old.setAttribute('aria-hidden', String(!showOriginal));
      badge.hidden = showOriginal;
    });
    select.value = mode;
    const compare = mode === originalMode && isEditor()
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
      if (a.closest('[data-cloud-id],.user-added')) return;
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
      const link = event.target.closest('#acervo .document-card a[href], .timeline-item-horizontal a[href]');
      if (!link || dialog.contains(link)) return;
      const card = link.closest('.document-card,.timeline-item-horizontal');
      const type = card?.querySelector('.document-type,.timeline-tag-horizontal')?.textContent.trim() || '';
      const label = link.textContent.trim();
      const href = link.getAttribute('href') || '';
      const isVideo = /^(mídia|midia|vídeo|video)$/i.test(type)
        || card?.classList.contains('video-card')
        || !!card?.querySelector('.video-thumbnail')
        || /(?:youtube\.com|youtu\.be)/i.test(href)
        || /\.(?:mp4|mpg|mpeg|mov|m4v|avi|webm)(?:$|[?#])/i.test(href)
        || /\b(?:vídeo|video)\b/i.test(label);
      const isReaderLink = link.matches('.read-button,.timeline-button-horizontal') || /^ler\b/i.test(label);
      if (!isReaderLink || isVideo) return;
      let url;
      try {
        let raw = link.getAttribute('href') || link.href;
        const absolute = new URL(raw,location.href);
        const decodedPath = decodeURIComponent(absolute.pathname);
        if (/\/Eduardo Biagioni visita Lenita e Carmem\.pptx$/i.test(decodedPath)) {
          raw = '/pdfs/eduardo-biagioni-visita.pdf';
        } else {
          raw = window.bibliotecaPdfUrl ? window.bibliotecaPdfUrl(raw) : raw;
        }
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
      } else if (/\.(?:docx?|pptx?|xlsx?)$/i.test(url.pathname)) {
        preview = new URL('https://docs.google.com/gview?embedded=1&url=' + encodeURIComponent(url.href));
      }
      event.preventDefault();
      event.stopPropagation();
      heading.textContent = card?.querySelector('h3,.timeline-text-horizontal')?.textContent.trim() || 'Leitura';
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
  window.bibliotecaDisplayCode = card => mode === originalMode && isEditor() ? original(card) : (card.dataset.titleCode || original(card));
  function init() {
    const select = document.querySelector('#acervo .sort-select');
    if (!select) return;
    select.addEventListener('change', e => {
      e.stopImmediatePropagation();
      mode = select.value;
      if (mode === originalMode && !isEditor()) mode = titleMode;
      refresh();
    }, true);
    observer = new MutationObserver(schedule);
    installReader();
    refresh();
    document.addEventListener('click', e => {
      if (e.target.closest('.filter-button')) schedule();
      if (e.target.closest('.search-button') && !isEditor()) {
        mode = titleMode;
        schedule();
      }
    });
    document.querySelector('.search-input')?.addEventListener('keyup', e => {
      if (e.key === 'Enter' && !isEditor()) {
        mode = titleMode;
        schedule();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* Shared in-place fullscreen for document and video windows. */
(() => {
  const selector = '#rdc-reader-dialog,#rdc-video-dialog';
  let active = null, owned = false, saved = '';
  const css = document.createElement('style');
  css.textContent = `
    #rdc-reader-dialog.rdc-fullscreen,#rdc-video-dialog.rdc-fullscreen {
      position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;
      max-width:none!important;max-height:none!important;margin:0!important;
      border:0!important;border-radius:0!important;resize:none!important;transform:none!important;
    }
    /* Isolate the fullscreen reader from the Library's positioned layers. */
    html:has(.rdc-fullscreen) body > :not(.rdc-fullscreen):not(script):not(style) {
      visibility:hidden!important;pointer-events:none!important;
    }
    html:has(.rdc-fullscreen) body > :not(.rdc-fullscreen) * {
      visibility:hidden!important;pointer-events:none!important;
    }
    html:has(.rdc-fullscreen),html:has(.rdc-fullscreen) body {
      overflow:hidden!important;
    }
    #rdc-reader-dialog.rdc-fullscreen,#rdc-video-dialog.rdc-fullscreen {
      visibility:visible!important;opacity:1!important;background:#f7f0e4!important;
      z-index:2147483647!important;isolation:isolate;
    }
    #rdc-reader-dialog.rdc-fullscreen > header,#rdc-video-dialog.rdc-fullscreen > header {
      flex:0 0 auto!important;width:100%!important;box-sizing:border-box!important;
      margin:0!important;transform:none!important;
    }
    #rdc-reader-dialog.rdc-fullscreen #rdc-reader-stage,
    #rdc-video-dialog.rdc-fullscreen #rdc-video-stage {
      position:relative!important;flex:1 1 0!important;min-height:0!important;
      width:100%!important;overflow:hidden!important;opacity:1!important;
    }
    /* Hide Library navigation while a reader/player occupies the screen. */
    html:has(#rdc-reader-dialog.rdc-fullscreen) :is(#scrollTopBtn,#nav-down-arrow),
    html:has(#rdc-video-dialog.rdc-fullscreen) :is(#scrollTopBtn,#nav-down-arrow),
    html:has(#rdc-reader-dialog :fullscreen) :is(#scrollTopBtn,#nav-down-arrow),
    html:has(#rdc-video-dialog :fullscreen) :is(#scrollTopBtn,#nav-down-arrow) {
      display:none!important;visibility:hidden!important;pointer-events:none!important;
    }
    .rdc-fullscreen header {position:static!important;cursor:default!important;}
    .rdc-fullscreen [data-scale],.rdc-fullscreen [data-size],.rdc-fullscreen #rdc-video-resize {display:none!important;}
  `;
  document.head.append(css);
  function restore() {
    if (!active) return;
    active.classList.remove('rdc-fullscreen');
    active.style.cssText = saved;
    const b = active.querySelector('[data-rdc-fullscreen]');
    if (b) { b.title = 'Tela cheia'; b.setAttribute('aria-label',b.title); b.setAttribute('aria-pressed','false'); }
    active = null;
  }
  async function leave() {
    const exit = owned && document.fullscreenElement;
    owned = false;
    restore();
    if (exit) { try { await document.exitFullscreen(); } catch (_) {} }
  }
  function prepare() {
    document.querySelectorAll(selector).forEach(dialog => {
      if (dialog.querySelector('[data-rdc-fullscreen]')) return;
      const header = dialog.querySelector('header');
      if (!header) return;
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.rdcFullscreen = '';
      button.textContent = '⛶'; button.title = 'Tela cheia';
      button.setAttribute('aria-label','Tela cheia'); button.setAttribute('aria-pressed','false');
      const external = header.querySelector('.rdc-reader-external');
      if (external) external.replaceWith(button);
      else header.insertBefore(button,header.lastElementChild);
      button.addEventListener('click', async event => {
        event.preventDefault(); event.stopPropagation();
        if (active === dialog) { await leave(); return; }
        saved = dialog.style.cssText; active = dialog;
        dialog.classList.add('rdc-fullscreen');
        button.title = 'Sair da tela cheia';
        button.setAttribute('aria-label',button.title); button.setAttribute('aria-pressed','true');
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          try { await document.documentElement.requestFullscreen(); owned = true; }
          catch (_) { owned = false; }
        }
      });
      dialog.addEventListener('close', () => { if (active === dialog) void leave(); });
      dialog.addEventListener('cancel', event => {
        if (active === dialog) { event.preventDefault(); void leave(); }
      });
      header.addEventListener('pointerdown', event => {
        if (active === dialog && !event.target.closest('button,a')) event.stopImmediatePropagation();
      },true);
    });
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && owned) { owned = false; restore(); }
  });
  new MutationObserver(prepare).observe(document.body,{childList:true});
  prepare();
})();

/* One rounded launcher; authentication stays inside the existing list dialog. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    body > #entradasConsole > #entradasSenhaForm,
    body > #entradasConsole > #entradasConsoleStatus,
    body > #entradasConsole > #entradasConsoleList { display:none!important; }
    #entradasConsole { border-radius:18px!important; }
    #abrirEntradasCompleta,#btnEntradasSenha,#entradasDialog > button { border-radius:12px!important; }
    #entradasSenhaInput { border-radius:10px!important; }
  `;
  document.head.append(style);
})();

/* Prefer available Portuguese captions on existing and future YouTube embeds. */
(() => {
  const watched = new WeakSet();
  function watch(doc) {
    if (watched.has(doc) || !doc.documentElement) return;
    watched.add(doc);
    function configure(frame) {
      const raw = frame.getAttribute('src');
      if (!raw) return;
      let url;
      try { url = new URL(raw, doc.baseURI); } catch (_) { return; }
      const hosts = ['youtube.com','www.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'];
      if (hosts.includes(url.hostname) && url.pathname.startsWith('/embed/')) {
        if (url.searchParams.get('cc_lang_pref') === 'pt' &&
            url.searchParams.get('cc_load_policy') === '1' &&
            url.searchParams.get('hl') === 'pt-BR') return;
        url.searchParams.set('cc_lang_pref','pt');
        url.searchParams.set('cc_load_policy','1');
        url.searchParams.set('hl','pt-BR');
        frame.setAttribute('src',url.href);
        return;
      }
      if (url.origin === new URL(doc.baseURI).origin && !frame.dataset.rdcCaptionsWatched) {
        frame.dataset.rdcCaptionsWatched = '1';
        const inspect = () => {
          try { if (frame.contentDocument) watch(frame.contentDocument); } catch (_) {}
        };
        frame.addEventListener('load',inspect);
        inspect();
      }
    }
    function scan(root) {
      if (root.nodeType !== 1 && root.nodeType !== 9) return;
      if (root.matches?.('iframe')) configure(root);
      root.querySelectorAll('iframe').forEach(configure);
    }
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') configure(record.target);
        else record.addedNodes.forEach(scan);
      }
    }).observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
    scan(doc);
  }
  watch(document);
})();

/* Dismiss Library notification banners ten seconds after they appear. */
(() => {
  const scheduled = new WeakSet();
  function schedule(node) {
    if (node.nodeType !== 1) return;
    const close = node.querySelector('button[aria-label="Fechar notificação"]');
    if (!close || scheduled.has(close)) return;
    scheduled.add(close);
    const timer = setTimeout(() => {
      if (close.isConnected) close.click();
    }, 10000);
    close.addEventListener('click', () => clearTimeout(timer), {once:true});
  }
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(schedule));
  }).observe(document.body, {childList:true});
  Array.from(document.body.children).forEach(schedule);
})();

/* Responsive default: mobile opens in Listagem; desktop opens in Grade. */
(() => {
  let applied = false;
  let attempts = 0;
  function applyResponsiveDefault() {
    if (applied) return;
    const acervo = document.getElementById('acervo');
    if (!acervo) {
      if (++attempts < 30) setTimeout(applyResponsiveDefault, 100);
      return;
    }
    const mobile = window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse)').matches;
    const wanted = mobile ? 'lista' : 'sinopses';
    const button = acervo.querySelector('.view-mode-button[data-view="' + wanted + '"]');
    if (typeof window.setAcervoViewMode === 'function') {
      window.setAcervoViewMode(wanted);
      applied = true;
      return;
    }
    if (button) {
      button.click();
      applied = true;
      return;
    }
    acervo.classList.toggle('view-list', mobile);
    acervo.querySelectorAll('.view-mode-button').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === wanted);
    });
    applied = true;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyResponsiveDefault, { once: true });
  } else {
    applyResponsiveDefault();
  }
})();

