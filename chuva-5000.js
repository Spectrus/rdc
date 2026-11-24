// Chuva de ouro • Biblioteca Digital Reinaldo Duarte Castanheira
(() => {
  'use strict';
  const bibliotecaColors = ['#d4b45f', '#b78c3b', '#d4ba81', '#4a2c2a', '#fffdf8'];
  const rainFallSeconds = 3.5, rainGatherSeconds = 1.75, sequenceSeconds = 7.45;
  const tau = Math.PI * 2;
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (from, to, progress) => from + (to - from) * progress;
  function smooth(value) {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  }
  function random(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function makeFormation() {
    const mask = document.createElement('canvas');
    mask.width = 900;
    mask.height = 260;
    const ink = mask.getContext('2d', {willReadFrequently: true});
    if (!ink) return;
    ink.font = 'bold 210px "Playfair Display", serif';
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    ink.fillText('5.000', mask.width / 2, mask.height / 2 + 10, mask.width * .93);
    const pixels = ink.getImageData(0, 0, mask.width, mask.height).data;
    const rand = random(511), samples = [];
    let left = mask.width, right = 0, top = mask.height, bottom = 0;
    for (let y = 0; y < mask.height; y += 5) {
      for (let x = 0; x < mask.width; x += 5) {
        const px = Math.round(x + rand() * 2), py = Math.round(y + rand() * 2);
        if (pixels[(py * mask.width + px) * 4 + 3] <= 132) continue;
        samples.push([px, py]);
        left = Math.min(left, px);
        right = Math.max(right, px);
        top = Math.min(top, py);
        bottom = Math.max(bottom, py);
      }
    }
    const width = right - left;
    if (width <= 0) return;
    const points = samples.map(([x, y]) => {
      // Preserve the approved preview's seeded positions, flutter and colors.
      const variation = Array.from({length:7}, rand);
      return {
        tx: (x - left) / width - .5,
        ty: (y - top) / width - (bottom - top) / (2 * width),
        w: variation[2], color: Math.floor(variation[6] * bibliotecaColors.length)
      };
    });
    return {width, paper: makeRainPieces(points, width, rand)};
  }

  function makeRainPieces(points, wordWidth, rand) {
    // Give every falling piece its own neighbouring patch of the numerals.
    const nearest = new Float64Array(points.length).fill(Infinity);
    const owner = new Uint16Array(points.length);
    let seed = 0;
    const pieces = Array.from({length:Math.min(250, points.length)}, (_, index) => {
      const center = points[seed];
      let farthest = -1;
      points.forEach((point, i) => {
        const distance = (point.tx - center.tx) ** 2 + (point.ty - center.ty) ** 2;
        if (distance < nearest[i]) {
          nearest[i] = distance;
          owner[i] = index;
        }
        if (nearest[i] > farthest) {
          farthest = nearest[i];
          seed = i;
        }
      });
      return {
        x: rand(), size: 3 + rand() * 2.8, drift: rand() * 120 - 60,
        duration: 3.6 + rand() * 1.2, delay: 2.6 * rand() ** 1.35, color: index % 5,
        phase: rand() * tau, flutterRate: 3 + rand() * 4.5,
        spin: (rand() - .5) * 3, sway: 6 + rand() * 13,
        dots: []
      };
    });
    points.forEach((point, i) => pieces[owner[i]].dots.push(point));
    return pieces.map(({dots, ...piece}) => {
      const xs = dots.map(p => p.tx * wordWidth), ys = dots.map(p => p.ty * wordWidth);
      const left = Math.floor(Math.min(...xs)) - 3, top = Math.floor(Math.min(...ys)) - 3;
      const tile = document.createElement('canvas');
      tile.width = Math.ceil(Math.max(...xs)) + 3 - left;
      tile.height = Math.ceil(Math.max(...ys)) + 3 - top;
      const ink = tile.getContext('2d');
      dots.forEach((dot, i) => {
        ink.fillStyle = bibliotecaColors[i % 3 === 0 ? piece.color : dot.color];
        ink.beginPath();
        ink.arc(xs[i] - left, ys[i] - top, 1.5 + 1.3 * dot.w, 0, tau);
        ink.fill();
      });
      const gatherAt = rainFallSeconds - .25 + piece.delay * .15;
      const landingAge = gatherAt - piece.delay + rainGatherSeconds / 2;
      const finalAngle = paperAngle(piece, landingAge);
      const alignBy = Math.round(finalAngle / tau) * tau - finalAngle;
      return {...piece, gatherAt, alignBy, tile, tx:(left + tile.width / 2) / wordWidth, ty:(top + tile.height / 2) / wordWidth};
    });
  }

  function paperAngle(piece, age) {
    const flutter = age * piece.flutterRate + piece.phase;
    return piece.phase + age * piece.spin + .48 * Math.sin(flutter * .73);
  }

  function rainPaper(ctx, dim, time, formation, wordWidth, wordY) {
    const scale = wordWidth / formation.width;
    for (const p of formation.paper) {
      if (time < p.delay) continue;
      const turn = clamp((time - p.gatherAt) / rainGatherSeconds);
      const gather = smooth(turn);
      const curve = Math.sin(Math.PI * gather);
      const unfold = smooth((gather - .35) / .65);
      // Carry the falling velocity into the turn, easing it to zero at the numeral.
      const age = Math.min(time, p.gatherAt) - p.delay + rainGatherSeconds * turn * (1 - turn / 2);
      const flutter = age * p.flutterRate + p.phase;
      const face = Math.cos(flutter);
      // Broadside paper catches the air; edge-on paper drops a little faster.
      const drag = .18 * (Math.sin(2 * flutter) - Math.sin(2 * p.phase)) / (2 * p.flutterRate);
      const progress = (age - drag) / p.duration;
      const breeze = 11 * Math.sin(age * 1.7 + p.x * 3);
      const weave = p.sway * Math.sin(flutter * .68) + breeze + p.drift * progress;
      const fallX = 5 + p.x * (dim.w - 10) + Math.sin(p.x * Math.PI) * weave;
      const fallY = -p.size + progress * dim.h;
      const x = mix(fallX, dim.w / 2 + p.tx * wordWidth, gather) + p.drift * .45 * curve;
      const y = mix(fallY, wordY + p.ty * wordWidth, gather) - .06 * dim.h * curve;
      const paperWidth = .75 * p.size, paperHeight = .75 * (p.size + 2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(paperAngle(p, age) + p.alignBy * gather);
      const projectedWidth = .20 + .80 * Math.abs(face);
      ctx.transform(mix(projectedWidth, 1, gather), 0, .14 * Math.sin(flutter) * (1 - gather), 1, 0, 0);
      if (unfold < 1) {
        ctx.fillStyle = bibliotecaColors[p.color];
        ctx.globalAlpha = .95 * (1 - unfold);
        ctx.beginPath();
        ctx.roundRect(-paperWidth / 2, -paperHeight / 2, paperWidth, paperHeight, .75);
        ctx.fill();
      }
      if (unfold > 0) {
        const width = mix(paperWidth, p.tile.width * scale, unfold);
        const height = mix(paperHeight, p.tile.height * scale, unfold);
        ctx.globalAlpha = unfold;
        ctx.drawImage(p.tile, -width / 2, -height / 2, width, height);
      }
      ctx.restore();
    }
  }

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const badge = document.getElementById('stat-badge');
  const number = document.querySelector('#visits-stat .stat-number');
  if (!badge || !number || motion.matches) return;

  function isHome(link) {
    const url = new URL(link);
    return (!url.hash || url.hash === '#intro') &&
      !['obra', 'codigo', 'titulo', 'acervo'].some(key => url.searchParams.has(key));
  }

  async function play() {
    if (motion.matches || !isHome(location.href)) return;
    if (document.fonts) await document.fonts.load('bold 210px "Playfair Display"', '5.000').catch(() => []);
    if (motion.matches || document.hidden || badge.getBoundingClientRect().bottom <= 0) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'rdc-chuva-5000';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const formation = makeFormation();
    if (!formation) return;
    document.body.append(canvas);
    const dim = {w:0, h:0};
    let start, frame;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 2);
      dim.w = rect.width;
      dim.h = rect.height;
      canvas.width = Math.round(dim.w * ratio);
      canvas.height = Math.round(dim.h * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function stop() {
      cancelAnimationFrame(frame);
      canvas.remove();
      badge.classList.remove('rdc-celebra-visitas');
      window.removeEventListener('resize', resize);
      window.removeEventListener('pagehide', stop);
      document.removeEventListener('visibilitychange', stop);
      motion.removeEventListener('change', stop);
    }
    function draw(now) {
      if (start === undefined) start = now;
      const time = (now - start) / 1000;
      const elapsed = time / sequenceSeconds;
      const rect = badge.getBoundingClientRect();
      if (elapsed >= 1 || rect.bottom <= 0) { stop(); return; }
      const word = Math.min(dim.w * .74, formation.width * .82);
      const cx = dim.w / 2, cy = dim.h * .18 + 140 * word / formation.width;
      const travel = smooth((elapsed - .80) / .19);
      const hasTotal = number.getAttribute('aria-busy') === 'false' && /[0-9]/.test(number.textContent);
      badge.classList.toggle('rdc-celebra-visitas', elapsed >= .76 && hasTotal);
      const showTotal = badge.classList.contains('rdc-celebra-visitas');
      const target = showTotal ? number.getBoundingClientRect() : rect;
      const landingWidth = showTotal ? target.width : rect.width * .60;
      const scale = mix(1, landingWidth / word, travel);
      ctx.clearRect(0, 0, dim.w, dim.h);
      ctx.save();
      ctx.translate(mix(cx, target.left + target.width / 2, travel), mix(cy, target.top + target.height / 2, travel));
      ctx.rotate((innerWidth > 768 ? 10 : 0) * Math.PI / 180 * travel);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      rainPaper(ctx, dim, time, formation, word, cy);
      ctx.restore();
      canvas.style.opacity = String(1 - smooth((elapsed - .955) / .045));
      frame = requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', stop);
    motion.addEventListener('change', stop);
    frame = requestAnimationFrame(draw);
  }

  // The homepage reveals its same-origin iframe after it lays out the collection.
  if (window.parent === window) {
    play();
  } else if (window.frameElement?.id === 'site' && isHome(window.parent.location.href)) {
    if (window.parent.getComputedStyle(window.frameElement).visibility === 'visible') {
      play();
    } else {
      function onReveal(event) {
        if (event.source !== window.parent || event.origin !== location.origin ||
            event.data?.type !== 'rdc-parent' || event.data.action !== 'iframe-visible') return;
        window.removeEventListener('message', onReveal);
        play();
      }
      window.addEventListener('message', onReveal);
    }
  }
})();
