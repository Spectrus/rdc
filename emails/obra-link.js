/* Resolve only existing catalogue entries; never accept an arbitrary media URL. */
(function (global) {
  'use strict';
  function install(doc, win, search) {
    const params = new URLSearchParams(search);
    const id = params.get('obra'), code = params.get('codigo'), title = params.get('titulo');
    if (!id && !code && !title && !params.has('acervo')) return;
    let done = false, observer, timer;
    function stop() { done = true; observer?.disconnect(); clearTimeout(timer); }
    function findCard() {
      const cards = [...doc.querySelectorAll('#acervo .document-card')];
      if (id) return cards.find(c => c.dataset.cloudId === id);
      if (code) return cards.find(c => c.querySelector('.document-code')?.textContent.trim() === code);
      const matches = cards.filter(c => c.querySelector('h3')?.textContent.trim() === title);
      return matches.length === 1 ? matches[0] : null;
    }
    function attempt() {
      if (done) return;
      const card = findCard();
      if (!card) return;
      const link = card.querySelector('a.read-button[href],.video-thumbnail a[href],.media-thumbnail-container a[href]');
      if (!link || link.getAttribute('href').startsWith('#')) return;
      stop();
      doc.querySelector('#acervo')?.scrollIntoView({behavior:'instant'});
      card.scrollIntoView({behavior:'instant',block:'center'});
      // Use the same reader and protection handlers as a normal catalogue click.
      link.click();
    }
    if (!id && !code && !title) {
      win.setTimeout(() => doc.querySelector('#acervo')?.scrollIntoView({behavior:'smooth'}), 3000);
      return;
    }
    observer = new win.MutationObserver(attempt);
    observer.observe(doc.documentElement, {childList:true,subtree:true,attributes:true,attributeFilter:['data-cloud-id','href']});
    timer = win.setTimeout(() => {
      if (done) return;
      stop();
      const note = doc.createElement('p');
      note.setAttribute('role','status');
      note.textContent = 'Não foi possível localizar esta obra. Procure pelo título na listagem do acervo.';
      note.style.cssText = 'padding:18px;background:#fffaf0;color:#513322;text-align:center';
      (doc.querySelector('#acervo') || doc.body).prepend(note);
      note.scrollIntoView({block:'center'});
    }, 30000);
    attempt();
  }
  global.BibliotecaObraLink = {install};
  if (typeof module !== 'undefined' && module.exports) module.exports = {install};
})(typeof window !== 'undefined' ? window : globalThis);
