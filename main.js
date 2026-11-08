(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} },
  };

  /* ---------- page wipe between pages ---------- */
  const curtain = document.createElement('div');
  curtain.className = 'curtain'; curtain.setAttribute('aria-hidden', 'true');
  curtain.innerHTML = '<i></i><i></i><i></i>';
  document.body.prepend(curtain);

  if (root.classList.contains('covered')) {
    store.del('av-wipe');
    curtain.classList.add('cover', 'out');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.remove('covered');
      curtain.classList.remove('cover');
      setTimeout(() => curtain.classList.remove('out'), 900);
    }));
  }
  addEventListener('pageshow', e => { if (e.persisted) curtain.classList.remove('cover', 'out'); });

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    // a link to a section of this same page (e.g. #triathlon) scrolls to it; no page wipe
    if (url.pathname === location.pathname && url.search === location.search && url.hash) {
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', url.hash);
      return;
    }
    if (!/\.html$|\/$/.test(url.pathname) || url.href === location.href) return;
    e.preventDefault();
    if (reduce) { location.href = url.href; return; }
    curtain.classList.remove('out');
    curtain.classList.add('cover');
    store.set('av-wipe', '1');
    setTimeout(() => { location.href = url.href; }, 760);
  });

  /* ---------- split headline letters ---------- */
  let d = 0;
  $$('.split').forEach(el => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i).map(l => l.replace(/<[^>]+>/g, '').trim());
    el.setAttribute('aria-label', lines.join(' '));
    el.innerHTML = '';
    lines.forEach(text => {
      const line = document.createElement('span');
      line.className = 'line'; line.setAttribute('aria-hidden', 'true');
      [...text].forEach(c => {
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = c === ' ' ? ' ' : c;
        s.style.setProperty('--d', d++);
        s.addEventListener('animationend', ev => {
          if (ev.animationName === 'rise') s.classList.add('landed');
        });
        line.appendChild(s);
      });
      el.appendChild(line);
    });
  });

  /* ---------- loading screen (first visit per session) ---------- */
  const loader = $('.loader');
  if (loader && root.classList.contains('loading')) {
    const t0 = performance.now();
    const finish = () => {
      setTimeout(() => {
        store.set('av-loaded', '1');
        loader.classList.add('done');
        root.classList.remove('loading');
        setTimeout(() => { loader.hidden = true; }, 1000);
      }, Math.max(0, (reduce ? 0 : 2100) - (performance.now() - t0)));
    };
    if (document.readyState === 'complete') finish(); else addEventListener('load', finish, { once: true });
  } else if (loader) loader.hidden = true;

  /* ---------- cursor ---------- */
  const cur = document.createElement('div');
  cur.className = 'cursor'; cur.setAttribute('aria-hidden', 'true'); cur.innerHTML = '<span></span>';
  document.body.appendChild(cur);
  let tx = -100, ty = -100, cx = tx, cy = ty;
  const followers = [];
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; if (e.pointerType === 'mouse') cur.classList.add('on'); });
  document.addEventListener('pointerleave', () => cur.classList.remove('on'));
  document.addEventListener('pointerover', e => {
    const lab = e.target.closest('[data-cursor]');
    cur.classList.toggle('label', !!lab);
    $('span', cur).textContent = lab ? lab.dataset.cursor : '';
    cur.classList.toggle('link', !lab && !!e.target.closest('a, button'));
  });
  (function loop() {
    cx += (tx - cx) * .22; cy += (ty - cy) * .22;
    cur.style.left = cx + 'px'; cur.style.top = cy + 'px';
    followers.forEach(f => {
      f.x += (tx - f.x) * .12; f.y += (ty - f.y) * .12;
      f.el.style.left = f.x + 'px'; f.el.style.top = f.y + 'px';
    });
    requestAnimationFrame(loop);
  })();

  /* ---------- fade-in on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    $$('[data-count]', en.target).forEach(countUp);
    io.unobserve(en.target);
  }), { threshold: .15 });
  $$('.reveal-img').forEach(el => io.observe(el));
  $$('.fade').forEach((el, i) => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('fade'));
    el.style.transitionDelay = Math.min(sibs.indexOf(el), 6) * 80 + 'ms';
    io.observe(el);
  });
  function countUp(el) {
    const to = +el.dataset.count, pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    if (reduce) { el.textContent = pre + to + suf; return; }
    const t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / 1200), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = pre + v + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- landing: hovering a menu item swaps the photo ---------- */
  const stage = $('.stage');
  if (stage) {
    const base = $('.photo.base', stage);
    $$('.menu a').forEach(a => {
      const target = $(`.photo[data-for="${a.dataset.key}"]`, stage);
      const on = () => {
        $$('.photo.show', stage).forEach(p => p.classList.remove('show'));
        if (target && $('img', target)) target.classList.add('show');
      };
      a.addEventListener('pointerenter', on); a.addEventListener('focus', on);
    });
    $('.menu').addEventListener('pointerleave', () => $$('.photo.show', stage).forEach(p => p.classList.remove('show')));
  }

  /* ---------- draggable photos ---------- */
  let z = 5;
  $$('.collage .photo').forEach(p => {
    p.addEventListener('pointerdown', e => {
      e.preventDefault();
      const box = p.parentElement.getBoundingClientRect(), r = p.getBoundingClientRect();
      const ox = e.clientX - r.left, oy = e.clientY - r.top;
      p.style.zIndex = ++z; p.classList.add('dragging'); p.setPointerCapture(e.pointerId);
      const move = ev => {
        p.style.left = Math.max(0, Math.min(box.width - r.width, ev.clientX - box.left - ox)) / box.width * 100 + '%';
        p.style.top = Math.max(0, Math.min(box.height - r.height, ev.clientY - box.top - oy)) / box.height * 100 + '%';
      };
      const up = () => { p.classList.remove('dragging'); p.removeEventListener('pointermove', move); p.removeEventListener('pointerup', up); };
      p.addEventListener('pointermove', move); p.addEventListener('pointerup', up);
    });
  });

  /* ---------- tickets: click to punch and expand ---------- */
  $$('.ticket[role]').forEach(t => {
    const toggle = () => { t.classList.toggle('punched'); t.setAttribute('aria-expanded', t.classList.contains('punched')); };
    t.addEventListener('click', toggle);
    t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  /* ---------- project rows: expand + image follows cursor ---------- */
  const float = $('.float');
  if (float) {
    followers.push({ el: float, x: 0, y: 0 });
    const fig = $('.photo', float);
    $$('.row').forEach(row => {
      const btn = $('button', row);
      btn.addEventListener('click', () => { row.classList.toggle('open'); btn.setAttribute('aria-expanded', row.classList.contains('open')); });
      if (!fine) return;
      if (!row.dataset.img) return;
      let hovering = false;
      btn.addEventListener('pointerenter', () => {
        hovering = true;
        const img = new Image(); img.alt = '';
        img.onload = () => {
          if (!hovering || row.classList.contains('open')) return;
          fig.innerHTML = ''; fig.appendChild(img); float.classList.add('on');
        };
        img.src = row.dataset.img;
      });
      btn.addEventListener('click', () => { if (row.classList.contains('open')) float.classList.remove('on'); });
      btn.addEventListener('pointerleave', () => { hovering = false; float.classList.remove('on'); });
    });
  }

  /* ---------- games: hovering a screenshot flips through the others ---------- */
  $$('.games-list .shot').forEach(shot => {
    const imgs = $$('img', shot), dots = $$('.dots i', shot);
    if (imgs.length < 2) return;
    let i = 0, timer;
    const show = n => {
      imgs[i].classList.remove('on'); dots[i] && dots[i].classList.remove('on');
      i = n % imgs.length;
      imgs[i].classList.add('on'); dots[i] && dots[i].classList.add('on');
    };
    shot.addEventListener('pointerenter', () => { if (reduce) return; show(i + 1); timer = setInterval(() => show(i + 1), 1100); });
    shot.addEventListener('pointerleave', () => { clearInterval(timer); show(0); });
  });

  /* ---------- tower game: a block slides side to side; drop it on the one below.
     The overhang is cut off, so the tower narrows. Miss entirely and it's over. ---------- */
  const tower = $('.tower');
  if (tower) {
    const stack = $('.stack', tower), msg = $('.tower-msg', tower);
    const btn = $('.drop'), hEl = $('.score .h'), bestEl = $('.score .best');
    const BH = 28, PERFECT = 3;
    const colors = ['var(--ink)', 'var(--pink-deep)', 'var(--orange)', 'var(--cafe)'];
    let W = 0, blocks = [], cur = null, dir = 1, speed = 0, running = false, raf = 0, last = 0, best = 0;
    try { best = +localStorage.getItem('av-tower-best') || 0; } catch (e) {}
    bestEl.textContent = best;

    const block = (x, w, i, cls = '') => {
      const d = document.createElement('div');
      d.className = 'tb' + (cls ? ' ' + cls : '');
      d.style.cssText = `left:${x}px;width:${w}px;bottom:${i * BH}px;background:${colors[i % colors.length]}`;
      stack.appendChild(d);
      return d;
    };
    const say = html => { msg.innerHTML = html; msg.hidden = !html; };

    function reset() {
      stack.innerHTML = ''; stack.style.transform = '';
      W = tower.clientWidth;
      const w = Math.round(W * 0.5), x = Math.round((W - w) / 2);
      blocks = [{ x, w }];
      block(x, w, 0);
      hEl.textContent = 0;
    }
    function spawn() {
      const top = blocks[blocks.length - 1], i = blocks.length;
      dir = i % 2 ? 1 : -1;
      speed = Math.min(150 + i * 14, 440);
      const x = dir > 0 ? 0 : W - top.w;
      cur = { x, w: top.w, el: block(x, top.w, i, 'moving') };
    }
    function loop(t) {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      cur.x += dir * speed * dt;
      if (cur.x <= 0) { cur.x = 0; dir = 1; }
      if (cur.x >= W - cur.w) { cur.x = W - cur.w; dir = -1; }
      cur.el.style.left = cur.x + 'px';
      raf = requestAnimationFrame(loop);
    }
    function start() {
      reset(); say(''); running = true;
      btn.textContent = 'Drop';
      spawn();
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function gameOver() {
      running = false; cancelAnimationFrame(raf);
      cur.el.classList.remove('moving'); cur.el.classList.add('fall');
      const h = blocks.length - 1;
      if (h > best) { best = h; bestEl.textContent = best; try { localStorage.setItem('av-tower-best', best); } catch (e) {} }
      say(`<b>Game over</b>Height ${h}`);
      btn.textContent = 'Play again';
    }
    function drop() {
      if (!running) { start(); return; }
      const prev = blocks[blocks.length - 1], i = blocks.length;
      let L = Math.max(cur.x, prev.x), R = Math.min(cur.x + cur.w, prev.x + prev.w);
      if (R - L <= 0) { gameOver(); return; }
      if (Math.abs(cur.x - prev.x) <= PERFECT) {
        L = prev.x; R = prev.x + prev.w;
        cur.el.classList.add('perfect');
      } else {
        // slice off the overhang and let it fall
        const cx = cur.x < prev.x ? cur.x : R, cw = cur.w - (R - L);
        const chunk = block(cx, cw, i, 'chunk');
        chunk.style.setProperty('--rot', (cur.x < prev.x ? -14 : 14) + 'deg');
        chunk.addEventListener('animationend', () => chunk.remove());
      }
      cur.el.classList.remove('moving');
      cur.el.style.left = L + 'px'; cur.el.style.width = (R - L) + 'px';
      blocks.push({ x: L, w: R - L });
      hEl.textContent = blocks.length - 1;
      // keep the top of the tower in view
      const rise = (blocks.length + 3) * BH - tower.clientHeight;
      stack.style.transform = rise > 0 ? `translateY(${rise}px)` : '';
      spawn();
    }

    reset();
    say('<b>Stack it</b>Click to start');
    btn.addEventListener('click', drop);
    tower.addEventListener('pointerdown', e => { e.preventDefault(); drop(); });
    addEventListener('keydown', e => {
      if (e.code !== 'Space' || (e.target instanceof Element && e.target.closest('button, a, input, textarea'))) return;
      const r = tower.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;  // only when the game is on screen
      e.preventDefault(); drop();
    });
    addEventListener('resize', () => { if (!running) reset(); });
  }

  /* ---------- copy email ---------- */
  const copy = $('.copy');
  if (copy) {
    const toast = document.createElement('div');
    toast.className = 'toast'; toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
    let t;
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(copy.dataset.email); toast.textContent = 'Email copied'; }
      catch (e) { toast.textContent = copy.dataset.email; }
      toast.classList.add('on'); clearTimeout(t); t = setTimeout(() => toast.classList.remove('on'), 2000);
    });
  }
})();
