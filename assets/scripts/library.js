(function () {
  const { escapeHtml, fetchManifest, initFooterYear } = window.ClassicGamesHub;

  function showStatus(grid, message, type = 'info', showRetry = false, retryHandler = null) {
    grid.innerHTML =
      '<div class="status ' + escapeHtml(type) + '">' +
      '<span>' + escapeHtml(message) + '</span>' +
      (showRetry ? '<button class="retry-btn" type="button">Retry</button>' : '') +
      '</div>';

    if (showRetry && retryHandler) {
      grid.querySelector('.retry-btn')?.addEventListener('click', retryHandler);
    }
  }

  function renderCard(grid, game) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML =
      '<div class="thumb" style="background-image:url(\'' + escapeHtml(game.thumbnail) + '\')" role="img" aria-label="' + escapeHtml(game.title) + '"></div>' +
      '<div class="info">' +
      '<h2>' + escapeHtml(game.title) + '</h2>' +
      '<p>' + escapeHtml(game.description) + '</p>' +
      '</div>';

    card.addEventListener('click', () => {
      window.location.href = 'gamepage.html?game=' + encodeURIComponent(game.slug);
    });

    grid.appendChild(card);
    requestAnimationFrame(() => setTimeout(() => card.classList.add('loaded'), 30));
  }

  async function initGameLibrary(options) {
    const { gridSelector, manifestPath } = options;
    const grid = document.querySelector(gridSelector);

    if (!grid) {
      throw new Error('Game library grid not found for selector: ' + gridSelector);
    }

    async function loadGames() {
      grid.setAttribute('aria-busy', 'true');
      showStatus(grid, 'Loading game library…');

      try {
        const manifest = await fetchManifest(manifestPath);
        const available = manifest.filter(
          (game) => game && (game.available === true || game.available === 'true')
        );

        if (available.length === 0) {
          showStatus(grid, 'No games are currently available. Check back later!', 'info');
          return;
        }

        grid.innerHTML = '';
        available.forEach((game) => renderCard(grid, game));
      } catch (error) {
        console.error('Error loading games:', error);
        showStatus(grid, 'Failed to load game library. ' + error.message, 'error', true, loadGames);
      } finally {
        grid.setAttribute('aria-busy', 'false');
      }
    }

    initFooterYear();
    await loadGames();
  }

  window.ClassicGamesHub.initGameLibrary = initGameLibrary;
})();
