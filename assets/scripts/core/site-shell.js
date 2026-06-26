(function () {
  const NAV_ITEMS = [
    { title: "Landing", href: "/index.html", label: "Landing" },
    { title: "Library", href: "/pages/homepage.html", label: "Library" },
    { title: "Field Guide", href: "/pages/gamepage.html", label: "Field Guide" },
    { title: "Snake", href: "/pages/snake.html", label: "Snake" },
    { title: "Tetris", href: "/pages/tetris.html", label: "Tetris" },
    { title: "Pong", href: "/games/arcade-cabinet.html?game=pong", label: "Pong" },
    { title: "Invaders", href: "/games/arcade-cabinet.html?game=invaders", label: "Invaders" }
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getSiteBase() {
    const path = window.location.pathname || "/";
    const segments = path.split("/").filter(Boolean);
    const rootIndex = segments.findIndex(function (segment) {
      return segment === "pages" || segment === "games";
    });

    if (rootIndex >= 0) {
      return "/" + segments.slice(0, rootIndex).join("/") + "/";
    }

    if (path.endsWith(".html")) {
      return path.replace(/\/[^/]+\.html$/, "/");
    }

    if (path.endsWith("/")) {
      return path;
    }

    return "/";
  }

  const SITE_BASE = getSiteBase();

  function resolveHref(targetPath) {
    try {
      const normalized = String(targetPath).replace(/^\//, "");
      const url = new URL(normalized, window.location.origin + SITE_BASE);
      return url.pathname + url.search + url.hash;
    } catch (error) {
      return targetPath;
    }
  }

  function buildNavMarkup() {
    return NAV_ITEMS.map(function (item) {
      return (
        '<a class="nav-link" href="' +
        escapeHtml(resolveHref(item.href)) +
        '" data-transition-label="' +
        escapeHtml(item.label) +
        '">' +
        escapeHtml(item.title) +
        "</a>"
      );
    }).join("");
  }

  function renderShells() {
    const header = document.querySelector("[data-shell=topbar]");
    if (header) {
      const level = document.body.classList.contains("arcade-game") ? "game-topbar" : "topbar";
      header.className = level;
      header.innerHTML =
        '<a class="brand" href="' +
        escapeHtml(resolveHref("/index.html")) +
        '" aria-label="Classic Games Hub home">' +
        '<img src="' + escapeHtml(resolveHref("/assets/images/Icon.png")) + '" alt="Classic Games Hub logo" width="48" height="48" />' +
        '<span class="brand-copy">' +
        '<strong>Classic Games Hub</strong>' +
        '<span>' +
        (document.body.classList.contains("arcade-game") ? "Arcade cabinet" : "Static retro arcade") +
        '</span>' +
        '</span>' +
        '</a>' +
        '<nav aria-label="Primary">' +
        buildNavMarkup() +
        "</nav>";
    }

    const footer = document.querySelector("[data-shell=footer]");
    if (footer) {
      footer.className = "site-footer";
      footer.textContent =
        "Classic Games Hub — static arcade library, direct routes, and polished playable cabinets.";
    }
  }

  function init() {
    renderShells();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
