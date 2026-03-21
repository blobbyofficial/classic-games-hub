(function () {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initFooterYear(root = document) {
    root.querySelectorAll('[data-footer-year]').forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  }

  function debounce(fn, ms = 100) {
    let id;
    return (...args) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...args), ms);
    };
  }

  function preloadImage(src, timeout = 8000) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve();
          }
        }, timeout);

        img.onload = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve();
          }
        };

        img.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve();
          }
        };

        img.src = src;
      } catch (_error) {
        resolve();
      }
    });
  }

  function fetchManifest(manifestPath) {
    return fetch(manifestPath, { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) {
        throw new Error('Manifest not found (HTTP ' + response.status + ')');
      }

      try {
        const manifest = await response.json();
        if (!Array.isArray(manifest)) {
          throw new Error('Manifest format incorrect: expected array');
        }
        return manifest;
      } catch (error) {
        if (error.message.startsWith('Manifest format incorrect')) {
          throw error;
        }
        throw new Error('Manifest JSON is invalid: ' + error.message);
      }
    });
  }

  function renderControlsMarkup(game) {
    return '<p><strong>Controls:</strong> ' + escapeHtml(game.controls || '—') + '</p>';
  }

  window.ClassicGamesHub = {
    escapeHtml,
    initFooterYear,
    debounce,
    preloadImage,
    fetchManifest,
    renderControlsMarkup,
  };
})();
