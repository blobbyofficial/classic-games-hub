(function () {
  const TRANSITION_KEY = "classic-games-hub.transition";
  const ENTRANCE_DELAY = 760;
  const TRANSITION_DELAY = 700;
  let loaderState = null;
  let transitioning = false;

  function safeStorageGet(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (_error) {
      return;
    }
  }

  function safeStorageRemove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (_error) {
      return;
    }
  }

  function parsePendingTransition() {
    const raw = safeStorageGet(TRANSITION_KEY);
    safeStorageRemove(TRANSITION_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  function derivePageName() {
    const heading = document.querySelector("h1");
    if (heading && heading.textContent.trim()) {
      return heading.textContent.trim();
    }
    return document.title.replace(/\s*\|.*$/, "").trim() || "Arcade";
  }

  function deriveTargetName(link, url) {
    const text = (link.dataset.transitionLabel || link.getAttribute("aria-label") || link.textContent || "").trim();
    if (text) {
      return text.replace(/\s+/g, " ");
    }
    const slug = url.pathname.split("/").filter(Boolean).pop() || "Arcade";
    return slug.replace(/[-_]/g, " ").replace(/\.[a-z0-9]+$/i, "");
  }

  function buildStatusLines(label) {
    return [
      "Lighting marquee",
      "Booting " + label,
      "Checking controls",
      "Syncing scoreboard",
      "Opening cabinet"
    ];
  }

  function ensureLoader() {
    if (loaderState) {
      return loaderState;
    }

    const loader = document.createElement("div");
    loader.className = "page-loader";
    loader.setAttribute("aria-hidden", "true");
    loader.innerHTML = [
      '<div class="page-loader__panel">',
      '  <div class="page-loader__lights"><span></span><span></span><span></span></div>',
      '  <div class="page-loader__kicker">Classic Games Hub</div>',
      '  <h2 class="page-loader__title">Powering Cabinet</h2>',
      '  <p class="page-loader__subtitle">Preparing the next arcade screen.</p>',
      '  <div class="page-loader__progress"><div class="page-loader__bar"></div></div>',
      '  <p class="page-loader__status">Lighting marquee</p>',
      "</div>"
    ].join("");
    document.body.appendChild(loader);

    loaderState = {
      el: loader,
      title: loader.querySelector(".page-loader__title"),
      subtitle: loader.querySelector(".page-loader__subtitle"),
      status: loader.querySelector(".page-loader__status"),
      timer: null,
      lines: []
    };

    return loaderState;
  }

  function setLoaderCopy(mode, label) {
    const state = ensureLoader();
    state.lines = buildStatusLines(label);
    state.index = 0;

    state.title.textContent = mode === "transition" ? "Loading Next Screen" : "Powering Arcade";
    state.subtitle.textContent =
      mode === "transition"
        ? "Routing to " + label + ". Hold tight while the cabinet switches."
        : "Bringing " + label + " online.";
    state.status.textContent = state.lines[0];

    if (state.timer) {
      clearInterval(state.timer);
    }

    state.timer = setInterval(function () {
      state.index = (state.index + 1) % state.lines.length;
      state.status.textContent = state.lines[state.index];
    }, 260);

    state.el.classList.remove("is-hidden");
    return state;
  }

  function hideLoader() {
    if (!loaderState) {
      return;
    }
    if (loaderState.timer) {
      clearInterval(loaderState.timer);
      loaderState.timer = null;
    }
    loaderState.el.classList.add("is-hidden");
    window.setTimeout(function () {
      if (loaderState && loaderState.el) {
        loaderState.el.remove();
        loaderState = null;
      }
    }, 450);
  }

  function beginEntrance() {
    const pending = parsePendingTransition();
    const label = pending && pending.label ? pending.label : derivePageName();
    setLoaderCopy("entrance", label);

    window.setTimeout(function () {
      document.body.classList.add("is-ready");
      hideLoader();
    }, pending ? 560 : ENTRANCE_DELAY);
  }

  function shouldIntercept(link, event) {
    if (!link || transitioning || event.defaultPrevented) {
      return false;
    }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }
    if (link.hasAttribute("download") || (link.target && link.target !== "_self")) {
      return false;
    }

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return false;
    }

    return true;
  }

  function wireTransitions() {
    document.addEventListener("click", function (event) {
      const link = event.target.closest("a[href]");
      if (!shouldIntercept(link, event)) {
        return;
      }

      const url = new URL(link.getAttribute("href"), window.location.href);
      if (!["http:", "https:", "file:"].includes(url.protocol)) {
        return;
      }
      if (url.href === window.location.href) {
        return;
      }

      transitioning = true;
      event.preventDefault();

      const label = deriveTargetName(link, url);
      safeStorageSet(TRANSITION_KEY, JSON.stringify({ label: label }));
      setLoaderCopy("transition", label);

      window.setTimeout(function () {
        window.location.href = url.href;
      }, TRANSITION_DELAY);
    });
  }

  function init() {
    beginEntrance();
    wireTransitions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
