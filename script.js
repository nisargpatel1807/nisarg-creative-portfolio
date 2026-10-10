(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  const header = $('#siteHeader');
  const progress = $('#scrollProgress');
  const menuToggle = $('#menuToggle');
  const navLinks = $('#navLinks');
  const navAnchors = $$('#navLinks a[href^="#"]');

  const updateScrollState = () => {
    const scrollY = window.scrollY || 0;
    if (header) header.classList.toggle('scrolled', scrollY > 24);
    if (progress) {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = range > 0 ? Math.min(1, scrollY / range) : 0;
      progress.style.width = `${ratio * 100}%`;
    }
  };
  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });

  const closeMenu = () => {
    if (!menuToggle || !navLinks) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    navLinks.classList.remove('open');
    document.body.classList.remove('menu-open');
  };
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
      navLinks.classList.toggle('open', !isOpen);
      document.body.classList.toggle('menu-open', !isOpen);
    });
    navLinks.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 800) closeMenu(); });
  }

  const revealNodes = $$('.reveal');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktopFinePointer = window.matchMedia('(min-width: 801px) and (hover: hover) and (pointer: fine)').matches;
  const canAnimateReveals = !prefersReducedMotion && desktopFinePointer && 'IntersectionObserver' in window;

  if (canAnimateReveals && revealNodes.length) {
    let revealObserver;
    try {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
      document.documentElement.classList.add('reveal-enabled');
      revealNodes.forEach(node => revealObserver.observe(node));
    } catch (error) {
      // If reveal setup fails, remove the hiding state rather than leaving content invisible.
      revealObserver?.disconnect();
      document.documentElement.classList.remove('reveal-enabled');
      revealNodes.forEach(node => node.classList.add('is-visible'));
    }
  } else {
    // Mobile, reduced-motion and unsupported browsers get fully visible content by default.
    revealNodes.forEach(node => node.classList.add('is-visible'));
  }

  // Add section-aware navigation, without creating extra animation work during scroll.
  const sections = ['work', 'collegeProjects', 'process', 'about', 'skills', 'contact'].map(id => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(anchor => {
          const href = anchor.getAttribute('href');
          const isWorkGroup = (entry.target.id === 'collegeProjects' && href === '#work');
          anchor.classList.toggle('active', href === `#${entry.target.id}` || isWorkGroup);
        });
      });
    }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });
    sections.forEach(section => sectionObserver.observe(section));
  }

  // Project filtering is optional but fully functional.
  const filterButtons = $$('.filter-chip');
  const projectCards = $$('[data-project-card]');
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter || 'all';
    filterButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    projectCards.forEach(card => {
      const matches = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('is-filtered-out', !matches);
      if (matches) card.animate?.([{ opacity: 0, transform: 'translateY(9px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300, easing: 'cubic-bezier(.22,.75,.22,1)' });
    });
  }));
  filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));

  // Restrained custom cursor for fine-pointer desktop devices only.
  const dot = $('#cursorDot');
  const ring = $('#cursorRing');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (dot && ring && finePointer && !reduceMotion) {
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let ringX = pointerX;
    let ringY = pointerY;
    let raf = 0;
    const renderCursor = () => {
      ringX += (pointerX - ringX) * 0.24;
      ringY += (pointerY - ringY) * 0.24;
      dot.style.left = `${pointerX}px`;
      dot.style.top = `${pointerY}px`;
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;
      raf = requestAnimationFrame(renderCursor);
    };
    window.addEventListener('pointermove', event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      dot.classList.add('visible');
      ring.classList.add('visible');
    }, { passive: true });
    document.addEventListener('pointerover', event => {
      const target = event.target.closest('a, button, .interactive-card, .skill-row');
      ring.classList.toggle('is-hover', Boolean(target));
      const label = target?.classList.contains('interactive-card') || target?.classList.contains('project-cover') ? 'VIEW' : target?.classList.contains('skill-row') ? '·' : '↗';
      const ringText = $('span', ring);
      if (ringText) ringText.textContent = label;
    });
    document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    document.addEventListener('pointerleave', () => { dot.classList.remove('visible'); ring.classList.remove('visible'); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (!document.hidden && !raf) renderCursor();
    });
    renderCursor();
  }

  // A restrained cool-blue light follows the pointer behind content on desktop.
  const pointerGlow = $('#pointerGlow');
  if (pointerGlow && finePointer && !reduceMotion) {
    let targetX = -500, targetY = -500, currentX = targetX, currentY = targetY, glowRaf = 0;
    const moveGlow = () => {
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      pointerGlow.style.transform = `translate3d(${currentX - 195}px, ${currentY - 195}px, 0)`;
      glowRaf = requestAnimationFrame(moveGlow);
    };
    window.addEventListener('pointermove', event => {
      targetX = event.clientX;
      targetY = event.clientY;
      document.body.classList.add('pointer-active');
      if (!glowRaf) moveGlow();
    }, { passive: true });
    document.addEventListener('pointerleave', () => document.body.classList.remove('pointer-active'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && glowRaf) { cancelAnimationFrame(glowRaf); glowRaf = 0; }
      else if (!document.hidden && !glowRaf) moveGlow();
    });
  }

  // Small, restrained pointer movement on the hero artwork.
  const hero = $('#heroVisual');
  const heroArt = $('.hero-art', hero || document);
  if (hero && heroArt && finePointer && !reduceMotion) {
    hero.addEventListener('pointermove', event => {
      const rect = hero.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      heroArt.style.setProperty('--mx', `${nx * 4}px`);
      heroArt.style.setProperty('--my', `${ny * 4}px`);
    });
    hero.addEventListener('pointerleave', () => {
      heroArt.style.setProperty('--mx', '0px');
      heroArt.style.setProperty('--my', '0px');
    });
  }

  // Project cards have a mild local light response, not a heavy tilt.
  $$('.process-card, .skill-row').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--hx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty('--hy', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
  });

  // Magnetic pull is tiny, and disabled on touch/reduced-motion devices.
  if (finePointer && !reduceMotion) {
    $$('.magnetic').forEach(button => {
      button.addEventListener('pointermove', event => {
        const rect = button.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        button.style.transform = `translate(${dx * 0.022}px, ${dy * 0.035}px)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
  }

  // Click ripple adds visible but restrained feedback to buttons and project links.
  document.addEventListener('click', event => {
    const target = event.target.closest('.button, .nav-contact, .contact-email-button, .project-text-link, .project-cover, .featured-current-visual, .back-top, .inline-link');
    if (!target || reduceMotion) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'click-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    const x = Number.isFinite(event.clientX) && event.clientX !== 0 ? event.clientX - rect.left : rect.width / 2;
    const y = Number.isFinite(event.clientY) && event.clientY !== 0 ? event.clientY - rect.top : rect.height / 2;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    target.appendChild(ripple);
    target.classList.add('is-clicking');
    window.setTimeout(() => { ripple.remove(); target.classList.remove('is-clicking'); }, 650);
  });

  // External contact details are deliberately not invented; email is a real working action.
  const emailLinks = $$('a[href^="mailto:"]');
  emailLinks.forEach(link => link.setAttribute('href', 'mailto:nisargpatel1807@gmail.com'));
})();
