(function (global) {
  'use strict';
  const SITE = 'https://rdcguardandomomentos.com.br/';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeUrl(value) {
    try { const u = new URL(value || SITE); return u.protocol === 'https:' && u.hostname === 'rdcguardandomomentos.com.br' ? u.href : SITE; } catch (_) { return SITE; }
  }
  function render(options, asset) {
    const type = ['welcome','new','fortnight'].includes(options.type) ? options.type : 'new';
    const style = 'detail';
    const works = (type === 'fortnight' ? recentWorks(options.works || [], options.now) : (options.works || []).map(normalizeWork)).filter(w => w.title);
    const ink = '#513322', paper = style === 'detail' ? '#fffaf0' : '#ffffff';
    const plural = works.length > 1;
    const title = type === 'welcome' ? 'Seja bem-vindo!' : type === 'fortnight' ? 'Novidades da quinzena' : plural ? 'Novas publicações' : escape(works[0]?.title || 'Nova publicação');
    const intro = type === 'welcome' ? 'Um convite para descobrir histórias,<br>revisitar lembranças e guardar momentos.' : type === 'fortnight' ? escape(fortnightIntro(works)) : plural ? 'Novas histórias chegaram ao nosso acervo.<br>Convido você a conhecê-las!' : 'Uma nova história chegou ao nosso acervo.<br>Convido você a conhecê-la!';
    const button = type === 'welcome' ? 'Explorar a Biblioteca' : type === 'fortnight' ? 'Ver as novidades' : plural ? 'Ver as obras' : 'Ver a obra';
    const destination = type === 'new' && works.length === 1 ? works[0].url : type === 'welcome' ? SITE : SITE + '?acervo=1';
    const rows = type === 'welcome' ? '' : works.map((w,i) => `<tr><td style="padding:17px 0;border-bottom:1px solid ${ink};text-align:left;font-family:Georgia,serif;color:${ink};"><span style="font-size:12px;letter-spacing:2px;">${escape(w.date || w.year || '')} · ${escape(w.author)}</span><br><a href="${escape(safeUrl(w.url))}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 0 4px;color:${ink};font-size:23px;text-decoration:none;line-height:1.3;overflow-wrap:anywhere;">${escape(w.title)}</a><br><a href="${escape(safeUrl(w.url))}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 0;color:${ink};font-size:15px;text-decoration:underline;">Ver a obra &#8599;</a></td></tr>`).join('');
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:${paper};color:${ink};"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;margin:auto;background:${paper};"><tr><td style="padding:24px 26px 8px;text-align:center;font-family:Georgia,serif;font-size:11px;letter-spacing:3px;">GUARDANDO MOMENTOS</td></tr><tr><td style="padding:10px 22px 0;"><a href="${SITE}" target="_blank" rel="noopener noreferrer" style="display:block;"><img src="${asset(type+'-'+style)}" width="556" alt="${type==='welcome'?'Portas abertas da Biblioteca, desenhadas a lápis':type==='new'?'Livro aberto e caneta, desenhados a lápis':'Carta, livros e óculos, desenhados a lápis'}" style="display:block;width:100%;max-width:556px;height:auto;border:0;"></a></td></tr><tr><td style="padding:28px 28px 0;text-align:center;"><h1 style="margin:0;color:${ink};font-family:Georgia,serif;font-size:36px;line-height:1.15;font-weight:normal;">${title}</h1><p style="font-family:Georgia,serif;font-size:19px;line-height:1.55;margin:18px 0 12px;color:${ink};">${intro}</p></td></tr><tr><td align="center" style="padding:0 0 8px;"><img src="${asset('branch')}" width="130" alt="" style="display:block;width:130px;height:auto;border:0;"></td></tr>${rows?`<tr><td style="padding:0 36px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table></td></tr>`:''}<tr><td align="center" style="padding:18px 26px 36px;"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" style="border:1px solid ${ink};border-radius:28px;"><a href="${destination}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 27px;text-decoration:none;color:${ink};font-family:Georgia,serif;font-size:21px;line-height:1.3;">${button} &nbsp;&#8594;</a></td></tr></table></td></tr><tr><td style="padding:0 34px 30px;text-align:center;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="border-top:1px solid ${ink};padding-top:25px;font-family:Georgia,serif;color:${ink};text-align:center;"><div style="font-size:19px;line-height:1.4;">Biblioteca Digital</div><div style="font-size:23px;line-height:1.4;">Reinaldo Duarte Castanheira</div><div style="font-size:16px;margin-top:14px;">Guarde este endereço:</div><a href="${SITE}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:9px 0;color:${ink};font-size:16px;line-height:1.5;overflow-wrap:anywhere;">rdcguardandomomentos.com.br</a>${options.unsubscribeUrl?`<div style="margin-top:18px;"><a href="${escape(safeUrl(options.unsubscribeUrl))}" style="color:${ink};font-size:12px;">Cancelar avisos</a></div>`:''}</td></tr></table></td></tr></table></td></tr></table>`;
  }

  function timestamp(value) {
    if (value == null || value === '') return NaN;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value === 'object' && (value.seconds != null || value._seconds != null)) return Number(value.seconds ?? value._seconds) * 1000;
    return value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  }
  function workUrl(work) {
    const url = new URL(SITE);
    // Firestore IDs survive catalogue renumbering.
    if (work.id || work.cloudId) url.searchParams.set('obra', String(work.id || work.cloudId));
    else if (work.code || work.codigo) url.searchParams.set('codigo', String(work.code || work.codigo));
    else if (work.title || work.titulo) url.searchParams.set('titulo', String(work.title || work.titulo));
    else url.searchParams.set('acervo', '1');
    return url.href;
  }
  function normalizeWork(work) {
    const publishedAt = timestamp(work.publishedAt ?? work.createdAt ?? work.timestamp);
    return {...work, title: String(work.title || work.titulo || '').trim(),
      author: String(work.author || work.autor || '').trim(), year: work.year ?? work.ano ?? '',
      publishedAt, date: Number.isFinite(publishedAt) ? new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo'}).format(publishedAt) : '',
      url: workUrl(work)};
  }
  function recentWorks(works, now = Date.now()) {
    const end = timestamp(now), start = end - 15 * 86400000;
    return works.map(normalizeWork).filter(w => w.title && w.published !== false && w.publicado !== false &&
      !['draft','rascunho','unpublished'].includes(w.status) && w.publishedAt > start && w.publishedAt <= end)
      .sort((a,b) => b.publishedAt - a.publishedAt);
  }
  function fortnightIntro(works) {
    if (!works.length) return 'Nesta quinzena não houve novas publicações. O acervo continua de portas abertas para você.';
    const names = works.slice(0,3).map(w => '“' + w.title + '”').join(', ');
    return 'Nos últimos 15 dias, chegaram ao acervo ' + names + (works.length > 3 ? ' e outras obras' : '') + '. Um convite para descobrir histórias e guardar novas lembranças.';
  }
  const asset = name => SITE + 'emails/assets/' + name + '.jpg';
  function documentHtml(options, resolveAsset = asset) {
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0">' + render(options, resolveAsset) + '</body></html>';
  }
  function message(options) {
    const works = options.type === 'fortnight' ? recentWorks(options.works || [], options.now) : (options.works || []).map(normalizeWork);
    const subject = options.type === 'welcome' ? 'Bem-vindo à nossa Biblioteca' : options.type === 'fortnight' ? 'Novidades da quinzena — Biblioteca Digital' : works.map(w => w.title).join(' · ') || 'Nova publicação na Biblioteca';
    const text = (options.type === 'welcome' ? 'Seja bem-vindo à Biblioteca Digital!' : options.type === 'fortnight' ? fortnightIntro(works) : 'Uma nova publicação chegou ao acervo.') + '\n\n' + (options.type === 'welcome' ? '' : works.map(w => [w.date || w.year, w.author, w.title, w.url].filter(Boolean).join(' — ')).join('\n\n')) + '\n\n' + SITE;
    return {subject, html:documentHtml(options), text};
  }
  const api = {SITE, escape, safeUrl, render:(options, resolveAsset = asset) => render(options, resolveAsset), documentHtml, message, workUrl, normalizeWork, recentWorks};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BibliotecaEmail = api;
})(typeof window !== 'undefined' ? window : globalThis);
