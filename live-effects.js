/* Live field + refined pointer interactions.
   Lightweight canvas: bounded particle count, rAF scheduling, pauses when hidden,
   and respects prefers-reduced-motion. */
(() => {
  'use strict';
  const canvas = document.getElementById('liveField');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Touch-first devices use a lighter rendering profile to keep scrolling smooth.
  const mobileOptimized = window.matchMedia('(max-width: 800px)').matches || !finePointer;
  const targetFrameInterval = mobileOptimized ? 48 : 27; // ~21 fps on phones, ~36 fps on desktop
  const root = document.documentElement;
  const pointer = { x: -9999, y: -9999, active: false };
  let width = 0, height = 0, dpr = 1, particles = [], raf = 0, frameTimer = 0, lastFrame = 0, time = 0;
  let pointerTrail = [];
  const colors = [
    { rgb: '169, 153, 255', hue: 258 },
    { rgb: '109, 231, 255', hue: 190 },
    { rgb: '217, 255, 141', hue: 78 },
    { rgb: '201, 164, 255', hue: 270 }
  ];

  const rand = (min, max) => min + Math.random() * (max - min);
  const makeParticles = () => {
    const count = mobileOptimized
      ? Math.max(10, Math.min(16, Math.round((width * height) / 35000)))
      : Math.max(26, Math.min(76, Math.round((width * height) / 21000)));
    particles = Array.from({ length: count }, (_, i) => {
      const color = colors[i % colors.length];
      return {
        x: rand(0, width), y: rand(0, height),
        vx: rand(-0.19, 0.19), vy: rand(-0.17, 0.17),
        r: rand(0.65, 1.75), phase: rand(0, Math.PI * 2),
        color, drift: rand(0.45, 1.2), alpha: rand(0.22, 0.67)
      };
    });
  };

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, mobileOptimized ? 1 : 1.35);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeParticles();
    if (reduced) draw(0, true);
  }

  function drawWaves(t) {
    const palette = [
      ['rgba(126, 94, 255, 0.07)', 'rgba(109, 231, 255, 0.18)', 'rgba(217, 255, 141, 0.035)'],
      ['rgba(109, 231, 255, 0.04)', 'rgba(158, 125, 255, 0.14)', 'rgba(109, 231, 255, 0.025)'],
      ['rgba(176, 148, 255, 0.04)', 'rgba(79, 239, 208, 0.10)', 'rgba(176, 148, 255, 0.02)']
    ];
    const bands = mobileOptimized ? [0.27, 0.73] : [0.21, 0.43, 0.67, 0.86];
    bands.forEach((base, i) => {
      const amp = Math.min(31, height * 0.045) * (i % 2 ? 0.72 : 1);
      const phase = t * (0.00016 + i * 0.000015) + i * 1.73;
      const grad = ctx.createLinearGradient(0, 0, width, height * 0.12);
      const c = palette[i % palette.length];
      grad.addColorStop(0, c[0]); grad.addColorStop(.52, c[1]); grad.addColorStop(1, c[2]);
      ctx.beginPath();
      for (let x = -22; x <= width + 24; x += mobileOptimized ? 30 : 16) {
        const nx = x / Math.max(1, width);
        let y = height * base + Math.sin(x * 0.0042 + phase) * amp + Math.sin(x * 0.0091 - phase * 1.2) * amp * .27 + Math.cos(nx * Math.PI * 2 + phase * .65) * amp * .23;
        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 190) y += (1 - d / 190) * Math.sin(phase * 1.6 + nx * 10) * 20;
        }
        if (x === -22) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = i === 1 ? 1.1 : .65;
      ctx.stroke();
    });
  }

  function drawParticles(t, staticFrame = false) {
    const maxLink = mobileOptimized ? 72 : (width < 600 ? 94 : 138);
    if (!staticFrame) {
      const step = lastFrame ? Math.min(1.8, (t - lastFrame) / 16.67) : 1;
      particles.forEach(p => {
        p.x += p.vx * step * p.drift + Math.sin(t * .0003 + p.phase) * .075 * step;
        p.y += p.vy * step * p.drift + Math.cos(t * .00024 + p.phase) * .055 * step;
        if (p.x < -8) p.x = width + 8;
        if (p.x > width + 8) p.x = -8;
        if (p.y < -8) p.y = height + 8;
        if (p.y > height + 8) p.y = -8;
        if (pointer.active) {
          const dx = p.x - pointer.x, dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 150 * 150 && d2 > 0.1) {
            const d = Math.sqrt(d2);
            const force = (1 - d / 150) * .18 * step;
            p.x += dx / d * force;
            p.y += dy / d * force;
          }
        }
      });
    }

    // Fine connections create a living constellation, not a heavy particle fog.
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < maxLink * maxLink) {
          const distance = Math.sqrt(d2);
          let alpha = (1 - distance / maxLink) * .115;
          if (pointer.active) {
            const mx = (a.x + b.x) / 2 - pointer.x;
            const my = (a.y + b.y) / 2 - pointer.y;
            const md = Math.sqrt(mx * mx + my * my);
            if (md < 190) alpha += (1 - md / 190) * .12;
          }
          ctx.strokeStyle = `rgba(${a.color.rgb},${Math.min(.22, alpha)})`;
          ctx.lineWidth = .55;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const pulse = .62 + Math.sin(t * .0013 + a.phase) * .22;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r + (staticFrame ? 0 : Math.max(0, pulse * .35)), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${a.color.rgb},${a.alpha * pulse})`;
      ctx.fill();
      if (a.r > 1.25 && !staticFrame && !mobileOptimized) {
        const glow = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r * 5.7);
        glow.addColorStop(0, `rgba(${a.color.rgb},.15)`); glow.addColorStop(1, `rgba(${a.color.rgb},0)`);
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 5.7, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawPointerTrail(t) {
    if (!pointerTrail.length || !pointer.active) return;
    pointerTrail = pointerTrail.filter(point => t - point.t < 420);
    for (let i = 1; i < pointerTrail.length; i++) {
      const a = pointerTrail[i - 1], b = pointerTrail[i];
      const age = (t - b.t) / 420;
      const alpha = Math.max(0, (1 - age) * .12 * (i / pointerTrail.length));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(133, 199, 255, ${alpha})`;
      ctx.lineWidth = .75 + (1 - age) * .7;
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 58);
    g.addColorStop(0, 'rgba(169,153,255,.13)'); g.addColorStop(.42, 'rgba(109,231,255,.07)'); g.addColorStop(1, 'rgba(109,231,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 58, 0, Math.PI * 2); ctx.fill();
  }

  function draw(t, staticFrame = false) {
    ctx.clearRect(0, 0, width, height);
    drawWaves(t);
    drawParticles(t, staticFrame);
    if (!staticFrame && !mobileOptimized) drawPointerTrail(t);
  }

  // Schedule the next draw at the target frame interval instead of running an
  // animation-frame callback on every display refresh. Phones render at ~21 fps;
  // desktops retain a smoother ~30-36 fps field.
  function queueFrame(delay = 0) {
    if (document.hidden || raf || frameTimer) return;
    if (delay > 0) {
      frameTimer = window.setTimeout(() => {
        frameTimer = 0;
        if (!document.hidden) raf = requestAnimationFrame(frame);
      }, delay);
    } else {
      raf = requestAnimationFrame(frame);
    }
  }

  function frame(t) {
    raf = 0;
    if (document.hidden) return;
    const elapsed = lastFrame ? t - lastFrame : targetFrameInterval;
    if (elapsed < targetFrameInterval) {
      queueFrame(targetFrameInterval - elapsed);
      return;
    }
    time = t;
    draw(t, false);
    lastFrame = t;
    queueFrame(targetFrameInterval);
  }
  function start() {
    if (!reduced && !raf && !frameTimer && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    if (frameTimer) window.clearTimeout(frameTimer);
    raf = 0;
    frameTimer = 0;
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', event => {
    if (!finePointer || mobileOptimized || reduced) return;
    pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true;
    pointerTrail.push({ x: pointer.x, y: pointer.y, t: performance.now() });
    if (pointerTrail.length > 16) pointerTrail.shift();
    root.style.setProperty('--field-x', `${(pointer.x / Math.max(1, window.innerWidth)) * 100}%`);
    root.style.setProperty('--field-y', `${(pointer.y / Math.max(1, window.innerHeight)) * 100}%`);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; pointerTrail = []; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

  resize();
  if (!reduced) start();

  // Card spotlight and restrained 2.2-degree tilt add responsive live feedback.
  if (finePointer && !reduced) {
    const hoverTargets = document.querySelectorAll('.featured-current-card, .project-card, .project-cover, .process-card, .skill-row, .design-lab-panel, .saathi-showcase-card, .saathi-visual-shell, .project-archive-link, .contact-email-button, .contact-inner, .featured-current-visual');
    hoverTargets.forEach(target => {
      target.addEventListener('pointermove', event => {
        const rect = target.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100;
        const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100;
        target.style.setProperty('--spot-x', `${x}%`);
        target.style.setProperty('--spot-y', `${y}%`);
        target.style.setProperty('--hx', `${x}%`);
        target.style.setProperty('--hy', `${y}%`);
        if (target.classList.contains('project-cover')) {
          target.style.setProperty('--tilt-x', `${((x - 50) / 50) * 1.6}deg`);
          target.style.setProperty('--tilt-y', `${((50 - y) / 50) * 1.4}deg`);
        }
        target.closest('.project-card')?.classList.add('is-lit');
      }, { passive: true });
      target.addEventListener('pointerleave', () => {
        target.style.setProperty('--spot-x', '50%'); target.style.setProperty('--spot-y', '50%');
        target.style.setProperty('--hx', '50%'); target.style.setProperty('--hy', '50%');
        target.style.setProperty('--tilt-x', '0deg'); target.style.setProperty('--tilt-y', '0deg');
        target.closest('.project-card')?.classList.remove('is-lit');
      }, { passive: true });
    });
  }

  // Polished ripple on clickable controls. It never blocks the target action.
  document.addEventListener('click', event => {
    if (reduced) return;
    const target = event.target.closest('.button, .nav-contact, .project-text-link, .project-cover, .featured-current-visual, .back-top, .inline-link, .contact-email-button, .featured-visual-cta');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'live-ripple'; ripple.setAttribute('aria-hidden', 'true');
    ripple.style.left = `${event.clientX ? event.clientX - rect.left : rect.width / 2}px`;
    ripple.style.top = `${event.clientY ? event.clientY - rect.top : rect.height / 2}px`;
    target.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 850);
  });

  // A tiny stateful time/scroll meter is kept in sync with actual page scroll.
  const meter = document.getElementById('scrollProgress');
  let scrollQueued = false;
  const updateScroll = () => {
    if (meter) {
      const rootEl = document.documentElement;
      const max = Math.max(1, rootEl.scrollHeight - window.innerHeight);
      meter.style.width = `${Math.min(100, Math.max(0, (window.scrollY / max) * 100))}%`;
    }
    scrollQueued = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  updateScroll();
})();
