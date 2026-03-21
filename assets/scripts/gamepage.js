(function () {
  const {
    debounce,
    escapeHtml,
    fetchManifest,
    initFooterYear,
    preloadImage,
    renderControlsMarkup,
  } = window.ClassicGamesHub;

  function enablePlayButton(button, href, label) {
    button.style.display = '';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', 'Play ' + (label || 'game'));
    button.tabIndex = 0;

    button.addEventListener('click', () => {
      button.style.transition = 'transform 160ms cubic-bezier(.2,.9,.3,1)';
      button.style.transform = 'scale(0.98)';
      setTimeout(() => {
        button.style.transform = '';
        window.location.href = href;
      }, 160);
    });

    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        button.click();
      }
    });

    let rect = null;
    let rafId = null;
    const tiltDegrees = 10;
    const hoverScale = 1.12;
    const resetTransition = 'transform 450ms cubic-bezier(.22,1,.36,1)';

    function updateRect() {
      rect = button.getBoundingClientRect();
    }

    function onPointerMove(event) {
      if (!rect) updateRect();
      const clientX = (event.touches && event.touches[0]) ? event.touches[0].clientX : event.clientX;
      const clientY = (event.touches && event.touches[0]) ? event.touches[0].clientY : event.clientY;
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      const nx = (px - 0.5) * 2;
      const ny = (py - 0.5) * 2;
      const rotateY = nx * tiltDegrees * -1;
      const rotateX = ny * tiltDegrees;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        button.style.transition = 'transform 80ms cubic-bezier(.2,.9,.3,1)';
        button.style.transform =
          'perspective(1200px) translateZ(0) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale(' + hoverScale + ')';
      });
    }

    function onPointerEnter() {
      updateRect();
      button.style.transition = 'transform 240ms cubic-bezier(.2,1,.3,1)';
      button.style.transform = 'perspective(1200px) translateZ(0) scale(' + hoverScale + ')';
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });
    }

    function onPointerLeave() {
      if (rafId) cancelAnimationFrame(rafId);
      button.style.transition = resetTransition;
      button.style.transform = 'none';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
    }

    button.addEventListener('pointerenter', onPointerEnter, { passive: true });
    button.addEventListener('pointerleave', onPointerLeave, { passive: true });
    button.addEventListener('touchstart', (event) => {
      updateRect();
      onPointerMove(event);
    }, { passive: true });
    button.addEventListener('touchend', onPointerLeave, { passive: true });
    window.addEventListener('blur', onPointerLeave);
    window.addEventListener('resize', debounce(updateRect, 120));
  }

  function stabiliseThumbBox(thumbEl) {
    if ('aspectRatio' in document.documentElement.style || CSS.supports('aspect-ratio: 1 / 1')) {
      return;
    }

    function update() {
      const width = thumbEl.getBoundingClientRect().width;
      thumbEl.style.height = Math.round(width * 0.75) + 'px';
    }

    update();
    window.addEventListener('resize', debounce(update, 120));
    window.addEventListener('orientationchange', debounce(update, 160));
  }

  async function initGamePage(options) {
    const { manifestPath, fallbackThumbnail, elements } = options;
    const params = new URLSearchParams(window.location.search);
    const gameSlug = params.get('game');

    const titleEl = document.querySelector(elements.title);
    const descEl = document.querySelector(elements.description);
    const thumbEl = document.querySelector(elements.thumbnail);
    const detailsEl = document.querySelector(elements.details);
    const playBtn = document.querySelector(elements.playButton);
    const statusEl = document.querySelector(elements.status);

    if (!titleEl || !descEl || !thumbEl || !detailsEl || !playBtn || !statusEl) {
      throw new Error('Game page elements are missing.');
    }

    initFooterYear();

    if (!gameSlug) {
      statusEl.textContent = 'No game specified in URL.';
      playBtn.style.display = 'none';
      return;
    }

    try {
      const manifest = await fetchManifest(manifestPath);
      const game = manifest.find(
        (entry) => entry.slug === gameSlug && (entry.available === true || entry.available === 'true')
      );

      if (!game) {
        statusEl.textContent = 'Game not found or currently unavailable.';
        playBtn.style.display = 'none';
        return;
      }

      const thumbUrl = game.thumbnail || fallbackThumbnail;
      await preloadImage(thumbUrl);
      stabiliseThumbBox(thumbEl);

      titleEl.textContent = game.title || gameSlug;
      descEl.textContent = game.description || '';
      thumbEl.style.backgroundImage = 'url(\'' + escapeHtml(thumbUrl) + '\')';
      thumbEl.style.backgroundSize = 'cover';
      thumbEl.style.backgroundRepeat = 'no-repeat';
      thumbEl.style.backgroundPosition = 'center center';
      detailsEl.innerHTML = renderControlsMarkup(game);

      const playTarget = game.playUrl
        ? '../games/' + encodeURIComponent(game.slug) + '/' + encodeURIComponent(game.playUrl)
        : '../games/' + encodeURIComponent(game.slug) + '/' + encodeURIComponent(game.slug) + '-game.html';

      enablePlayButton(playBtn, playTarget, game.title || gameSlug);
      statusEl.style.display = 'none';
    } catch (error) {
      console.error(error);
      statusEl.textContent = 'Failed to load game information. Please try again later.';
      playBtn.style.display = 'none';
    }
  }

  window.ClassicGamesHub.initGamePage = initGamePage;
})();
