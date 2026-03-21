(function () {
  "use strict";

  const STORAGE_PREFIX = "classic-games-hub";
  const BOARD_SIZE = 720;
  const DEFAULT_FILTER = "All";

  const GAME_DEFS = [
    {
      id: "snake",
      title: "Snake Classic",
      category: "Arcade",
      pacing: "Quick runs",
      featured: true,
      external: true,
      description: "Route planning, fast reversals, and classic risk stacking in the original static cabinet.",
      detailRoute: "../pages/snake.html",
      playRoute: "../games/snake/snake-game.html",
      thumb: {
        kicker: "Legacy favorite",
        motif: "Grow the trail, guard your exits.",
        glyph: "S",
        colors: ["#101d3f", "#1f5e91", "#46d98f"]
      }
    },
    {
      id: "tetris",
      title: "Tetris Deluxe",
      category: "Puzzle",
      pacing: "Longer sessions",
      featured: true,
      external: true,
      description: "Drop pieces, preserve space, and recover when the stack gets ugly.",
      detailRoute: "../pages/tetris.html",
      playRoute: "../games/tetris/tetris-game.html",
      thumb: {
        kicker: "Legacy favorite",
        motif: "Stack clean, recover faster.",
        glyph: "T",
        colors: ["#171d46", "#2f54eb", "#8a6dff"]
      }
    },
    {
      id: "pong",
      title: "Pong",
      category: "Arcade",
      pacing: "Instant duel",
      featured: true,
      description: "The original paddle battle. Return sharper angles than the cabinet on the other side.",
      thumb: {
        kicker: "Arcade staple",
        motif: "Paddles, spin, and long rallies.",
        glyph: "||",
        colors: ["#151f45", "#2641b7", "#36d4ff"]
      }
    },
    {
      id: "breakout",
      title: "Breakout",
      category: "Arcade",
      pacing: "Rhythm play",
      featured: true,
      description: "Break the wall one rebound at a time and keep the ball from slipping past the paddle.",
      thumb: {
        kicker: "Cabinet classic",
        motif: "Brick walls and clean rebounds.",
        glyph: "[]",
        colors: ["#1c1e46", "#cc5d2b", "#ffd447"]
      }
    },
    {
      id: "asteroids",
      title: "Asteroids",
      category: "Shooter",
      pacing: "Free-form",
      featured: true,
      description: "Rotate, thrust, and split drifting rocks before they turn the whole field hostile.",
      thumb: {
        kicker: "Vector shooter",
        motif: "Boost, drift, fire, repeat.",
        glyph: "A",
        colors: ["#111827", "#4355a5", "#c8d2ff"]
      }
    },
    {
      id: "invaders",
      title: "Space Invaders",
      category: "Shooter",
      pacing: "Escalating waves",
      featured: true,
      description: "Defend the ground line as the alien rows march lower and start firing back.",
      thumb: {
        kicker: "Arcade invasion",
        motif: "Rows descend, shields crack.",
        glyph: "V",
        colors: ["#140f33", "#5f53d7", "#ff5f5f"]
      }
    },
    {
      id: "frogger",
      title: "Frogger",
      category: "Arcade",
      pacing: "Short bursts",
      featured: true,
      description: "Cross traffic, ride the logs, and hop home before the lanes turn impossible.",
      thumb: {
        kicker: "Road crossing",
        motif: "Cars below, river above.",
        glyph: "F",
        colors: ["#102a22", "#1ea96d", "#a6ff6e"]
      }
    },
    {
      id: "runner",
      title: "Arcade Runner",
      category: "Arcade",
      pacing: "Endless sprint",
      description: "Jump barriers, duck hazards, and hold your pace as the track speeds up.",
      thumb: {
        kicker: "Reflex lane",
        motif: "One button jumps, one button ducks.",
        glyph: "R",
        colors: ["#201736", "#6c4cff", "#36d4ff"]
      }
    },
    {
      id: "whack",
      title: "Whack-a-Mole",
      category: "Reaction",
      pacing: "Party quickplay",
      description: "Moles keep popping, the clock keeps falling, and hesitation costs you points.",
      thumb: {
        kicker: "Carnival favorite",
        motif: "Fast taps and hole reading.",
        glyph: "9",
        colors: ["#3a1e10", "#9f5e2d", "#ffd447"]
      }
    },
    {
      id: "simon",
      title: "Simon",
      category: "Memory",
      pacing: "Pattern memory",
      description: "Watch the sequence, replay it cleanly, and survive as the chain gets longer.",
      thumb: {
        kicker: "Living room classic",
        motif: "Color memory under pressure.",
        glyph: "4",
        colors: ["#1a1838", "#4a45b5", "#ff5f5f"]
      }
    },
    {
      id: "memory",
      title: "Memory Match",
      category: "Memory",
      pacing: "Steady pace",
      description: "Flip pairs, remember positions, and clear the whole board in fewer turns.",
      thumb: {
        kicker: "Card table",
        motif: "Pairs, patterns, and recall.",
        glyph: "M",
        colors: ["#132034", "#1f7ab8", "#8de0ff"]
      }
    },
    {
      id: "mines",
      title: "Minesweeper",
      category: "Puzzle",
      pacing: "Measured",
      description: "Read the numbers, flag the danger, and open every safe square without a bad reveal.",
      thumb: {
        kicker: "Desk classic",
        motif: "Numbers guide every risk.",
        glyph: "*",
        colors: ["#1a1f2f", "#3d4b73", "#ff8d43"]
      }
    },
    {
      id: "connect4",
      title: "Connect Four",
      category: "Board",
      pacing: "Head-to-head",
      description: "Drop discs, threaten vertical traps, and beat the cabinet to the winning line.",
      thumb: {
        kicker: "Family board game",
        motif: "Columns, threats, and center control.",
        glyph: "4",
        colors: ["#101d54", "#1f4ad8", "#ffcf3a"]
      }
    },
    {
      id: "tictactoe",
      title: "Tic-Tac-Toe",
      category: "Board",
      pacing: "Micro match",
      description: "Simple grid, quick reads, and a computer that punishes sloppy openings.",
      thumb: {
        kicker: "Notebook classic",
        motif: "Corners, forks, and blocks.",
        glyph: "X",
        colors: ["#1b1835", "#6b4ef7", "#ff8d43"]
      }
    },
    {
      id: "reversi",
      title: "Reversi",
      category: "Board",
      pacing: "Strategic",
      description: "Flip the edges, fight for corners, and swing the board in the endgame.",
      thumb: {
        kicker: "Strategy board",
        motif: "Corners decide everything.",
        glyph: "O",
        colors: ["#0e2a26", "#1e9a91", "#d5fff8"]
      }
    },
    {
      id: "2048",
      title: "2048",
      category: "Puzzle",
      pacing: "Chain building",
      description: "Merge tiles, preserve escape lanes, and chase bigger numbers without locking the board.",
      thumb: {
        kicker: "Phone-era classic",
        motif: "Slide, merge, and hold a lane.",
        glyph: "2",
        colors: ["#3a2216", "#b56a2f", "#ffd98b"]
      }
    },
    {
      id: "slide",
      title: "Slide Puzzle",
      category: "Puzzle",
      pacing: "Calm challenge",
      description: "Rebuild the full number order one adjacent slide at a time.",
      thumb: {
        kicker: "Toy chest favorite",
        motif: "One blank tile changes everything.",
        glyph: "#",
        colors: ["#141d34", "#38538e", "#8a6dff"]
      }
    },
    {
      id: "hangman",
      title: "Hangman",
      category: "Word",
      pacing: "Casual",
      description: "Guess letters, read the pattern, and save the word before the drawing is complete.",
      thumb: {
        kicker: "Classroom throwback",
        motif: "Letters, guesses, and pressure.",
        glyph: "H",
        colors: ["#1d1630", "#684c9e", "#ff9f55"]
      }
    },
    {
      id: "bubble",
      title: "Bubble Shooter",
      category: "Puzzle",
      pacing: "Angle play",
      description: "Aim the launcher, match clusters, and stop the ceiling from creeping down.",
      thumb: {
        kicker: "Arcade puzzler",
        motif: "Line the shot, pop the cluster.",
        glyph: "B",
        colors: ["#10253b", "#2674b8", "#7ef5d7"]
      }
    },
    {
      id: "match3",
      title: "Match-3",
      category: "Puzzle",
      pacing: "Combo chase",
      description: "Swap adjacent gems, trigger cascades, and hit the target before the moves run out.",
      thumb: {
        kicker: "Candy-board style",
        motif: "Swaps, combos, and refill cascades.",
        glyph: "3",
        colors: ["#31163a", "#af4d9d", "#ffd447"]
      }
    },
    {
      id: "mastermind",
      title: "Mastermind",
      category: "Strategy",
      pacing: "Deduction",
      description: "Read the clues, eliminate bad color placements, and crack the hidden code.",
      thumb: {
        kicker: "Logic classic",
        motif: "Exact hits and near misses.",
        glyph: "?",
        colors: ["#161a31", "#4b58a4", "#ff5f8b"]
      }
    },
    {
      id: "target",
      title: "Target Gallery",
      category: "Reaction",
      pacing: "High score chase",
      description: "Shoot moving targets, avoid bad misses, and keep the score rising before time expires.",
      thumb: {
        kicker: "Carnival gallery",
        motif: "Tap the moving marks.",
        glyph: "+",
        colors: ["#1d2230", "#6b7da4", "#ffcf47"]
      }
    }
  ].map(function (game) {
    if (!game.playRoute) {
      game.playRoute = "../games/arcade-cabinet.html?game=" + encodeURIComponent(game.id);
    }
    if (!game.detailRoute) {
      game.detailRoute = game.playRoute;
    }
    return game;
  });

  const GAME_MAP = {};
  GAME_DEFS.forEach(function (game) {
    GAME_MAP[game.id] = game;
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function pick(list) {
    return list[randInt(0, list.length - 1)];
  }

  function shuffle(list) {
    for (let index = list.length - 1; index > 0; index -= 1) {
      const swapIndex = randInt(0, index);
      const tmp = list[index];
      list[index] = list[swapIndex];
      list[swapIndex] = tmp;
    }
    return list;
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function rectsIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleHitsRect(circle, rect) {
    const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
    const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
    return distance(circle.x, circle.y, closestX, closestY) <= circle.r;
  }

  function normalizeKey(key) {
    if (!key) {
      return "";
    }
    if (key === " ") {
      return "space";
    }
    return key.toLowerCase();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function makeThumbMarkup(game, hero) {
    const colors = game.thumb.colors;
    const style =
      "background:" +
      "radial-gradient(circle at 18% 16%, rgba(255,255,255,0.16), transparent 24%)," +
      "radial-gradient(circle at 82% 78%, rgba(255,255,255,0.14), transparent 22%)," +
      "linear-gradient(145deg," + colors[0] + "," + colors[1] + " 58%," + colors[2] + ");";
    return (
      '<div class="game-thumb' +
      (hero ? " game-thumb--hero" : "") +
      '" style="' +
      style +
      '">' +
      '<span class="game-thumb__kicker">' +
      escapeHtml(game.thumb.kicker) +
      "</span>" +
      '<h3 class="game-thumb__title">' +
      escapeHtml(game.title) +
      "</h3>" +
      '<p class="game-thumb__motif">' +
      escapeHtml(game.thumb.motif) +
      "</p>" +
      '<span class="game-thumb__glyph">' +
      escapeHtml(game.thumb.glyph) +
      "</span>" +
      "</div>"
    );
  }

  function getGameFilters() {
    return [DEFAULT_FILTER].concat(
      Array.from(
        new Set(
          GAME_DEFS.map(function (game) {
            return game.category;
          })
        )
      ).sort()
    );
  }

  function makeCatalogCard(game) {
    const primaryLabel = game.external ? "View details" : "Open cabinet";
    const actionMarkup = game.external
      ? '<div class="button-row">' +
        '<a class="button ink" href="' +
        escapeHtml(game.detailRoute) +
        '" data-transition-label="' +
        escapeHtml(game.title) +
        '">' +
        primaryLabel +
        "</a>" +
        '<a class="button secondary" href="' +
        escapeHtml(game.playRoute) +
        '" data-transition-label="' +
        escapeHtml(game.title) +
        '">Play now</a>' +
        "</div>"
      : '<div class="button-row">' +
        '<a class="button ink" href="' +
        escapeHtml(game.playRoute) +
        '" data-transition-label="' +
        escapeHtml(game.title) +
        '">' +
        primaryLabel +
        "</a>" +
        "</div>";
    return (
      '<article class="catalog-card">' +
      '<div class="catalog-card__header">' +
      '<div class="catalog-card__meta">' +
      '<span class="tag">' +
      escapeHtml(game.category) +
      "</span>" +
      '<span class="tag">' +
      escapeHtml(game.pacing) +
      "</span>" +
      "</div>" +
      "</div>" +
      makeThumbMarkup(game, false) +
      '<div class="catalog-card__copy">' +
      "<h3>" +
      escapeHtml(game.title) +
      "</h3>" +
      "<p>" +
      escapeHtml(game.description) +
      "</p>" +
      "</div>" +
      '<div class="catalog-card__footer">' +
      '<div class="catalog-card__stats">' +
      "<span>Mobile friendly</span>" +
      "<span>Desktop ready</span>" +
      "<span>Static route</span>" +
      "</div>" +
      actionMarkup +
      "</div>" +
      "</article>"
    );
  }

  function makeFilterChip(name, active) {
    return (
      '<button class="filter-chip' +
      (active ? " is-active" : "") +
      '" type="button" data-filter="' +
      escapeHtml(name) +
      '">' +
      escapeHtml(name) +
      "</button>"
    );
  }

  function getDefaultCabinetSettings() {
    return [
      {
        key: "difficulty",
        label: "Difficulty",
        help: "Adjusts enemy pressure, timers, and cabinet speed.",
        options: [
          { value: "easy", label: "Easy" },
          { value: "normal", label: "Standard" },
          { value: "hard", label: "Expert" }
        ],
        defaultValue: "normal"
      },
      {
        key: "pace",
        label: "Pace",
        help: "Changes how calm or fast the round feels overall.",
        options: [
          { value: "relaxed", label: "Relaxed" },
          { value: "classic", label: "Classic" },
          { value: "turbo", label: "Turbo" }
        ],
        defaultValue: "classic"
      },
      {
        key: "assist",
        label: "Assist",
        help: "Adds forgiveness, hints, or softer rule pressure where supported.",
        options: [
          { value: "forgiving", label: "Forgiving" },
          { value: "balanced", label: "Balanced" },
          { value: "pure", label: "Pure" }
        ],
        defaultValue: "balanced"
      }
    ];
  }

  function cloneSettings(settings) {
    return settings.map(function (setting) {
      return {
        key: setting.key,
        label: setting.label,
        help: setting.help,
        defaultValue: setting.defaultValue,
        options: (setting.options || []).map(function (option) {
          return { value: option.value, label: option.label };
        })
      };
    });
  }

  function mapSetting(runtime, key, values, fallback) {
    const selected = runtime.getSetting(key, fallback);
    return Object.prototype.hasOwnProperty.call(values, selected) ? values[selected] : values[fallback];
  }

  function getDifficultyValue(runtime) {
    return runtime.getSetting("difficulty", "normal");
  }

  function getPaceValue(runtime) {
    return runtime.getSetting("pace", "classic");
  }

  function getAssistValue(runtime) {
    return runtime.getSetting("assist", "balanced");
  }

  function isForgiving(runtime) {
    return getAssistValue(runtime) === "forgiving";
  }

  function isPure(runtime) {
    return getAssistValue(runtime) === "pure";
  }

  function renderLibrary(options) {
    const featuredMount = document.querySelector(options.featuredSelector);
    const mount = document.querySelector(options.mountSelector);
    const filtersMount = document.querySelector(options.filtersSelector);
    const countMount = document.querySelector(options.countSelector);
    const summaryMount = document.querySelector(options.summarySelector);
    if (!mount || !filtersMount) {
      return;
    }

    let activeFilter = DEFAULT_FILTER;
    const filters = getGameFilters();

    function renderList() {
      const visibleGames = GAME_DEFS.filter(function (game) {
        return activeFilter === DEFAULT_FILTER || game.category === activeFilter;
      });

      mount.innerHTML = visibleGames.length
        ? visibleGames.map(makeCatalogCard).join("")
        : '<div class="library-empty">No cabinets match that filter yet.</div>';

      if (countMount) {
        countMount.textContent = String(visibleGames.length);
      }

      if (summaryMount) {
        summaryMount.innerHTML =
          '<span class="chip dark">' +
          visibleGames.length +
          " showing</span>" +
          '<span class="chip dark">' +
          GAME_DEFS.filter(function (game) {
            return !game.external;
          }).length +
          " new cabinets</span>" +
          '<span class="chip dark">' +
          GAME_DEFS.filter(function (game) {
            return game.external;
          }).length +
          " legacy games</span>";
      }

      filtersMount.innerHTML = filters
        .map(function (filter) {
          return makeFilterChip(filter, filter === activeFilter);
        })
        .join("");
    }

    if (featuredMount) {
      featuredMount.innerHTML = GAME_DEFS.filter(function (game) {
        return game.featured;
      })
        .slice(0, 6)
        .map(makeCatalogCard)
        .join("");
    }

    filtersMount.addEventListener("click", function (event) {
      const button = event.target.closest("[data-filter]");
      if (!button) {
        return;
      }
      activeFilter = button.getAttribute("data-filter") || DEFAULT_FILTER;
      renderList();
    });

    renderList();
  }

  function CabinetRuntime(options) {
    this.canvas = document.querySelector(options.canvasSelector);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.titleNode = document.querySelector(options.titleSelector);
    this.categoryNode = document.querySelector(options.categorySelector);
    this.descriptionNode = document.querySelector(options.descriptionSelector);
    this.thumbNode = document.querySelector(options.thumbSelector);
    this.controlsNode = document.querySelector(options.controlsSelector);
    this.settingsForm = document.querySelector(options.settingsFormSelector);
    this.settingsNote = document.querySelector(options.settingsNoteSelector);
    this.applySettingsButton = document.querySelector(options.applySettingsSelector);
    this.defaultSettingsButton = document.querySelector(options.defaultSettingsSelector);
    this.touchCard = document.querySelector(options.touchCardSelector);
    this.touchPad = document.querySelector(options.touchPadSelector);
    this.touchNote = document.querySelector(options.touchNoteSelector);
    this.overlay = document.querySelector(options.overlaySelector);
    this.overlayTitle = document.querySelector(options.overlayTitleSelector);
    this.overlayText = document.querySelector(options.overlayTextSelector);
    this.overlayButton = document.querySelector(options.overlayButtonSelector);
    this.pauseButton = document.querySelector(options.pauseSelector);
    this.restartButton = document.querySelector(options.restartSelector);
    this.statusNode = document.querySelector(options.statusSelector);
    this.metricNodes = options.metricSelectors.map(function (metric) {
      return {
        label: document.querySelector(metric.label),
        value: document.querySelector(metric.value)
      };
    });
    this.currentGame = null;
    this.currentMeta = null;
    this.actions = Object.create(null);
    this.settingValues = Object.create(null);
    this.settingDefinitions = [];
    this.started = false;
    this.paused = false;
    this.ended = false;
    this.lastTime = 0;
    this.raf = 0;
    this.metrics = [
      { label: "Score", value: "0" },
      { label: "Best", value: "0" },
      { label: "Level", value: "1" },
      { label: "State", value: "Ready" }
    ];
    this.loop = this.loop.bind(this);

    if (this.canvas && this.ctx) {
      this.ctx.textBaseline = "middle";
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.bindEvents();
      this.loadGame(this.resolveGameId());
      this.raf = window.requestAnimationFrame(this.loop);
    }
  }

  CabinetRuntime.prototype.resolveGameId = function resolveGameId() {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("game") || "pong";
    const found = GAME_MAP[requestedId];
    if (!found || found.external) {
      return "pong";
    }
    return requestedId;
  };

  CabinetRuntime.prototype.bindEvents = function bindEvents() {
    const runtime = this;

    window.addEventListener("keydown", function (event) {
      if (!runtime.currentMeta) {
        return;
      }
      const key = normalizeKey(event.key);
      const mapped = runtime.currentMeta.keyMap && runtime.currentMeta.keyMap[key];
      if (mapped) {
        event.preventDefault();
        if (!runtime.actions[mapped]) {
          runtime.actions[mapped] = true;
          if (runtime.currentGame && runtime.currentGame.onAction) {
            runtime.currentGame.onAction(mapped, true);
          }
        }
        return;
      }
      if (key === "p") {
        event.preventDefault();
        runtime.togglePause();
        return;
      }
      if (key === "r") {
        event.preventDefault();
        runtime.restartGame();
        return;
      }
      if (runtime.currentGame && runtime.currentGame.onTextInput && key.length === 1) {
        runtime.currentGame.onTextInput(key);
      }
    });

    window.addEventListener("keyup", function (event) {
      if (!runtime.currentMeta) {
        return;
      }
      const key = normalizeKey(event.key);
      const mapped = runtime.currentMeta.keyMap && runtime.currentMeta.keyMap[key];
      if (!mapped) {
        return;
      }
      event.preventDefault();
      delete runtime.actions[mapped];
      if (runtime.currentGame && runtime.currentGame.onAction) {
        runtime.currentGame.onAction(mapped, false);
      }
    });

    window.addEventListener("blur", function () {
      if (runtime.started && !runtime.paused && !runtime.ended) {
        runtime.togglePause(true);
      }
    });

    this.canvas.addEventListener("pointerdown", function (event) {
      const rect = runtime.canvas.getBoundingClientRect();
      const point = {
        x: ((event.clientX - rect.left) / rect.width) * runtime.canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * runtime.canvas.height
      };
      if (runtime.currentGame && runtime.currentGame.onPointer) {
        runtime.currentGame.onPointer(point, event);
      }
      event.preventDefault();
    });

    if (this.overlayButton) {
      this.overlayButton.addEventListener("click", function () {
        if (runtime.ended) {
          runtime.restartGame();
          return;
        }
        if (runtime.paused) {
          runtime.paused = false;
          runtime.started = true;
          runtime.hideOverlay();
          runtime.setStatus("Back in motion.");
          return;
        }
        runtime.started = true;
        runtime.hideOverlay();
        if (runtime.currentGame && runtime.currentGame.onStart) {
          runtime.currentGame.onStart();
        }
      });
    }

    if (this.pauseButton) {
      this.pauseButton.addEventListener("click", function () {
        runtime.togglePause();
      });
    }

    if (this.restartButton) {
      this.restartButton.addEventListener("click", function () {
        runtime.restartGame();
      });
    }

    if (this.applySettingsButton) {
      this.applySettingsButton.addEventListener("click", function () {
        runtime.applySettings(false);
      });
    }

    if (this.defaultSettingsButton) {
      this.defaultSettingsButton.addEventListener("click", function () {
        runtime.applySettings(true);
      });
    }
  };

  CabinetRuntime.prototype.loadGame = function loadGame(gameId) {
    const meta = GAME_MAP[gameId] || GAME_MAP.pong;
    const factory = FACTORIES[meta.id];
    if (!factory) {
      return;
    }
    this.currentMeta = meta;
    this.currentGame = factory(this, meta);
    this.started = false;
    this.paused = false;
    this.ended = false;
    this.actions = Object.create(null);

    if (this.titleNode) {
      this.titleNode.textContent = meta.title;
    }
    if (this.categoryNode) {
      this.categoryNode.textContent = meta.category + " cabinet";
    }
    if (this.descriptionNode) {
      this.descriptionNode.textContent = meta.description;
    }
    if (this.thumbNode) {
      const thumbId = this.thumbNode.id;
      this.thumbNode.outerHTML = makeThumbMarkup(meta, true).replace(
        'class="game-thumb game-thumb--hero"',
        'class="game-thumb game-thumb--hero" id="' + thumbId + '"'
      );
      this.thumbNode = document.getElementById(thumbId);
    }
    if (this.controlsNode) {
      this.controlsNode.innerHTML = (meta.controls || [])
        .map(function (control) {
          return "<li><strong>" + escapeHtml(control.label) + "</strong>" + escapeHtml(control.text) + "</li>";
        })
        .join("");
    }
    this.buildSettings(cloneSettings(meta.settings || getDefaultCabinetSettings()));
    this.buildTouchPad(meta.touch || [], meta.touchNote || "Tap the controls below or use the keyboard.");
    this.currentGame.reset();
    this.setOverlay(meta.title, meta.startText || "Press start to power up this cabinet.", meta.startButton || "Start Game");
    this.renderMetrics();
    this.setStatus("Cabinet ready.");
  };

  CabinetRuntime.prototype.buildSettings = function buildSettings(settings) {
    this.settingDefinitions = settings;
    if (!this.settingsForm) {
      return;
    }

    const runtime = this;
    this.settingValues = Object.create(null);
    this.settingsForm.innerHTML = settings
      .map(function (setting) {
        const stored = runtime.readSettingValue(setting);
        runtime.settingValues[setting.key] = stored;
        const options = (setting.options || [])
          .map(function (option) {
            return (
              '<option value="' +
              escapeHtml(option.value) +
              '"' +
              (option.value === stored ? " selected" : "") +
              ">" +
              escapeHtml(option.label) +
              "</option>"
            );
          })
          .join("");
        return (
          '<div class="setting-field">' +
          "<label>" +
          "<span>" +
          escapeHtml(setting.label) +
          "</span>" +
          '<select data-setting="' +
          escapeHtml(setting.key) +
          '">' +
          options +
          "</select>" +
          (setting.help ? "<small>" + escapeHtml(setting.help) + "</small>" : "") +
          "</label>" +
          "</div>"
        );
      })
      .join("");

    if (this.settingsNote) {
      this.settingsNote.textContent = "Difficulty, pace, and assist apply when you reset the round.";
    }
  };

  CabinetRuntime.prototype.readSettingValue = function readSettingValue(setting) {
    const fallback = setting.defaultValue || (setting.options && setting.options[0] && setting.options[0].value) || "";
    try {
      const stored = window.localStorage.getItem(this.storageKey("setting." + setting.key));
      const valid = (setting.options || []).some(function (option) {
        return option.value === stored;
      });
      return valid ? stored : fallback;
    } catch (error) {
      return fallback;
    }
  };

  CabinetRuntime.prototype.captureSettingsFromForm = function captureSettingsFromForm() {
    if (!this.settingsForm) {
      return;
    }
    const runtime = this;
    this.settingDefinitions.forEach(function (setting) {
      const select = runtime.settingsForm.querySelector('[data-setting="' + setting.key + '"]');
      const fallback = setting.defaultValue || "";
      const value = select ? select.value : fallback;
      runtime.settingValues[setting.key] = value;
      try {
        window.localStorage.setItem(runtime.storageKey("setting." + setting.key), value);
      } catch (error) {
        return;
      }
    });
  };

  CabinetRuntime.prototype.applySettings = function applySettings(useDefaults) {
    if (!this.currentGame) {
      return;
    }
    if (useDefaults && this.settingsForm) {
      this.settingDefinitions.forEach(
        function (setting) {
          const select = this.settingsForm.querySelector('[data-setting="' + setting.key + '"]');
          if (select) {
            select.value = setting.defaultValue || "";
          }
        }.bind(this)
      );
    }
    this.captureSettingsFromForm();
    this.actions = Object.create(null);
    this.started = false;
    this.paused = false;
    this.ended = false;
    this.currentGame.reset();
    this.renderMetrics();
    this.setOverlay("Settings Applied", "The round was reset with the new cabinet rules.", "Start Game");
    this.setStatus("Settings applied. Press start to begin.");
  };

  CabinetRuntime.prototype.buildTouchPad = function buildTouchPad(buttons, note) {
    if (!this.touchCard || !this.touchPad || !this.touchNote) {
      return;
    }
    this.touchNote.textContent = note || "";
    this.touchPad.innerHTML = "";
    this.touchCard.classList.toggle("is-hidden", buttons.length === 0);
    if (buttons.length === 0) {
      return;
    }
    const runtime = this;
    buttons.forEach(function (buttonConfig) {
      if (buttonConfig.empty) {
        const spacer = document.createElement("span");
        spacer.className = "empty";
        spacer.setAttribute("aria-hidden", "true");
        runtime.touchPad.appendChild(spacer);
        return;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "game-button " + (buttonConfig.variant || "secondary");
      button.textContent = buttonConfig.label;
      if (buttonConfig.hold) {
        button.addEventListener("pointerdown", function (event) {
          event.preventDefault();
          runtime.actions[buttonConfig.action] = true;
          button.classList.add("is-active");
          if (runtime.currentGame && runtime.currentGame.onAction) {
            runtime.currentGame.onAction(buttonConfig.action, true);
          }
        });
        ["pointerup", "pointerleave", "pointercancel"].forEach(function (eventName) {
          button.addEventListener(eventName, function () {
            delete runtime.actions[buttonConfig.action];
            button.classList.remove("is-active");
            if (runtime.currentGame && runtime.currentGame.onAction) {
              runtime.currentGame.onAction(buttonConfig.action, false);
            }
          });
        });
      } else {
        button.addEventListener("click", function () {
          if (runtime.currentGame && runtime.currentGame.onAction) {
            runtime.currentGame.onAction(buttonConfig.action, true);
            runtime.currentGame.onAction(buttonConfig.action, false);
          }
        });
      }
      runtime.touchPad.appendChild(button);
    });
  };

  CabinetRuntime.prototype.renderMetrics = function renderMetrics() {
    this.metricNodes.forEach(
      function (node, index) {
        const metric = this.metrics[index] || { label: "-", value: "-" };
        if (node.label) {
          node.label.textContent = metric.label;
        }
        if (node.value) {
          node.value.textContent = String(metric.value);
        }
      }.bind(this)
    );
  };

  CabinetRuntime.prototype.setMetrics = function setMetrics(metrics) {
    this.metrics = metrics.slice(0, 4);
    while (this.metrics.length < 4) {
      this.metrics.push({ label: "-", value: "-" });
    }
    this.renderMetrics();
  };

  CabinetRuntime.prototype.setStatus = function setStatus(message) {
    if (this.statusNode) {
      this.statusNode.textContent = message;
    }
  };

  CabinetRuntime.prototype.setOverlay = function setOverlay(title, text, buttonLabel) {
    if (this.overlayTitle) {
      this.overlayTitle.textContent = title;
    }
    if (this.overlayText) {
      this.overlayText.textContent = text;
    }
    if (this.overlayButton) {
      this.overlayButton.textContent = buttonLabel || "Start Game";
    }
    if (this.overlay) {
      this.overlay.classList.add("visible");
    }
  };

  CabinetRuntime.prototype.hideOverlay = function hideOverlay() {
    if (this.overlay) {
      this.overlay.classList.remove("visible");
    }
  };

  CabinetRuntime.prototype.togglePause = function togglePause(forcePause) {
    if (this.ended || !this.currentGame) {
      return;
    }
    if (!this.started && !forcePause) {
      this.started = true;
      this.hideOverlay();
      if (this.currentGame.onStart) {
        this.currentGame.onStart();
      }
      return;
    }
    if (!this.started) {
      return;
    }
    this.paused = forcePause === true ? true : !this.paused;
    if (this.paused) {
      this.setOverlay("Paused", "The cabinet is on hold. Resume when you are ready.", "Resume");
      this.setStatus("Paused.");
    } else {
      this.hideOverlay();
      this.setStatus("Back in play.");
    }
  };

  CabinetRuntime.prototype.restartGame = function restartGame() {
    if (!this.currentGame) {
      return;
    }
    this.actions = Object.create(null);
    this.currentGame.reset();
    this.started = true;
    this.paused = false;
    this.ended = false;
    this.hideOverlay();
    if (this.currentGame.onStart) {
      this.currentGame.onStart();
    }
    this.setStatus("Fresh round.");
  };

  CabinetRuntime.prototype.finish = function finish(title, text) {
    this.ended = true;
    this.started = false;
    this.paused = false;
    this.setOverlay(title, text, "Play Again");
  };

  CabinetRuntime.prototype.storageKey = function storageKey(suffix) {
    return STORAGE_PREFIX + "." + this.currentMeta.id + "." + suffix;
  };

  CabinetRuntime.prototype.getSetting = function getSetting(key, fallback) {
    return Object.prototype.hasOwnProperty.call(this.settingValues, key) ? this.settingValues[key] : fallback;
  };

  CabinetRuntime.prototype.getTickScale = function getTickScale() {
    const difficulty = mapSetting(
      this,
      "difficulty",
      { easy: 0.88, normal: 1, hard: 1.16 },
      "normal"
    );
    const pace = mapSetting(
      this,
      "pace",
      { relaxed: 0.9, classic: 1, turbo: 1.14 },
      "classic"
    );
    return difficulty * pace;
  };

  CabinetRuntime.prototype.readNumber = function readNumber(suffix, fallback) {
    try {
      const stored = window.localStorage.getItem(this.storageKey(suffix));
      const value = stored === null ? fallback : Number(stored);
      return Number.isFinite(value) ? value : fallback;
    } catch (error) {
      return fallback;
    }
  };

  CabinetRuntime.prototype.writeNumber = function writeNumber(suffix, value) {
    try {
      window.localStorage.setItem(this.storageKey(suffix), String(value));
    } catch (error) {
      return;
    }
  };

  CabinetRuntime.prototype.loop = function cabinetLoop(timestamp) {
    const dt = this.lastTime ? Math.min(0.032, (timestamp - this.lastTime) / 1000) : 0.016;
    this.lastTime = timestamp;
    if (this.currentGame && this.started && !this.paused && !this.ended && this.currentGame.update) {
      this.currentGame.update(dt * this.getTickScale());
    }
    if (this.currentGame && this.currentGame.render) {
      this.currentGame.render(this.ctx);
    }
    if (this.currentGame && this.currentGame.syncHud) {
      this.currentGame.syncHud();
    }
    this.raf = window.requestAnimationFrame(this.loop);
  };

  function initCabinet(options) {
    return new CabinetRuntime(options);
  }

  function paintBackdrop(ctx, colorA, colorB) {
    const gradient = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(1, colorB);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x <= BOARD_SIZE; x += 48) {
      ctx.fillRect(x, 0, 1, BOARD_SIZE);
    }
    for (let y = 0; y <= BOARD_SIZE; y += 48) {
      ctx.fillRect(0, y, BOARD_SIZE, 1);
    }
    const vignette = ctx.createRadialGradient(360, 300, 120, 360, 360, 420);
    vignette.addColorStop(0, "rgba(255,255,255,0.06)");
    vignette.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function drawLabel(ctx, text, x, y, size, color, align, font) {
    ctx.fillStyle = color || "#f6f0d6";
    ctx.font = (font || "700") + " " + size + "px Trebuchet MS";
    ctx.textAlign = align || "left";
    ctx.fillText(text, x, y);
  }

  function drawBadge(ctx, text, x, y, fill, stroke) {
    const padX = 14;
    ctx.font = "700 18px 'Lucida Console'";
    const width = ctx.measureText(text).width + padX * 2;
    roundRect(ctx, x, y, width, 32, 16, fill, stroke);
    ctx.fillStyle = "#f6f0d6";
    ctx.textAlign = "left";
    ctx.fillText(text, x + padX, y + 17);
  }

  function drawCenteredText(ctx, text, x, y, size, color, weight) {
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.font = (weight || "700") + " " + size + "px Trebuchet MS";
    ctx.fillText(text, x, y);
  }

  function gridCellFromPoint(point, originX, originY, cellSize, cols, rows) {
    const col = Math.floor((point.x - originX) / cellSize);
    const row = Math.floor((point.y - originY) / cellSize);
    if (col < 0 || row < 0 || col >= cols || row >= rows) {
      return null;
    }
    return { col: col, row: row };
  }

  const FACTORIES = {
    pong: createPong,
    breakout: createBreakout,
    asteroids: createAsteroids,
    invaders: createInvaders,
    frogger: createFrogger,
    runner: createRunner,
    whack: createWhack,
    simon: createSimon,
    memory: createMemory,
    mines: createMines,
    connect4: createConnectFour,
    tictactoe: createTicTacToe,
    reversi: createReversi,
    "2048": create2048,
    slide: createSlidePuzzle,
    hangman: createHangman,
    bubble: createBubbleShooter,
    match3: createMatchThree,
    mastermind: createMastermind,
    target: createTargetGallery
  };

  function createPong(runtime, meta) {
    meta.controls = [
      { label: "Move", text: "Arrow keys or W and S steer the near paddle." },
      { label: "Goal", text: "Win the rally race to seven points." },
      { label: "Extras", text: "Use P to pause and R to restart at any time." }
    ];
    meta.keyMap = {
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down"
    };
    meta.touch = [
      { label: "Up", action: "up", hold: true },
      { label: "Down", action: "down", hold: true }
    ];
    meta.touchNote = "Hold the paddle buttons to track the ball on mobile.";

    const state = {};

    function resetBall(direction) {
      state.ball = {
        x: BOARD_SIZE / 2,
        y: BOARD_SIZE / 2,
        r: 10,
        vx: state.baseBallSpeed * direction,
        vy: rand(-190, 190) * mapSetting(runtime, "difficulty", { easy: 0.9, normal: 1, hard: 1.15 }, "normal")
      };
      state.serveDelay = 0.6;
    }

    return {
      reset: function reset() {
        state.targetScore = mapSetting(runtime, "pace", { relaxed: 5, classic: 7, turbo: 11 }, "classic");
        state.baseBallSpeed = mapSetting(runtime, "difficulty", { easy: 248, normal: 280, hard: 328 }, "normal");
        state.cpuSpeed = mapSetting(runtime, "difficulty", { easy: 240, normal: 300, hard: 360 }, "normal");
        state.player = { y: 280, w: 18, h: mapSetting(runtime, "assist", { forgiving: 156, balanced: 138, pure: 118 }, "balanced") };
        state.cpu = { y: 280, w: 18, h: mapSetting(runtime, "difficulty", { easy: 126, normal: 138, hard: 152 }, "normal") };
        state.playerScore = 0;
        state.cpuScore = 0;
        state.volleyCount = 0;
        state.wins = runtime.readNumber("wins", 0);
        resetBall(Math.random() < 0.5 ? -1 : 1);
        runtime.setStatus("First to " + state.targetScore + " wins the duel.");
      },
      update: function update(dt) {
        const playerSpeed = 420;
        if (runtime.actions.up) {
          state.player.y -= playerSpeed * dt;
        }
        if (runtime.actions.down) {
          state.player.y += playerSpeed * dt;
        }
        state.player.y = clamp(state.player.y, 36, BOARD_SIZE - state.player.h - 36);

        const cpuTarget = state.ball.y - state.cpu.h / 2;
        state.cpu.y += clamp(cpuTarget - state.cpu.y, -state.cpuSpeed * dt, state.cpuSpeed * dt);
        state.cpu.y = clamp(state.cpu.y, 36, BOARD_SIZE - state.cpu.h - 36);

        if (state.serveDelay > 0) {
          state.serveDelay -= dt;
          return;
        }

        state.ball.x += state.ball.vx * dt;
        state.ball.y += state.ball.vy * dt;

        if (state.ball.y - state.ball.r < 28 || state.ball.y + state.ball.r > BOARD_SIZE - 28) {
          state.ball.vy *= -1;
          state.ball.y = clamp(state.ball.y, 28 + state.ball.r, BOARD_SIZE - 28 - state.ball.r);
        }

        const leftPaddle = { x: 42, y: state.player.y, w: state.player.w, h: state.player.h };
        const rightPaddle = { x: BOARD_SIZE - 60, y: state.cpu.y, w: state.cpu.w, h: state.cpu.h };
        const ballRect = {
          x: state.ball.x - state.ball.r,
          y: state.ball.y - state.ball.r,
          w: state.ball.r * 2,
          h: state.ball.r * 2
        };

        if (state.ball.vx < 0 && rectsIntersect(ballRect, leftPaddle)) {
          const offset = (state.ball.y - (state.player.y + state.player.h / 2)) / (state.player.h / 2);
          state.ball.vx = Math.abs(state.ball.vx) * 1.05;
          state.ball.vy = clamp(state.ball.vy + offset * 220, -360, 360);
          state.ball.x = leftPaddle.x + leftPaddle.w + state.ball.r + 2;
          state.volleyCount += 1;
        }

        if (state.ball.vx > 0 && rectsIntersect(ballRect, rightPaddle)) {
          const offset = (state.ball.y - (state.cpu.y + state.cpu.h / 2)) / (state.cpu.h / 2);
          state.ball.vx = -Math.abs(state.ball.vx) * 1.05;
          state.ball.vy = clamp(state.ball.vy + offset * 220, -360, 360);
          state.ball.x = rightPaddle.x - state.ball.r - 2;
          state.volleyCount += 1;
        }

        if (state.ball.x < -30) {
          state.cpuScore += 1;
          if (state.cpuScore >= state.targetScore) {
            runtime.finish("Cabinet Wins", "The far paddle got to the target first. Restart for a rematch.");
            runtime.setStatus("Pong lost.");
            return;
          }
          resetBall(1);
        }

        if (state.ball.x > BOARD_SIZE + 30) {
          state.playerScore += 1;
          if (state.playerScore >= state.targetScore) {
            state.wins += 1;
            runtime.writeNumber("wins", state.wins);
            runtime.finish("Pong Victory", "You controlled the angles and took the match.");
            runtime.setStatus("Pong won.");
            return;
          }
          resetBall(-1);
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#0d1733", "#132a5c");
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.setLineDash([14, 18]);
        ctx.beginPath();
        ctx.moveTo(BOARD_SIZE / 2, 42);
        ctx.lineTo(BOARD_SIZE / 2, BOARD_SIZE - 42);
        ctx.stroke();
        ctx.setLineDash([]);

        drawCenteredText(ctx, String(state.playerScore || 0), 250, 78, 48, "#f6f0d6", "900");
        drawCenteredText(ctx, String(state.cpuScore || 0), 470, 78, 48, "#f6f0d6", "900");

        roundRect(ctx, 42, state.player.y || 280, 18, 138, 9, "#f6f0d6");
        roundRect(ctx, BOARD_SIZE - 60, state.cpu.y || 280, 18, 138, 9, "#ff8d43");

        ctx.beginPath();
        ctx.fillStyle = "#36d4ff";
        ctx.arc(state.ball.x || BOARD_SIZE / 2, state.ball.y || BOARD_SIZE / 2, 10, 0, Math.PI * 2);
        ctx.fill();
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "You", value: state.playerScore || 0 },
          { label: "CPU", value: state.cpuScore || 0 },
          { label: "Goal", value: state.targetScore || 0 },
          { label: "Wins", value: state.wins || 0 }
        ]);
      }
    };
  }

  function createBreakout(runtime, meta) {
    meta.controls = [
      { label: "Move", text: "Arrow keys or A and D move the paddle." },
      { label: "Launch", text: "Press space or the center button to release the ball." },
      { label: "Objective", text: "Clear bricks without letting the ball drain away." }
    ];
    meta.keyMap = {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      space: "launch"
    };
    meta.touch = [
      { label: "Left", action: "left", hold: true },
      { label: "Launch", action: "launch", hold: false },
      { label: "Right", action: "right", hold: true }
    ];
    meta.touchNote = "Hold left or right and tap launch once the ball is lined up.";

    const state = {};
    const brickColors = ["#36d4ff", "#6c4cff", "#ffcf47", "#ff7c5f", "#7ef5d7"];

    function buildBricks() {
      state.bricks = [];
      const rows = 6;
      const cols = 10;
      const width = 56;
      const height = 24;
      const gap = 8;
      const startX = 48;
      const startY = 120;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          state.bricks.push({
            x: startX + col * (width + gap),
            y: startY + row * (height + gap),
            w: width,
            h: height,
            color: brickColors[row % brickColors.length],
            alive: true
          });
        }
      }
    }

    function resetBall() {
      state.ball = {
        x: state.paddle.x + state.paddle.w / 2,
        y: state.paddle.y - 16,
        r: 10,
        vx: state.ballSpeedBase * 0.92,
        vy: -state.ballSpeedBase
      };
      state.stuck = true;
    }

    function launchBall() {
      if (state.stuck) {
        state.stuck = false;
        state.ball.vx = pick([-state.ballSpeedBase * 0.92, state.ballSpeedBase * 0.92]);
        state.ball.vy = -(state.ballSpeedBase + state.wave * 18);
      }
    }

    return {
      reset: function reset() {
        state.ballSpeedBase = mapSetting(runtime, "difficulty", { easy: 260, normal: 300, hard: 350 }, "normal");
        state.score = 0;
        state.best = runtime.readNumber("best", 0);
        state.wave = 1;
        state.lives = mapSetting(runtime, "pace", { relaxed: 4, classic: 3, turbo: 2 }, "classic");
        state.paddle = { x: 280, y: 650, w: mapSetting(runtime, "assist", { forgiving: 182, balanced: 160, pure: 138 }, "balanced"), h: 18 };
        buildBricks();
        resetBall();
        runtime.setStatus("Break every brick in sight.");
      },
      onAction: function onAction(action, active) {
        if (action === "launch" && active) {
          launchBall();
        }
      },
      update: function update(dt) {
        const speed = 460;
        if (runtime.actions.left) {
          state.paddle.x -= speed * dt;
        }
        if (runtime.actions.right) {
          state.paddle.x += speed * dt;
        }
        state.paddle.x = clamp(state.paddle.x, 28, BOARD_SIZE - state.paddle.w - 28);

        if (state.stuck) {
          state.ball.x = state.paddle.x + state.paddle.w / 2;
          state.ball.y = state.paddle.y - 16;
          return;
        }

        const prevX = state.ball.x;
        const prevY = state.ball.y;
        state.ball.x += state.ball.vx * dt;
        state.ball.y += state.ball.vy * dt;

        if (state.ball.x - state.ball.r < 18 || state.ball.x + state.ball.r > BOARD_SIZE - 18) {
          state.ball.vx *= -1;
          state.ball.x = clamp(state.ball.x, 18 + state.ball.r, BOARD_SIZE - 18 - state.ball.r);
        }
        if (state.ball.y - state.ball.r < 18) {
          state.ball.vy = Math.abs(state.ball.vy);
        }

        const paddleRect = state.paddle;
        const ballRect = {
          x: state.ball.x - state.ball.r,
          y: state.ball.y - state.ball.r,
          w: state.ball.r * 2,
          h: state.ball.r * 2
        };

        if (state.ball.vy > 0 && rectsIntersect(ballRect, paddleRect)) {
          const impact = (state.ball.x - (state.paddle.x + state.paddle.w / 2)) / (state.paddle.w / 2);
          state.ball.vx = impact * 320;
          state.ball.vy = -Math.abs(state.ball.vy) * 1.03;
          state.ball.y = state.paddle.y - state.ball.r - 2;
        }

        for (let index = 0; index < state.bricks.length; index += 1) {
          const brick = state.bricks[index];
          if (!brick.alive) {
            continue;
          }
          if (!circleHitsRect(state.ball, brick)) {
            continue;
          }
          brick.alive = false;
          state.score += 15;
          state.best = Math.max(state.best, state.score);
          runtime.writeNumber("best", state.best);
          const overlapX = Math.min(Math.abs(state.ball.x - brick.x), Math.abs(state.ball.x - (brick.x + brick.w)));
          const overlapY = Math.min(Math.abs(state.ball.y - brick.y), Math.abs(state.ball.y - (brick.y + brick.h)));
          if (overlapX < overlapY) {
            state.ball.vx *= -1;
            state.ball.x = prevX;
          } else {
            state.ball.vy *= -1;
            state.ball.y = prevY;
          }
          break;
        }

        if (state.ball.y > BOARD_SIZE + 24) {
          state.lives -= 1;
          if (state.lives <= 0) {
            runtime.finish("Breakout Over", "The wall outlasted your three balls.");
            runtime.setStatus("Breakout lost.");
            return;
          }
          resetBall();
        }

        const aliveBricks = state.bricks.filter(function (brick) {
          return brick.alive;
        }).length;
        if (aliveBricks === 0) {
          state.wave += 1;
          buildBricks();
          resetBall();
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#11192f", "#24194b");
        roundRect(ctx, 26, 26, BOARD_SIZE - 52, BOARD_SIZE - 52, 26, "rgba(8,12,22,0.38)", "rgba(255,255,255,0.12)");

        state.bricks.forEach(function (brick) {
          if (!brick.alive) {
            return;
          }
          roundRect(ctx, brick.x, brick.y, brick.w, brick.h, 8, brick.color, "rgba(255,255,255,0.14)");
        });

        roundRect(ctx, state.paddle.x || 280, state.paddle.y || 650, state.paddle.w || 160, 18, 9, "#f6f0d6");
        ctx.beginPath();
        ctx.fillStyle = "#36d4ff";
        ctx.arc(state.ball.x || 360, state.ball.y || 610, 10, 0, Math.PI * 2);
        ctx.fill();
      },
      syncHud: function syncHud() {
        const aliveBricks = state.bricks.filter(function (brick) {
          return brick.alive;
        }).length;
        runtime.setMetrics([
          { label: "Score", value: state.score || 0 },
          { label: "Bricks", value: aliveBricks },
          { label: "Balls", value: state.lives || 0 },
          { label: "Best", value: state.best || 0 }
        ]);
        runtime.setStatus("Wave " + (state.wave || 1) + " in play.");
      }
    };
  }

  function createAsteroids(runtime, meta) {
    meta.controls = [
      { label: "Rotate", text: "Arrow left and right turn the ship." },
      { label: "Thrust", text: "Arrow up accelerates through the drift." },
      { label: "Fire", text: "Space launches a shot." }
    ];
    meta.keyMap = {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowup: "thrust",
      w: "thrust",
      space: "fire"
    };
    meta.touch = [
      { label: "Left", action: "left", hold: true },
      { label: "Thrust", action: "thrust", hold: true },
      { label: "Right", action: "right", hold: true },
      { label: "Fire", action: "fire", hold: false }
    ];
    meta.touchNote = "Hold left, right, or thrust. Tap fire to split the rocks.";

    const state = {};

    function wrap(entity) {
      if (entity.x < -40) {
        entity.x = BOARD_SIZE + 40;
      }
      if (entity.x > BOARD_SIZE + 40) {
        entity.x = -40;
      }
      if (entity.y < -40) {
        entity.y = BOARD_SIZE + 40;
      }
      if (entity.y > BOARD_SIZE + 40) {
        entity.y = -40;
      }
    }

    function createAsteroid(size, x, y) {
      return {
        x: typeof x === "number" ? x : rand(60, BOARD_SIZE - 60),
        y: typeof y === "number" ? y : rand(60, BOARD_SIZE - 60),
        vx: rand(-state.asteroidDrift, state.asteroidDrift),
        vy: rand(-state.asteroidDrift, state.asteroidDrift),
        size: size,
        r: size === 3 ? 54 : size === 2 ? 34 : 20
      };
    }

    function spawnWave() {
      state.asteroids = [];
      const count = mapSetting(runtime, "difficulty", { easy: 2 + state.wave, normal: 3 + state.wave, hard: 4 + state.wave }, "normal");
      for (let index = 0; index < count; index += 1) {
        state.asteroids.push(createAsteroid(3));
      }
    }

    function resetShip() {
      state.ship = { x: 360, y: 360, vx: 0, vy: 0, angle: -Math.PI / 2 };
      state.invulnerable = state.invulnerableDuration;
      state.fireCooldown = 0;
    }

    function fireBullet() {
      if (state.fireCooldown > 0) {
        return;
      }
      state.fireCooldown = 0.22;
      state.bullets.push({
        x: state.ship.x + Math.cos(state.ship.angle) * 18,
        y: state.ship.y + Math.sin(state.ship.angle) * 18,
        vx: state.ship.vx + Math.cos(state.ship.angle) * 420,
        vy: state.ship.vy + Math.sin(state.ship.angle) * 420,
        life: 1.25
      });
    }

    return {
      reset: function reset() {
        state.asteroidDrift = mapSetting(runtime, "difficulty", { easy: 62, normal: 80, hard: 108 }, "normal");
        state.invulnerableDuration = mapSetting(runtime, "assist", { forgiving: 2.4, balanced: 1.8, pure: 1.1 }, "balanced");
        state.score = 0;
        state.best = runtime.readNumber("best", 0);
        state.wave = 1;
        state.lives = mapSetting(runtime, "pace", { relaxed: 4, classic: 3, turbo: 2 }, "classic");
        state.bullets = [];
        state.stars = Array.from({ length: 60 }, function () {
          return { x: rand(0, BOARD_SIZE), y: rand(0, BOARD_SIZE), r: rand(1, 2.6) };
        });
        resetShip();
        spawnWave();
        runtime.setStatus("Rotate, thrust, and clear the field.");
      },
      onAction: function onAction(action, active) {
        if (action === "fire" && active) {
          fireBullet();
        }
      },
      update: function update(dt) {
        state.fireCooldown = Math.max(0, state.fireCooldown - dt);
        state.invulnerable = Math.max(0, state.invulnerable - dt);

        if (runtime.actions.left) {
          state.ship.angle -= 3.5 * dt;
        }
        if (runtime.actions.right) {
          state.ship.angle += 3.5 * dt;
        }
        if (runtime.actions.thrust) {
          state.ship.vx += Math.cos(state.ship.angle) * 220 * dt;
          state.ship.vy += Math.sin(state.ship.angle) * 220 * dt;
        }

        state.ship.vx *= 0.992;
        state.ship.vy *= 0.992;
        state.ship.x += state.ship.vx * dt;
        state.ship.y += state.ship.vy * dt;
        wrap(state.ship);

        state.bullets.forEach(function (bullet) {
          bullet.x += bullet.vx * dt;
          bullet.y += bullet.vy * dt;
          bullet.life -= dt;
          wrap(bullet);
        });
        state.bullets = state.bullets.filter(function (bullet) {
          return bullet.life > 0;
        });

        state.asteroids.forEach(function (asteroid) {
          asteroid.x += asteroid.vx * dt;
          asteroid.y += asteroid.vy * dt;
          wrap(asteroid);
        });

        for (let asteroidIndex = state.asteroids.length - 1; asteroidIndex >= 0; asteroidIndex -= 1) {
          const asteroid = state.asteroids[asteroidIndex];
          for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
            const bullet = state.bullets[bulletIndex];
            if (distance(asteroid.x, asteroid.y, bullet.x, bullet.y) > asteroid.r + 6) {
              continue;
            }
            state.asteroids.splice(asteroidIndex, 1);
            state.bullets.splice(bulletIndex, 1);
            state.score += asteroid.size * 35;
            state.best = Math.max(state.best, state.score);
            runtime.writeNumber("best", state.best);
            if (asteroid.size > 1) {
              state.asteroids.push(createAsteroid(asteroid.size - 1, asteroid.x, asteroid.y));
              state.asteroids.push(createAsteroid(asteroid.size - 1, asteroid.x, asteroid.y));
            }
            break;
          }
        }

        if (state.invulnerable <= 0) {
          for (let index = 0; index < state.asteroids.length; index += 1) {
            const asteroid = state.asteroids[index];
            if (distance(asteroid.x, asteroid.y, state.ship.x, state.ship.y) < asteroid.r + 14) {
              state.lives -= 1;
              if (state.lives <= 0) {
                runtime.finish("Asteroids Over", "The ship broke apart in the drift.");
                runtime.setStatus("Asteroids lost.");
                return;
              }
              resetShip();
              break;
            }
          }
        }

        if (state.asteroids.length === 0) {
          state.wave += 1;
          spawnWave();
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#090d18", "#13213a");
        state.stars.forEach(function (star) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
          ctx.fill();
        });

        state.asteroids.forEach(function (asteroid) {
          ctx.beginPath();
          ctx.strokeStyle = "#f6f0d6";
          ctx.lineWidth = 3;
          ctx.arc(asteroid.x, asteroid.y, asteroid.r, 0, Math.PI * 2);
          ctx.stroke();
        });

        state.bullets.forEach(function (bullet) {
          ctx.beginPath();
          ctx.fillStyle = "#36d4ff";
          ctx.arc(bullet.x, bullet.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.save();
        ctx.translate(state.ship.x, state.ship.y);
        ctx.rotate(state.ship.angle + Math.PI / 2);
        ctx.strokeStyle = state.invulnerable > 0 ? "rgba(255,255,255,0.56)" : "#7ef5d7";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(16, 18);
        ctx.lineTo(0, 10);
        ctx.lineTo(-16, 18);
        ctx.closePath();
        ctx.stroke();
        if (runtime.actions.thrust) {
          ctx.beginPath();
          ctx.strokeStyle = "#ff8d43";
          ctx.moveTo(-8, 18);
          ctx.lineTo(0, 34);
          ctx.lineTo(8, 18);
          ctx.stroke();
        }
        ctx.restore();
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "Score", value: state.score || 0 },
          { label: "Lives", value: state.lives || 0 },
          { label: "Wave", value: state.wave || 1 },
          { label: "Best", value: state.best || 0 }
        ]);
        runtime.setStatus("Clear the rocks before they box you in.");
      }
    };
  }

  function createInvaders(runtime, meta) {
    meta.controls = [
      { label: "Move", text: "Arrow keys or A and D slide across the bunker line." },
      { label: "Fire", text: "Space shoots straight up the lane." },
      { label: "Objective", text: "Clear each wave before the invaders reach the ground." }
    ];
    meta.keyMap = {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      space: "fire"
    };
    meta.touch = [
      { label: "Left", action: "left", hold: true },
      { label: "Fire", action: "fire", hold: false },
      { label: "Right", action: "right", hold: true }
    ];
    meta.touchNote = "Hold left or right and tap fire to pick off the rows.";

    const state = {};

    function buildWave() {
      state.invaders = [];
      const rows = 5;
      const cols = 9;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          state.invaders.push({
            x: 120 + col * 52,
            y: 110 + row * 42,
            row: row,
            col: col,
            alive: true
          });
        }
      }
      state.fleetDirection = 1;
      state.fleetTimer = 0;
      state.enemyFireTimer = 0.8;
    }

    function firePlayerBullet() {
      if (state.playerBullet || state.playerCooldown > 0) {
        return;
      }
      state.playerCooldown = state.playerCooldownBase;
      state.playerBullet = { x: state.playerX + 18, y: 612, vy: -540 };
    }

    function getAliveInvaders() {
      return state.invaders.filter(function (invader) {
        return invader.alive;
      });
    }

    function pickShooter() {
      const byColumn = {};
      getAliveInvaders().forEach(function (invader) {
        if (!byColumn[invader.col] || byColumn[invader.col].y < invader.y) {
          byColumn[invader.col] = invader;
        }
      });
      const shooters = Object.keys(byColumn).map(function (key) {
        return byColumn[key];
      });
      return shooters.length ? pick(shooters) : null;
    }

    return {
      reset: function reset() {
        state.score = 0;
        state.best = runtime.readNumber("best", 0);
        state.wave = 1;
        state.lives = mapSetting(runtime, "pace", { relaxed: 4, classic: 3, turbo: 2 }, "classic");
        state.playerX = 330;
        state.playerBullet = null;
        state.enemyBullets = [];
        state.playerCooldown = 0;
        state.playerCooldownBase = mapSetting(runtime, "assist", { forgiving: 0.18, balanced: 0.22, pure: 0.28 }, "balanced");
        state.enemyBaseFire = mapSetting(runtime, "difficulty", { easy: 1.05, normal: 0.9, hard: 0.72 }, "normal");
        buildWave();
        runtime.setStatus("Clear the marching rows.");
      },
      onAction: function onAction(action, active) {
        if (action === "fire" && active) {
          firePlayerBullet();
        }
      },
      update: function update(dt) {
        const alive = getAliveInvaders();
        const moveSpeed = Math.max(0.18, 0.55 - alive.length * 0.006 - state.wave * 0.02);
        if (runtime.actions.left) {
          state.playerX -= 340 * dt;
        }
        if (runtime.actions.right) {
          state.playerX += 340 * dt;
        }
        state.playerX = clamp(state.playerX, 60, BOARD_SIZE - 96);

        state.playerCooldown = Math.max(0, state.playerCooldown - dt);
        state.fleetTimer -= dt;
        if (state.fleetTimer <= 0) {
          state.fleetTimer = moveSpeed;
          const aliveNow = getAliveInvaders();
          let hitWall = false;
          aliveNow.forEach(function (invader) {
            invader.x += state.fleetDirection * 18;
            if (invader.x < 70 || invader.x > BOARD_SIZE - 90) {
              hitWall = true;
            }
          });
          if (hitWall) {
            state.fleetDirection *= -1;
            aliveNow.forEach(function (invader) {
              invader.y += 24;
            });
          }
        }

        if (state.playerBullet) {
          state.playerBullet.y += state.playerBullet.vy * dt;
          if (state.playerBullet.y < 0) {
            state.playerBullet = null;
          }
        }

        if (state.playerBullet) {
          for (let index = 0; index < state.invaders.length; index += 1) {
            const invader = state.invaders[index];
            if (!invader.alive) {
              continue;
            }
            if (
              state.playerBullet.x > invader.x &&
              state.playerBullet.x < invader.x + 30 &&
              state.playerBullet.y > invader.y &&
              state.playerBullet.y < invader.y + 22
            ) {
              invader.alive = false;
              state.playerBullet = null;
              state.score += 20 + invader.row * 5;
              state.best = Math.max(state.best, state.score);
              runtime.writeNumber("best", state.best);
              break;
            }
          }
        }

        state.enemyBullets.forEach(function (bullet) {
          bullet.y += bullet.vy * dt;
        });
        state.enemyBullets = state.enemyBullets.filter(function (bullet) {
          return bullet.y < BOARD_SIZE + 20;
        });

        state.enemyFireTimer -= dt;
        if (state.enemyFireTimer <= 0) {
          state.enemyFireTimer = clamp(state.enemyBaseFire - state.wave * 0.06, 0.2, 1.05);
          const shooter = pickShooter();
          if (shooter) {
            state.enemyBullets.push({ x: shooter.x + 15, y: shooter.y + 18, vy: 240 + state.wave * 24 });
          }
        }

        for (let index = 0; index < state.enemyBullets.length; index += 1) {
          const bullet = state.enemyBullets[index];
          if (
            bullet.x > state.playerX &&
            bullet.x < state.playerX + 36 &&
            bullet.y > 618 &&
            bullet.y < 658
          ) {
            state.enemyBullets.splice(index, 1);
            state.lives -= 1;
            if (state.lives <= 0) {
              runtime.finish("Invaders Landed", "The defense line collapsed.");
              runtime.setStatus("Invaders lost.");
              return;
            }
            break;
          }
        }

        if (alive.some(function (invader) { return invader.y > 580; })) {
          runtime.finish("Invaders Landed", "The formation reached the ground line.");
          runtime.setStatus("Invaders lost.");
          return;
        }

        if (alive.length === 0) {
          state.wave += 1;
          buildWave();
          state.playerBullet = null;
          state.enemyBullets = [];
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#100d26", "#24124a");

        state.invaders.forEach(function (invader) {
          if (!invader.alive) {
            return;
          }
          roundRect(ctx, invader.x, invader.y, 30, 22, 6, invader.row % 2 === 0 ? "#36d4ff" : "#ff5f5f");
          roundRect(ctx, invader.x + 6, invader.y - 8, 18, 10, 5, invader.row % 2 === 0 ? "#36d4ff" : "#ff5f5f");
        });

        roundRect(ctx, state.playerX || 330, 622, 36, 28, 8, "#f6f0d6");
        roundRect(ctx, (state.playerX || 330) + 11, 610, 14, 14, 6, "#f6f0d6");

        if (state.playerBullet) {
          ctx.strokeStyle = "#ffcf47";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(state.playerBullet.x, state.playerBullet.y);
          ctx.lineTo(state.playerBullet.x, state.playerBullet.y - 14);
          ctx.stroke();
        }

        state.enemyBullets.forEach(function (bullet) {
          ctx.strokeStyle = "#ff8d43";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(bullet.x, bullet.y);
          ctx.lineTo(bullet.x, bullet.y + 12);
          ctx.stroke();
        });
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "Score", value: state.score || 0 },
          { label: "Lives", value: state.lives || 0 },
          { label: "Wave", value: state.wave || 1 },
          { label: "Best", value: state.best || 0 }
        ]);
        runtime.setStatus(getAliveInvaders().length + " invaders remain.");
      }
    };
  }

  function createFrogger(runtime, meta) {
    meta.controls = [
      { label: "Hop", text: "Arrow keys or WASD move one lane at a time." },
      { label: "Avoid", text: "Cars hit hard, water drowns fast, and logs are your safe bridges." },
      { label: "Objective", text: "Reach the far bank repeatedly to clear the level." }
    ];
    meta.keyMap = {
      arrowup: "up",
      w: "up",
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowdown: "down",
      s: "down"
    };
    meta.touch = [
      { empty: true },
      { label: "Up", action: "up", hold: false },
      { empty: true },
      { label: "Left", action: "left", hold: false },
      { label: "Down", action: "down", hold: false },
      { label: "Right", action: "right", hold: false }
    ];
    meta.touchNote = "Tap the direction you want to hop next.";

    const state = {
      cols: 9,
      rows: 10,
      cell: 64,
      originX: 72,
      originY: 40
    };

    function laneCenter(row) {
      return state.originY + row * state.cell + state.cell / 2;
    }

    function resetFrog() {
      state.frog = {
        x: state.originX + state.cell * 4 + state.cell / 2,
        y: laneCenter(state.rows - 1),
        size: 18
      };
      state.moveCooldown = 0;
    }

    function buildLanes() {
      const levelBoost = state.level * 12 * mapSetting(runtime, "difficulty", { easy: 0.82, normal: 1, hard: 1.18 }, "normal");
      state.lanes = [
        { row: 1, type: "water", speed: 88 + levelBoost, length: 2.1, count: 3, color: "#8f6a45" },
        { row: 2, type: "water", speed: -96 - levelBoost, length: 2.8, count: 2, color: "#a78354" },
        { row: 3, type: "water", speed: 118 + levelBoost, length: 1.9, count: 4, color: "#7b5e3d" },
        { row: 5, type: "road", speed: -180 - levelBoost, length: 1.1, count: 4, color: "#ff5f5f" },
        { row: 6, type: "road", speed: 230 + levelBoost, length: 1.8, count: 3, color: "#ffcf47" },
        { row: 7, type: "road", speed: -220 - levelBoost, length: 1.2, count: 4, color: "#36d4ff" }
      ].map(function (lane) {
        const pieces = [];
        const span = state.cols * state.cell;
        const spacing = span / lane.count;
        for (let index = 0; index < lane.count; index += 1) {
          pieces.push({
            x: state.originX + index * spacing,
            width: lane.length * state.cell
          });
        }
        lane.pieces = pieces;
        return lane;
      });
    }

    function frogRect() {
      return {
        x: state.frog.x - 18,
        y: state.frog.y - 18,
        w: 36,
        h: 36
      };
    }

    function loseLife(message) {
      state.lives -= 1;
      if (state.lives <= 0) {
        runtime.finish("Frogger Over", message);
        runtime.setStatus("Frogger lost.");
        return;
      }
      resetFrog();
    }

    function hop(dx, dy) {
      if (state.moveCooldown > 0) {
        return;
      }
      state.moveCooldown = mapSetting(runtime, "assist", { forgiving: 0.09, balanced: 0.14, pure: 0.18 }, "balanced");
      state.frog.x = clamp(state.frog.x + dx * state.cell, state.originX + state.cell / 2, state.originX + state.cell * state.cols - state.cell / 2);
      state.frog.y = clamp(state.frog.y + dy * state.cell, laneCenter(0), laneCenter(state.rows - 1));
    }

    return {
      reset: function reset() {
        state.level = 1;
        state.homes = 0;
        state.homesTarget = mapSetting(runtime, "pace", { relaxed: 3, classic: 5, turbo: 7 }, "classic");
        state.lives = mapSetting(runtime, "assist", { forgiving: 4, balanced: 3, pure: 2 }, "balanced");
        state.best = runtime.readNumber("best", 0);
        buildLanes();
        resetFrog();
        runtime.setStatus("Cross the road and the river.");
      },
      onAction: function onAction(action, active) {
        if (!active) {
          return;
        }
        if (action === "up") {
          hop(0, -1);
        }
        if (action === "down") {
          hop(0, 1);
        }
        if (action === "left") {
          hop(-1, 0);
        }
        if (action === "right") {
          hop(1, 0);
        }
      },
      update: function update(dt) {
        state.moveCooldown = Math.max(0, state.moveCooldown - dt);
        const frogRow = Math.round((state.frog.y - state.originY - state.cell / 2) / state.cell);

        state.lanes.forEach(function (lane) {
          lane.pieces.forEach(function (piece) {
            piece.x += lane.speed * dt;
            const span = state.cols * state.cell;
            if (lane.speed > 0 && piece.x > state.originX + span + state.cell * 2) {
              piece.x = state.originX - piece.width - state.cell;
            }
            if (lane.speed < 0 && piece.x + piece.width < state.originX - state.cell * 2) {
              piece.x = state.originX + span + state.cell;
            }
          });
        });

        if (frogRow === 0) {
          state.homes += 1;
          state.best = Math.max(state.best, state.homes + (state.level - 1) * 5);
          runtime.writeNumber("best", state.best);
          if (state.homes >= state.homesTarget) {
            state.level += 1;
            state.homes = 0;
            buildLanes();
          }
          resetFrog();
          return;
        }

        const lane = state.lanes.find(function (entry) {
          return entry.row === frogRow;
        });
        if (!lane) {
          return;
        }

        const currentFrogRect = frogRect();
        if (lane.type === "road") {
          for (let index = 0; index < lane.pieces.length; index += 1) {
            const piece = lane.pieces[index];
            if (rectsIntersect(currentFrogRect, { x: piece.x, y: laneCenter(frogRow) - 18, w: piece.width, h: 36 })) {
              loseLife("Traffic caught your frog in the lane.");
              return;
            }
          }
        } else if (lane.type === "water") {
          let onLog = null;
          for (let index = 0; index < lane.pieces.length; index += 1) {
            const piece = lane.pieces[index];
            if (rectsIntersect(currentFrogRect, { x: piece.x, y: laneCenter(frogRow) - 20, w: piece.width, h: 40 })) {
              onLog = piece;
              break;
            }
          }
          if (!onLog) {
            loseLife("The frog slipped into the water.");
            return;
          }
          state.frog.x += lane.speed * dt;
          if (state.frog.x < state.originX + 10 || state.frog.x > state.originX + state.cols * state.cell - 10) {
            loseLife("The current pulled the frog off the screen.");
          }
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#0d1733", "#12384d");
        for (let row = 0; row < state.rows; row += 1) {
          const y = state.originY + row * state.cell;
          let fill = "#203251";
          if (row <= 3 && row > 0) {
            fill = "#1d4c7b";
          } else if (row >= 5 && row <= 7) {
            fill = "#2e3240";
          } else if (row === 0 || row === 4 || row === 8 || row === 9) {
            fill = "#1b5d3d";
          }
          roundRect(ctx, state.originX, y, state.cols * state.cell, state.cell - 4, 12, fill, "rgba(255,255,255,0.08)");
        }
        state.lanes.forEach(function (lane) {
          lane.pieces.forEach(function (piece) {
            const y = laneCenter(lane.row) - 20;
            roundRect(
              ctx,
              piece.x,
              y,
              piece.width,
              lane.type === "road" ? 40 : 32,
              12,
              lane.color,
              "rgba(255,255,255,0.1)"
            );
          });
        });

        const frog = state.frog || { x: 360, y: laneCenter(9) };
        ctx.beginPath();
        ctx.fillStyle = "#a6ff6e";
        ctx.arc(frog.x, frog.y, frog.size || 18, 0, Math.PI * 2);
        ctx.fill();
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "Homes", value: state.homes || 0 },
          { label: "Lives", value: state.lives || 0 },
          { label: "Goal", value: state.homesTarget || 0 },
          { label: "Best", value: state.best || 0 }
        ]);
        runtime.setStatus("Reach " + (state.homesTarget || 0) + " homes to clear the level.");
      }
    };
  }

  function createRunner(runtime, meta) {
    meta.controls = [
      { label: "Jump", text: "Arrow up, W, or space jumps over ground hazards." },
      { label: "Duck", text: "Arrow down or S ducks under high obstacles." },
      { label: "Objective", text: "Survive the sprint as the speed keeps climbing." }
    ];
    meta.keyMap = {
      arrowup: "jump",
      w: "jump",
      space: "jump",
      arrowdown: "duck",
      s: "duck"
    };
    meta.touch = [
      { label: "Jump", action: "jump", hold: false },
      { label: "Duck", action: "duck", hold: true }
    ];
    meta.touchNote = "Tap jump for ground hazards and hold duck for high ones.";

    const state = {};

    function spawnObstacle() {
      const flying = Math.random() < 0.35;
      state.obstacles.push({
        x: BOARD_SIZE + 40,
        y: flying ? 500 : 594,
        w: flying ? 46 : rand(32, 52),
        h: flying ? 34 : rand(54, 72),
        flying: flying
      });
    }

    function playerRect() {
      const ducking = runtime.actions.duck && state.player.grounded;
      return {
        x: state.player.x - 20,
        y: ducking ? state.player.y - 22 : state.player.y - 50,
        w: 40,
        h: ducking ? 30 : 58
      };
    }

    return {
      reset: function reset() {
        state.player = { x: 160, y: 596, vy: 0, grounded: true };
        state.obstacles = [];
        state.distance = 0;
        state.speed = mapSetting(runtime, "difficulty", { easy: 250, normal: 280, hard: 320 }, "normal");
        state.spawnTimer = 1;
        state.lives = mapSetting(runtime, "pace", { relaxed: 4, classic: 3, turbo: 2 }, "classic");
        state.best = runtime.readNumber("best", 0);
        state.invulnerable = 0;
        state.invulnerableWindow = mapSetting(runtime, "assist", { forgiving: 1.45, balanced: 1.1, pure: 0.75 }, "balanced");
        runtime.setStatus("Stay light on your feet.");
      },
      onAction: function onAction(action, active) {
        if (action === "jump" && active && state.player.grounded) {
          state.player.vy = -540;
          state.player.grounded = false;
        }
      },
      update: function update(dt) {
        state.speed += dt * 6;
        state.distance += state.speed * dt;
        state.best = Math.max(state.best, Math.floor(state.distance));
        runtime.writeNumber("best", state.best);

        state.player.vy += 1400 * dt;
        state.player.y += state.player.vy * dt;
        if (state.player.y >= 596) {
          state.player.y = 596;
          state.player.vy = 0;
          state.player.grounded = true;
        }

        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          spawnObstacle();
          state.spawnTimer = rand(0.85, 1.45) - state.speed * 0.0008;
        }

        state.obstacles.forEach(function (obstacle) {
          obstacle.x -= state.speed * dt;
        });
        state.obstacles = state.obstacles.filter(function (obstacle) {
          return obstacle.x + obstacle.w > -60;
        });

        state.invulnerable = Math.max(0, state.invulnerable - dt);
        const hero = playerRect();
        if (state.invulnerable <= 0) {
          for (let index = 0; index < state.obstacles.length; index += 1) {
            const obstacle = state.obstacles[index];
            if (rectsIntersect(hero, obstacle)) {
              state.obstacles.splice(index, 1);
              state.invulnerable = state.invulnerableWindow;
              state.lives -= 1;
              if (state.lives <= 0) {
                runtime.finish("Run Over", "The sprint finally caught you.");
                runtime.setStatus("Runner lost.");
                return;
              }
              break;
            }
          }
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#081425", "#173053");
        ctx.fillStyle = "#132d1c";
        ctx.fillRect(0, 612, BOARD_SIZE, 108);
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.setLineDash([18, 18]);
        ctx.beginPath();
        ctx.moveTo(0, 620);
        ctx.lineTo(BOARD_SIZE, 620);
        ctx.stroke();
        ctx.setLineDash([]);

        state.obstacles.forEach(function (obstacle) {
          roundRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 12, obstacle.flying ? "#ffcf47" : "#ff5f5f");
        });

        const hero = playerRect();
        roundRect(
          ctx,
          hero.x,
          hero.y,
          hero.w,
          hero.h,
          12,
          state.invulnerable > 0 ? "rgba(246,240,214,0.5)" : "#f6f0d6"
        );
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "Distance", value: Math.floor(state.distance || 0) },
          { label: "Lives", value: state.lives || 0 },
          { label: "Speed", value: Math.floor(state.speed || 0) },
          { label: "Best", value: state.best || 0 }
        ]);
        runtime.setStatus("Jump low hazards, duck high ones.");
      }
    };
  }

  function createWhack(runtime, meta) {
    meta.controls = [
      { label: "Tap", text: "Tap an active mole or press keys 1 through 9." },
      { label: "Timing", text: "Fast hits score. Empty hits count as misses." },
      { label: "Round", text: "The session ends when the timer reaches zero." }
    ];
    meta.keyMap = {
      "1": "hole0",
      "2": "hole1",
      "3": "hole2",
      "4": "hole3",
      "5": "hole4",
      "6": "hole5",
      "7": "hole6",
      "8": "hole7",
      "9": "hole8"
    };
    meta.touch = [];
    meta.touchNote = "Tap the holes directly. The board itself is the control surface.";

    const state = {};
    const holes = [];
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        holes.push({ x: 178 + col * 182, y: 180 + row * 160 });
      }
    }

    function hitHole(index) {
      const hole = state.holes[index];
      if (!hole) {
        return;
      }
      if (hole.visible) {
        hole.visible = false;
        hole.timer = rand(0.4, 1.2);
        state.score += 1;
        state.best = Math.max(state.best, state.score);
        runtime.writeNumber("best", state.best);
      } else {
        state.misses += 1;
      }
    }

    return {
      reset: function reset() {
        state.holes = holes.map(function (position) {
          return {
            x: position.x,
            y: position.y,
            visible: false,
            timer: rand(0.3, 1.2)
          };
        });
        state.timerScale = mapSetting(runtime, "difficulty", { easy: 1.15, normal: 1, hard: 0.82 }, "normal");
        state.score = 0;
        state.misses = 0;
        state.missLimit = mapSetting(runtime, "assist", { forgiving: 14, balanced: 10, pure: 7 }, "balanced");
        state.timeLeft = mapSetting(runtime, "pace", { relaxed: 60, classic: 45, turbo: 30 }, "classic");
        state.best = runtime.readNumber("best", 0);
        runtime.setStatus("Hit the moles before they duck back down.");
      },
      onAction: function onAction(action, active) {
        if (!active || action.indexOf("hole") !== 0) {
          return;
        }
        hitHole(Number(action.replace("hole", "")));
      },
      onPointer: function onPointer(point) {
        state.holes.forEach(function (hole, index) {
          if (distance(point.x, point.y, hole.x, hole.y) <= 52) {
            hitHole(index);
          }
        });
      },
      update: function update(dt) {
        state.timeLeft = Math.max(0, state.timeLeft - dt);
        if (state.timeLeft <= 0 || state.misses >= state.missLimit) {
          runtime.finish("Time Up", "The carnival round is over. Chase a higher score next run.");
          runtime.setStatus("Whack round complete.");
          return;
        }

        state.holes.forEach(function (hole) {
          hole.timer -= dt;
          if (hole.timer > 0) {
            return;
          }
          if (hole.visible) {
            hole.visible = false;
            hole.timer = rand(0.45, 1.1) * state.timerScale;
            state.misses += 1;
          } else {
            hole.visible = true;
            hole.timer = rand(0.4, 0.95) * state.timerScale;
          }
        });
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#2d160c", "#4c2511");
        holes.forEach(function (hole) {
          ctx.beginPath();
          ctx.fillStyle = "#1b0e07";
          ctx.ellipse(hole.x, hole.y + 26, 60, 24, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        state.holes.forEach(function (hole, index) {
          if (hole.visible) {
            ctx.beginPath();
            ctx.fillStyle = "#c79362";
            ctx.arc(hole.x, hole.y - 8, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = "#31211a";
            ctx.arc(hole.x - 12, hole.y - 14, 5, 0, Math.PI * 2);
            ctx.arc(hole.x + 12, hole.y - 14, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          drawCenteredText(ctx, String(index + 1), hole.x, hole.y + 60, 18, "rgba(255,255,255,0.5)");
        });
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "Score", value: state.score || 0 },
          { label: "Misses", value: state.misses || 0 },
          { label: "Time", value: Math.ceil(state.timeLeft || 0) },
          { label: "Cap", value: state.missLimit || 0 }
        ]);
        runtime.setStatus("Use the board or keys 1 to 9.");
      }
    };
  }

  function createSimon(runtime, meta) {
    meta.controls = [
      { label: "Watch", text: "The cabinet plays the sequence for you." },
      { label: "Repeat", text: "Tap the pads or use keys 1 through 4 to copy it." },
      { label: "Pressure", text: "One mistake ends the round, so pace your taps." }
    ];
    meta.keyMap = {
      "1": "pad0",
      "2": "pad1",
      "3": "pad2",
      "4": "pad3"
    };
    meta.touch = [];
    meta.touchNote = "Tap the four color pads directly on the board.";

    const state = {};
    const pads = [
      { id: 0, x: 122, y: 122, w: 230, h: 230, color: "#36d4ff", glow: "#8de0ff" },
      { id: 1, x: 368, y: 122, w: 230, h: 230, color: "#ff5f5f", glow: "#ffaba2" },
      { id: 2, x: 122, y: 368, w: 230, h: 230, color: "#ffcf47", glow: "#ffe79a" },
      { id: 3, x: 368, y: 368, w: 230, h: 230, color: "#7ef5d7", glow: "#c4fff0" }
    ];

    function nextRound() {
      state.sequence.push(randInt(0, 3));
      state.mode = "show";
      state.showIndex = 0;
      state.flashIndex = -1;
      state.timer = 0.5;
      state.inputIndex = 0;
    }

    function hitPad(index) {
      if (state.mode !== "input") {
        return;
      }
      state.flashIndex = index;
      state.flashTimer = 0.18;
      if (state.sequence[state.inputIndex] !== index) {
        runtime.finish("Sequence Broken", "That input did not match the pattern.");
        runtime.setStatus("Simon lost.");
        return;
      }
      state.inputIndex += 1;
      if (state.inputIndex >= state.sequence.length) {
        state.round += 1;
        state.best = Math.max(state.best, state.round);
        runtime.writeNumber("best", state.best);
        state.mode = "pause";
        state.timer = 0.6;
      }
    }

    return {
      reset: function reset() {
        state.sequence = [];
        state.round = 0;
        state.best = runtime.readNumber("best", 0);
        state.mode = "pause";
        state.timer = 0.3;
        state.flashIndex = -1;
        state.flashTimer = 0;
        state.inputIndex = 0;
        nextRound();
        runtime.setStatus("Watch the sequence first.");
      },
      onAction: function onAction(action, active) {
        if (!active || action.indexOf("pad") !== 0) {
          return;
        }
        hitPad(Number(action.replace("pad", "")));
      },
      onPointer: function onPointer(point) {
        pads.forEach(function (pad) {
          if (point.x >= pad.x && point.x <= pad.x + pad.w && point.y >= pad.y && point.y <= pad.y + pad.h) {
            hitPad(pad.id);
          }
        });
      },
      update: function update(dt) {
        state.flashTimer = Math.max(0, state.flashTimer - dt);
        if (state.flashTimer <= 0 && state.mode === "input") {
          state.flashIndex = -1;
        }

        state.timer -= dt;
        if (state.mode === "pause" && state.timer <= 0) {
          nextRound();
        }

        if (state.mode === "show" && state.timer <= 0) {
          if (state.flashIndex === -1) {
            state.flashIndex = state.sequence[state.showIndex];
            state.timer = 0.42;
          } else {
            state.flashIndex = -1;
            state.showIndex += 1;
            if (state.showIndex >= state.sequence.length) {
              state.mode = "input";
              state.timer = 0;
            } else {
              state.timer = 0.18;
            }
          }
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#15172e", "#271d4d");
        pads.forEach(function (pad) {
          const bright = state.flashIndex === pad.id;
          roundRect(
            ctx,
            pad.x,
            pad.y,
            pad.w,
            pad.h,
            30,
            bright ? pad.glow : pad.color,
            "rgba(255,255,255,0.18)"
          );
        });
        drawCenteredText(ctx, "SIMON", 360, 360, 54, "#f6f0d6", "900");
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "Round", value: state.round || 0 },
          { label: "Best", value: state.best || 0 },
          { label: "Length", value: (state.sequence || []).length || 0 },
          { label: "Mode", value: state.mode === "input" ? "Repeat" : "Watch" }
        ]);
        runtime.setStatus(state.mode === "input" ? "Repeat the sequence." : "Watch the board.");
      }
    };
  }

  function createMemory(runtime, meta) {
    meta.controls = [
      { label: "Flip", text: "Tap two cards to test a pair." },
      { label: "Memory", text: "Remember the misses and clear the board in fewer turns." },
      { label: "Round", text: "Every matched pair stays face up." }
    ];
    meta.touch = [];
    meta.touchNote = "Tap the cards directly on the board.";

    const state = {
      cols: 4,
      rows: 4,
      cell: 128,
      originX: 104,
      originY: 104
    };

    function makeCards() {
      const values = shuffle(["A", "B", "C", "D", "E", "F", "G", "H", "A", "B", "C", "D", "E", "F", "G", "H"]);
      return values.map(function (value, index) {
        return {
          value: value,
          matched: false,
          revealed: false,
          row: Math.floor(index / state.cols),
          col: index % state.cols
        };
      });
    }

    function cardAt(point) {
      const cell = gridCellFromPoint(point, state.originX, state.originY, state.cell, state.cols, state.rows);
      if (!cell) {
        return null;
      }
      return state.cards[cell.row * state.cols + cell.col];
    }

    return {
      reset: function reset() {
        state.cards = makeCards();
        state.first = null;
        state.pending = [];
        state.turns = 0;
        state.matches = 0;
        state.time = 0;
        state.wins = runtime.readNumber("wins", 0);
        state.lockTimer = 0;
        runtime.setStatus("Find every pair.");
      },
      onPointer: function onPointer(point) {
        if (state.lockTimer > 0) {
          return;
        }
        const card = cardAt(point);
        if (!card || card.matched || card.revealed) {
          return;
        }
        card.revealed = true;
        if (!state.first) {
          state.first = card;
          return;
        }
        state.turns += 1;
        if (state.first.value === card.value) {
          state.first.matched = true;
          card.matched = true;
          state.matches += 1;
          state.first = null;
          if (state.matches >= 8) {
            state.wins += 1;
            runtime.writeNumber("wins", state.wins);
            runtime.finish("Board Cleared", "Every pair is matched.");
            runtime.setStatus("Memory complete.");
          }
        } else {
          state.pending = [state.first, card];
          state.first = null;
          state.lockTimer = 0.7;
        }
      },
      update: function update(dt) {
        state.time += dt;
        if (state.lockTimer > 0) {
          state.lockTimer -= dt;
          if (state.lockTimer <= 0) {
            state.pending.forEach(function (card) {
              card.revealed = false;
            });
            state.pending = [];
          }
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#0e2232", "#17385b");
        const colors = {
          A: "#ff5f5f",
          B: "#ffcf47",
          C: "#36d4ff",
          D: "#7ef5d7",
          E: "#8a6dff",
          F: "#ff8d43",
          G: "#92ff8c",
          H: "#ffd0ff"
        };
        state.cards.forEach(function (card) {
          const x = state.originX + card.col * state.cell + 8;
          const y = state.originY + card.row * state.cell + 8;
          const faceUp = card.revealed || card.matched;
          roundRect(
            ctx,
            x,
            y,
            state.cell - 16,
            state.cell - 16,
            18,
            faceUp ? colors[card.value] : "#1b2842",
            "rgba(255,255,255,0.14)"
          );
          if (faceUp) {
            drawCenteredText(ctx, card.value, x + (state.cell - 16) / 2, y + (state.cell - 16) / 2, 42, "#081425", "900");
          }
        });
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "Matches", value: state.matches || 0 },
          { label: "Turns", value: state.turns || 0 },
          { label: "Time", value: Math.floor(state.time || 0) },
          { label: "Wins", value: state.wins || 0 }
        ]);
        runtime.setStatus("Tap two cards to test a pair.");
      }
    };
  }

  function createMines(runtime, meta) {
    meta.controls = [
      { label: "Reveal", text: "Tap tiles while reveal mode is active." },
      { label: "Flag", text: "Switch to flag mode to mark suspicious cells." },
      { label: "Goal", text: "Open every safe square without touching a mine." }
    ];
    meta.keyMap = {
      e: "revealMode",
      f: "flagMode"
    };
    meta.touch = [
      { label: "Reveal", action: "revealMode", hold: false },
      { label: "Flag", action: "flagMode", hold: false }
    ];
    meta.touchNote = "Choose a mode, then tap the board.";

    const state = {
      size: 9,
      mines: 10,
      cell: 58,
      originX: 99,
      originY: 99
    };

    function indexOf(row, col) {
      return row * state.size + col;
    }

    function neighbors(row, col) {
      const result = [];
      for (let dRow = -1; dRow <= 1; dRow += 1) {
        for (let dCol = -1; dCol <= 1; dCol += 1) {
          if (dRow === 0 && dCol === 0) {
            continue;
          }
          const nextRow = row + dRow;
          const nextCol = col + dCol;
          if (nextRow >= 0 && nextRow < state.size && nextCol >= 0 && nextCol < state.size) {
            result.push(indexOf(nextRow, nextCol));
          }
        }
      }
      return result;
    }

    function generateBoard(excludeIndex) {
      state.cells = Array.from({ length: state.size * state.size }, function () {
        return { mine: false, revealed: false, flagged: false, count: 0 };
      });
      const available = [];
      for (let index = 0; index < state.cells.length; index += 1) {
        if (index !== excludeIndex) {
          available.push(index);
        }
      }
      shuffle(available);
      available.slice(0, state.mines).forEach(function (mineIndex) {
        state.cells[mineIndex].mine = true;
      });
      for (let row = 0; row < state.size; row += 1) {
        for (let col = 0; col < state.size; col += 1) {
          const cell = state.cells[indexOf(row, col)];
          if (cell.mine) {
            continue;
          }
          cell.count = neighbors(row, col).filter(function (neighbor) {
            return state.cells[neighbor].mine;
          }).length;
        }
      }
    }

    function revealIndex(index) {
      if (!state.cells[index] || state.cells[index].flagged || state.cells[index].revealed) {
        return;
      }
      if (state.firstMove) {
        generateBoard(index);
        state.firstMove = false;
      }
      const cell = state.cells[index];
      cell.revealed = true;
      if (cell.mine) {
        state.cells.forEach(function (entry) {
          entry.revealed = true;
        });
        runtime.finish("Mine Hit", "That tile was armed.");
        runtime.setStatus("Minesweeper lost.");
        return;
      }
      if (cell.count === 0) {
        const row = Math.floor(index / state.size);
        const col = index % state.size;
        neighbors(row, col).forEach(function (neighbor) {
          if (!state.cells[neighbor].revealed) {
            revealIndex(neighbor);
          }
        });
      }
      const safeRevealed = state.cells.filter(function (entry) {
        return entry.revealed && !entry.mine;
      }).length;
      if (safeRevealed >= state.size * state.size - state.mines) {
        state.wins += 1;
        runtime.writeNumber("wins", state.wins);
        runtime.finish("Field Cleared", "Every safe tile is open.");
        runtime.setStatus("Minesweeper won.");
      }
    }

    function toggleFlag(index) {
      const cell = state.cells[index];
      if (!cell || cell.revealed) {
        return;
      }
      cell.flagged = !cell.flagged;
    }

    return {
      reset: function reset() {
        state.mines = mapSetting(runtime, "difficulty", { easy: 8, normal: 10, hard: 14 }, "normal");
        state.cells = Array.from({ length: state.size * state.size }, function () {
          return { mine: false, revealed: false, flagged: false, count: 0 };
        });
        state.mode = "reveal";
        state.firstMove = true;
        state.time = 0;
        state.wins = runtime.readNumber("wins", 0);
        runtime.setStatus("Reveal safely and flag likely mines.");
      },
      onAction: function onAction(action, active) {
        if (!active) {
          return;
        }
        if (action === "revealMode") {
          state.mode = "reveal";
        }
        if (action === "flagMode") {
          state.mode = "flag";
        }
      },
      onPointer: function onPointer(point) {
        const cell = gridCellFromPoint(point, state.originX, state.originY, state.cell, state.size, state.size);
        if (!cell) {
          return;
        }
        const index = indexOf(cell.row, cell.col);
        if (state.mode === "flag") {
          toggleFlag(index);
        } else {
          revealIndex(index);
        }
      },
      update: function update(dt) {
        state.time += dt;
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#11192a", "#28334b");
        const numberColors = ["#9ab0d4", "#36d4ff", "#7ef5d7", "#ffd447", "#ff8d43", "#ff5f5f", "#8a6dff", "#ffffff", "#c0c0c0"];
        for (let row = 0; row < state.size; row += 1) {
          for (let col = 0; col < state.size; col += 1) {
            const cell = state.cells[indexOf(row, col)];
            const x = state.originX + col * state.cell + 2;
            const y = state.originY + row * state.cell + 2;
            roundRect(
              ctx,
              x,
              y,
              state.cell - 4,
              state.cell - 4,
              10,
              cell.revealed ? "#243148" : "#1a2740",
              "rgba(255,255,255,0.1)"
            );
            if (cell.flagged) {
              drawCenteredText(ctx, "F", x + (state.cell - 4) / 2, y + (state.cell - 4) / 2, 24, "#ffcf47", "900");
            } else if (cell.revealed && cell.mine) {
              drawCenteredText(ctx, "*", x + (state.cell - 4) / 2, y + (state.cell - 4) / 2, 24, "#ff5f5f", "900");
            } else if (cell.revealed && cell.count > 0) {
              drawCenteredText(
                ctx,
                String(cell.count),
                x + (state.cell - 4) / 2,
                y + (state.cell - 4) / 2,
                24,
                numberColors[cell.count],
                "900"
              );
            }
          }
        }
        drawBadge(ctx, state.mode === "flag" ? "FLAG MODE" : "REVEAL MODE", 98, 42, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
      },
      syncHud: function syncHud() {
        const flags = state.cells.filter(function (cell) {
          return cell.flagged;
        }).length;
        const safe = state.cells.filter(function (cell) {
          return cell.revealed && !cell.mine;
        }).length;
        runtime.setMetrics([
          { label: "Mines", value: state.mines - flags },
          { label: "Safe", value: safe },
          { label: "Time", value: Math.floor(state.time || 0) },
          { label: "Wins", value: state.wins || 0 }
        ]);
        runtime.setStatus("Current mode: " + state.mode + ".");
      }
    };
  }

  function createConnectFour(runtime, meta) {
    meta.controls = [
      { label: "Drop", text: "Tap a column to drop your red disc." },
      { label: "Read", text: "The cabinet blocks immediate threats and prefers the center." },
      { label: "Goal", text: "Connect four in any direction before the CPU does." }
    ];
    meta.touch = [];
    meta.touchNote = "Tap the column where you want your next disc.";

    const state = {
      cols: 7,
      rows: 6,
      cell: 78,
      originX: 87,
      originY: 120
    };

    function createBoard() {
      return Array.from({ length: state.rows }, function () {
        return Array(state.cols).fill(0);
      });
    }

    function availableRow(board, col) {
      for (let row = state.rows - 1; row >= 0; row -= 1) {
        if (board[row][col] === 0) {
          return row;
        }
      }
      return -1;
    }

    function drop(board, col, player) {
      const row = availableRow(board, col);
      if (row === -1) {
        return null;
      }
      board[row][col] = player;
      return row;
    }

    function checkWin(board, player) {
      const dirs = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
      ];
      for (let row = 0; row < state.rows; row += 1) {
        for (let col = 0; col < state.cols; col += 1) {
          if (board[row][col] !== player) {
            continue;
          }
          for (let dirIndex = 0; dirIndex < dirs.length; dirIndex += 1) {
            const dir = dirs[dirIndex];
            let count = 1;
            let nextRow = row + dir[1];
            let nextCol = col + dir[0];
            while (
              nextRow >= 0 &&
              nextRow < state.rows &&
              nextCol >= 0 &&
              nextCol < state.cols &&
              board[nextRow][nextCol] === player
            ) {
              count += 1;
              nextRow += dir[1];
              nextCol += dir[0];
            }
            if (count >= 4) {
              return true;
            }
          }
        }
      }
      return false;
    }

    function chooseComputerColumn() {
      const order = [3, 2, 4, 1, 5, 0, 6];
      const difficulty = getDifficultyValue(runtime);
      for (let index = 0; index < order.length; index += 1) {
        const col = order[index];
        const testBoard = state.board.map(function (row) {
          return row.slice();
        });
        if (drop(testBoard, col, 2) !== null && checkWin(testBoard, 2)) {
          return col;
        }
      }
      if (difficulty === "easy") {
        const available = order.filter(function (col) {
          return availableRow(state.board, col) !== -1;
        });
        return available.length ? pick(available) : undefined;
      }
      for (let index = 0; index < order.length; index += 1) {
        const col = order[index];
        const testBoard = state.board.map(function (row) {
          return row.slice();
        });
        if (drop(testBoard, col, 1) !== null && checkWin(testBoard, 1)) {
          return col;
        }
      }
      return order.find(function (col) {
        return availableRow(state.board, col) !== -1;
      });
    }

    function endIfFinished(player) {
      if (checkWin(state.board, player)) {
        if (player === 1) {
          state.wins += 1;
          runtime.writeNumber("wins", state.wins);
          runtime.finish("Connect Four", "You built the winning line first.");
          runtime.setStatus("Connect Four won.");
        } else {
          runtime.finish("Cabinet Connects", "The CPU completed the line before you.");
          runtime.setStatus("Connect Four lost.");
        }
        return true;
      }
      const filled = state.board.every(function (row) {
        return row.every(function (cell) {
          return cell !== 0;
        });
      });
      if (filled) {
        state.draws += 1;
        runtime.finish("Board Full", "The match ended in a draw.");
        runtime.setStatus("Connect Four drawn.");
        return true;
      }
      return false;
    }

    return {
      reset: function reset() {
        state.board = createBoard();
        state.turn = 1;
        state.aiTimer = 0;
        state.aiDelay = mapSetting(runtime, "pace", { relaxed: 0.7, classic: 0.45, turbo: 0.2 }, "classic");
        state.wins = runtime.readNumber("wins", 0);
        state.draws = 0;
        runtime.setStatus("Your move. Aim for the center columns.");
      },
      onPointer: function onPointer(point) {
        if (state.turn !== 1 || runtime.ended) {
          return;
        }
        const col = Math.floor((point.x - state.originX) / state.cell);
        if (col < 0 || col >= state.cols) {
          return;
        }
        if (drop(state.board, col, 1) === null) {
          return;
        }
        if (endIfFinished(1)) {
          return;
        }
        state.turn = 2;
        state.aiTimer = state.aiDelay;
      },
      update: function update(dt) {
        if (state.turn !== 2) {
          return;
        }
        state.aiTimer -= dt;
        if (state.aiTimer > 0) {
          return;
        }
        const col = chooseComputerColumn();
        if (typeof col === "number") {
          drop(state.board, col, 2);
        }
        if (endIfFinished(2)) {
          return;
        }
        state.turn = 1;
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#0f1850", "#162969");
        roundRect(ctx, state.originX - 18, state.originY - 18, state.cols * state.cell + 36, state.rows * state.cell + 36, 28, "#2043bb");
        for (let row = 0; row < state.rows; row += 1) {
          for (let col = 0; col < state.cols; col += 1) {
            const x = state.originX + col * state.cell + state.cell / 2;
            const y = state.originY + row * state.cell + state.cell / 2;
            ctx.beginPath();
            ctx.fillStyle = state.board[row][col] === 1 ? "#ff5f5f" : state.board[row][col] === 2 ? "#ffcf47" : "#11204b";
            ctx.arc(x, y, 28, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
      syncHud: function syncHud() {
        const playerPieces = state.board.flat().filter(function (cell) { return cell === 1; }).length;
        const cpuPieces = state.board.flat().filter(function (cell) { return cell === 2; }).length;
        runtime.setMetrics([
          { label: "You", value: playerPieces },
          { label: "CPU", value: cpuPieces },
          { label: "Draws", value: state.draws || 0 },
          { label: "Wins", value: state.wins || 0 }
        ]);
        runtime.setStatus(state.turn === 1 ? "Your turn." : "CPU is thinking.");
      }
    };
  }

  function createTicTacToe(runtime, meta) {
    meta.controls = [
      { label: "Place", text: "Tap an empty square to place an X." },
      { label: "Counter", text: "The CPU plays a perfect reply every turn." },
      { label: "Goal", text: "Build three in a row or settle for the draw." }
    ];
    meta.touch = [];
    meta.touchNote = "Tap the square where you want your X.";

    const state = {
      cell: 170,
      originX: 105,
      originY: 105
    };

    function winner(board) {
      const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
      ];
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (board[line[0]] && board[line[0]] === board[line[1]] && board[line[1]] === board[line[2]]) {
          return board[line[0]];
        }
      }
      return board.every(function (cell) { return cell; }) ? "draw" : null;
    }

    function minimax(board, player) {
      const result = winner(board);
      if (result === "O") {
        return { score: 10 };
      }
      if (result === "X") {
        return { score: -10 };
      }
      if (result === "draw") {
        return { score: 0 };
      }
      const moves = [];
      for (let index = 0; index < 9; index += 1) {
        if (board[index]) {
          continue;
        }
        const nextBoard = board.slice();
        nextBoard[index] = player;
        const outcome = minimax(nextBoard, player === "O" ? "X" : "O");
        moves.push({ index: index, score: outcome.score });
      }
      if (player === "O") {
        return moves.reduce(function (best, move) {
          return move.score > best.score ? move : best;
        });
      }
      return moves.reduce(function (best, move) {
        return move.score < best.score ? move : best;
      });
    }

    function chooseCpuMove() {
      const empty = state.board
        .map(function (value, index) {
          return value ? null : index;
        })
        .filter(function (value) {
          return value !== null;
        });
      if (!empty.length) {
        return null;
      }
      const difficulty = getDifficultyValue(runtime);
      if (difficulty === "easy") {
        return pick(empty);
      }
      if (difficulty === "normal" && Math.random() < 0.35) {
        return pick(empty);
      }
      return minimax(state.board, "O").index;
    }

    return {
      reset: function reset() {
        state.board = Array(9).fill("");
        state.turn = "X";
        state.wins = runtime.readNumber("wins", 0);
        state.draws = 0;
        state.hintCell = null;
        runtime.setStatus("Take a corner or the center early.");
      },
      onPointer: function onPointer(point) {
        if (state.turn !== "X" || runtime.ended) {
          return;
        }
        const col = Math.floor((point.x - state.originX) / state.cell);
        const row = Math.floor((point.y - state.originY) / state.cell);
        if (col < 0 || col > 2 || row < 0 || row > 2) {
          return;
        }
        const index = row * 3 + col;
        if (state.board[index]) {
          return;
        }
        state.board[index] = "X";
        const firstResult = winner(state.board);
        if (firstResult === "X") {
          state.wins += 1;
          runtime.writeNumber("wins", state.wins);
          runtime.finish("Tic-Tac-Toe", "You found the winning line.");
          runtime.setStatus("Tic-Tac-Toe won.");
          return;
        }
        if (firstResult === "draw") {
          state.draws += 1;
          runtime.finish("Draw", "Neither side found a winning line.");
          runtime.setStatus("Tic-Tac-Toe drawn.");
          return;
        }
        state.turn = "O";
        const move = { index: chooseCpuMove() };
        if (typeof move.index === "number") {
          state.board[move.index] = "O";
        }
        const secondResult = winner(state.board);
        if (secondResult === "O") {
          runtime.finish("Cabinet Wins", "The CPU converted the position.");
          runtime.setStatus("Tic-Tac-Toe lost.");
          return;
        }
        if (secondResult === "draw") {
          state.draws += 1;
          runtime.finish("Draw", "Neither side found a winning line.");
          runtime.setStatus("Tic-Tac-Toe drawn.");
          return;
        }
        state.turn = "X";
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#171837", "#2c1f55");
        ctx.strokeStyle = "#f6f0d6";
        ctx.lineWidth = 8;
        for (let index = 1; index <= 2; index += 1) {
          ctx.beginPath();
          ctx.moveTo(state.originX + state.cell * index, state.originY);
          ctx.lineTo(state.originX + state.cell * index, state.originY + state.cell * 3);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(state.originX, state.originY + state.cell * index);
          ctx.lineTo(state.originX + state.cell * 3, state.originY + state.cell * index);
          ctx.stroke();
        }
        state.board.forEach(function (value, index) {
          if (!value) {
            return;
          }
          const col = index % 3;
          const row = Math.floor(index / 3);
          const x = state.originX + col * state.cell + state.cell / 2;
          const y = state.originY + row * state.cell + state.cell / 2;
          drawCenteredText(ctx, value, x, y, 64, value === "X" ? "#36d4ff" : "#ff8d43", "900");
        });
        if (!isPure(runtime) && state.turn === "X") {
          const hintMove = minimax(state.board, "X").index;
          if (typeof hintMove === "number") {
            const hintCol = hintMove % 3;
            const hintRow = Math.floor(hintMove / 3);
            ctx.strokeStyle = "rgba(255,255,255,0.35)";
            ctx.lineWidth = 4;
            roundRect(
              ctx,
              state.originX + hintCol * state.cell + 14,
              state.originY + hintRow * state.cell + 14,
              state.cell - 28,
              state.cell - 28,
              18,
              null,
              "rgba(255,255,255,0.35)"
            );
          }
        }
      },
      syncHud: function syncHud() {
        const xs = state.board.filter(function (cell) { return cell === "X"; }).length;
        const os = state.board.filter(function (cell) { return cell === "O"; }).length;
        runtime.setMetrics([
          { label: "X", value: xs },
          { label: "O", value: os },
          { label: "Draws", value: state.draws || 0 },
          { label: "Wins", value: state.wins || 0 }
        ]);
        runtime.setStatus(state.turn === "X" ? "Your move." : "CPU response.");
      }
    };
  }

  function createReversi(runtime, meta) {
    meta.controls = [
      { label: "Place", text: "Tap a highlighted square to place a black disc." },
      { label: "Flip", text: "Every placed disc must trap at least one white disc." },
      { label: "Goal", text: "Finish with more discs than the cabinet." }
    ];
    meta.touch = [];
    meta.touchNote = "Tap one of the legal hint spots.";

    const state = {
      size: 8,
      cell: 64,
      originX: 104,
      originY: 104
    };

    function createBoard() {
      const board = Array.from({ length: state.size }, function () {
        return Array(state.size).fill(0);
      });
      board[3][3] = 2;
      board[3][4] = 1;
      board[4][3] = 1;
      board[4][4] = 2;
      return board;
    }

    function validMoves(player) {
      const enemy = player === 1 ? 2 : 1;
      const moves = [];
      for (let row = 0; row < state.size; row += 1) {
        for (let col = 0; col < state.size; col += 1) {
          if (state.board[row][col] !== 0) {
            continue;
          }
          const flips = [];
          for (let dRow = -1; dRow <= 1; dRow += 1) {
            for (let dCol = -1; dCol <= 1; dCol += 1) {
              if (dRow === 0 && dCol === 0) {
                continue;
              }
              const current = [];
              let nextRow = row + dRow;
              let nextCol = col + dCol;
              while (
                nextRow >= 0 &&
                nextRow < state.size &&
                nextCol >= 0 &&
                nextCol < state.size &&
                state.board[nextRow][nextCol] === enemy
              ) {
                current.push([nextRow, nextCol]);
                nextRow += dRow;
                nextCol += dCol;
              }
              if (
                current.length &&
                nextRow >= 0 &&
                nextRow < state.size &&
                nextCol >= 0 &&
                nextCol < state.size &&
                state.board[nextRow][nextCol] === player
              ) {
                flips.push.apply(flips, current);
              }
            }
          }
          if (flips.length) {
            moves.push({ row: row, col: col, flips: flips });
          }
        }
      }
      return moves;
    }

    function applyMove(move, player) {
      state.board[move.row][move.col] = player;
      move.flips.forEach(function (spot) {
        state.board[spot[0]][spot[1]] = player;
      });
      state.moves += 1;
    }

    function counts() {
      let black = 0;
      let white = 0;
      state.board.forEach(function (row) {
        row.forEach(function (cell) {
          if (cell === 1) {
            black += 1;
          }
          if (cell === 2) {
            white += 1;
          }
        });
      });
      return { black: black, white: white };
    }

    function finishBoard() {
      const score = counts();
      if (score.black > score.white) {
        state.wins += 1;
        runtime.writeNumber("wins", state.wins);
        runtime.finish("Reversi", "You controlled more of the board.");
        runtime.setStatus("Reversi won.");
      } else if (score.black < score.white) {
        runtime.finish("Cabinet Wins", "The white discs took the final count.");
        runtime.setStatus("Reversi lost.");
      } else {
        runtime.finish("Draw", "Both sides finished level on discs.");
        runtime.setStatus("Reversi drawn.");
      }
    }

    function chooseCpuMove() {
      const moves = validMoves(2);
      if (!moves.length) {
        return null;
      }
      if (getDifficultyValue(runtime) === "easy") {
        return pick(moves);
      }
      return moves.reduce(function (best, move) {
        let score = move.flips.length;
        if ((move.row === 0 || move.row === 7) && (move.col === 0 || move.col === 7)) {
          score += 10;
        } else if (move.row === 0 || move.row === 7 || move.col === 0 || move.col === 7) {
          score += 3;
        }
        return score > best.score ? { move: move, score: score } : best;
      }, { move: moves[0], score: -Infinity }).move;
    }

    return {
      reset: function reset() {
        state.board = createBoard();
        state.turn = 1;
        state.aiTimer = 0;
        state.moves = 0;
        state.wins = runtime.readNumber("wins", 0);
        runtime.setStatus("Black moves first.");
      },
      onPointer: function onPointer(point) {
        if (state.turn !== 1 || runtime.ended) {
          return;
        }
        const cell = gridCellFromPoint(point, state.originX, state.originY, state.cell, state.size, state.size);
        if (!cell) {
          return;
        }
        const move = validMoves(1).find(function (entry) {
          return entry.row === cell.row && entry.col === cell.col;
        });
        if (!move) {
          return;
        }
        applyMove(move, 1);
        if (!validMoves(1).length && !validMoves(2).length) {
          finishBoard();
          return;
        }
        state.turn = 2;
        state.aiTimer = 0.5;
      },
      update: function update(dt) {
        if (state.turn !== 2) {
          return;
        }
        state.aiTimer -= dt;
        if (state.aiTimer > 0) {
          return;
        }
        const move = chooseCpuMove();
        if (move) {
          applyMove(move, 2);
        }
        const playerMoves = validMoves(1);
        const cpuMoves = validMoves(2);
        if (!playerMoves.length && !cpuMoves.length) {
          finishBoard();
          return;
        }
        state.turn = playerMoves.length ? 1 : 2;
        if (!playerMoves.length && cpuMoves.length) {
          state.aiTimer = 0.4;
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#07261e", "#0d493b");
        for (let row = 0; row < state.size; row += 1) {
          for (let col = 0; col < state.size; col += 1) {
            roundRect(
              ctx,
              state.originX + col * state.cell + 2,
              state.originY + row * state.cell + 2,
              state.cell - 4,
              state.cell - 4,
              10,
              "#1f7b58",
              "rgba(255,255,255,0.12)"
            );
            const cell = state.board[row][col];
            if (cell) {
              ctx.beginPath();
              ctx.fillStyle = cell === 1 ? "#10151c" : "#f6f0d6";
              ctx.arc(
                state.originX + col * state.cell + state.cell / 2,
                state.originY + row * state.cell + state.cell / 2,
                24,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          }
        }
        if (state.turn === 1) {
          const showHints = !isPure(runtime);
          if (!showHints) {
            return;
          }
          validMoves(1).forEach(function (move) {
            ctx.beginPath();
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.arc(
              state.originX + move.col * state.cell + state.cell / 2,
              state.originY + move.row * state.cell + state.cell / 2,
              10,
              0,
              Math.PI * 2
            );
            ctx.fill();
          });
        }
      },
      syncHud: function syncHud() {
        const score = counts();
        runtime.setMetrics([
          { label: "You", value: score.black },
          { label: "CPU", value: score.white },
          { label: "Moves", value: state.moves || 0 },
          { label: "Wins", value: state.wins || 0 }
        ]);
        runtime.setStatus(state.turn === 1 ? "Your move." : "CPU move.");
      }
    };
  }

  function create2048(runtime, meta) {
    meta.controls = [
      { label: "Slide", text: "Use arrow keys, WASD, or the touch pad to push the board." },
      { label: "Merge", text: "Equal tiles combine once per move." },
      { label: "Goal", text: "Keep a lane open and build the largest tile you can." }
    ];
    meta.keyMap = {
      arrowup: "up",
      w: "up",
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowdown: "down",
      s: "down"
    };
    meta.touch = [
      { empty: true },
      { label: "Up", action: "up", hold: false },
      { empty: true },
      { label: "Left", action: "left", hold: false },
      { label: "Down", action: "down", hold: false },
      { label: "Right", action: "right", hold: false }
    ];
    meta.touchNote = "Tap a direction to slide the full board.";

    const state = {};

    function createGrid() {
      return Array.from({ length: 4 }, function () {
        return Array(4).fill(0);
      });
    }

    function emptyCells() {
      const spots = [];
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          if (state.grid[row][col] === 0) {
            spots.push({ row: row, col: col });
          }
        }
      }
      return spots;
    }

    function spawnTile() {
      const spots = emptyCells();
      if (!spots.length) {
        return;
      }
      const spot = pick(spots);
      state.grid[spot.row][spot.col] = Math.random() < state.fourChance ? 4 : 2;
    }

    function collapseLine(line) {
      const compact = line.filter(function (value) { return value !== 0; });
      let gained = 0;
      for (let index = 0; index < compact.length - 1; index += 1) {
        if (compact[index] && compact[index] === compact[index + 1]) {
          compact[index] *= 2;
          gained += compact[index];
          compact[index + 1] = 0;
          index += 1;
        }
      }
      const merged = compact.filter(function (value) { return value !== 0; });
      while (merged.length < 4) {
        merged.push(0);
      }
      return { line: merged, gained: gained };
    }

    function move(direction) {
      const original = state.grid.map(function (row) { return row.slice(); });
      let gained = 0;
      for (let index = 0; index < 4; index += 1) {
        let line = [];
        for (let offset = 0; offset < 4; offset += 1) {
          if (direction === "left") {
            line.push(state.grid[index][offset]);
          } else if (direction === "right") {
            line.push(state.grid[index][3 - offset]);
          } else if (direction === "up") {
            line.push(state.grid[offset][index]);
          } else if (direction === "down") {
            line.push(state.grid[3 - offset][index]);
          }
        }
        const collapsed = collapseLine(line);
        gained += collapsed.gained;
        for (let offset = 0; offset < 4; offset += 1) {
          const value = collapsed.line[offset];
          if (direction === "left") {
            state.grid[index][offset] = value;
          } else if (direction === "right") {
            state.grid[index][3 - offset] = value;
          } else if (direction === "up") {
            state.grid[offset][index] = value;
          } else if (direction === "down") {
            state.grid[3 - offset][index] = value;
          }
        }
      }
      const changed = JSON.stringify(original) !== JSON.stringify(state.grid);
      if (changed) {
        state.score += gained;
        state.moves += 1;
        state.best = Math.max(state.best, state.score);
        runtime.writeNumber("best", state.best);
        spawnTile();
      }
      return changed;
    }

    function canMove() {
      if (emptyCells().length) {
        return true;
      }
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          if ((row < 3 && state.grid[row][col] === state.grid[row + 1][col]) || (col < 3 && state.grid[row][col] === state.grid[row][col + 1])) {
            return true;
          }
        }
      }
      return false;
    }

    return {
      reset: function reset() {
        state.grid = createGrid();
        state.score = 0;
        state.moves = 0;
        state.best = runtime.readNumber("best", 0);
        state.fourChance = mapSetting(runtime, "difficulty", { easy: 0.05, normal: 0.1, hard: 0.18 }, "normal");
        spawnTile();
        spawnTile();
        if (getPaceValue(runtime) === "turbo") {
          spawnTile();
        }
        runtime.setStatus("Build from the corners and keep an escape lane.");
      },
      onAction: function onAction(action, active) {
        if (!active || ["up", "down", "left", "right"].indexOf(action) === -1) {
          return;
        }
        const changed = move(action);
        if (!canMove()) {
          runtime.finish("No More Moves", "The board locked up before the next merge.");
          runtime.setStatus("2048 over.");
          return;
        }
        if (changed) {
          runtime.setStatus("Board shifted " + action + ".");
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#2a1d17", "#4a2b20");
        roundRect(ctx, 100, 100, 520, 520, 32, "rgba(255,255,255,0.08)");
        const colors = {
          0: "#2b3246",
          2: "#eee4da",
          4: "#ede0c8",
          8: "#f2b179",
          16: "#f59563",
          32: "#f67c5f",
          64: "#f65e3b",
          128: "#edcf72",
          256: "#edcc61",
          512: "#edc850",
          1024: "#edc53f",
          2048: "#edc22e"
        };
        for (let row = 0; row < 4; row += 1) {
          for (let col = 0; col < 4; col += 1) {
            const value = state.grid[row][col];
            const x = 116 + col * 126;
            const y = 116 + row * 126;
            roundRect(ctx, x, y, 110, 110, 18, colors[value] || "#3d2f4c");
            if (value) {
              drawCenteredText(ctx, String(value), x + 55, y + 58, value >= 1024 ? 28 : 36, value <= 4 ? "#4d443d" : "#ffffff", "900");
            }
          }
        }
      },
      syncHud: function syncHud() {
        const topTile = Math.max.apply(null, state.grid.flat());
        runtime.setMetrics([
          { label: "Score", value: state.score || 0 },
          { label: "Best", value: state.best || 0 },
          { label: "Top", value: topTile || 0 },
          { label: "Moves", value: state.moves || 0 }
        ]);
        runtime.setStatus("Top tile: " + (topTile || 0));
      }
    };
  }

  function createSlidePuzzle(runtime, meta) {
    meta.controls = [
      { label: "Tap", text: "Tap a tile next to the blank to slide it." },
      { label: "Pad", text: "Arrow keys and the touch pad move the blank space." },
      { label: "Goal", text: "Restore the numbers to perfect order." }
    ];
    meta.keyMap = {
      arrowup: "up",
      w: "up",
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowdown: "down",
      s: "down"
    };
    meta.touch = [
      { empty: true },
      { label: "Up", action: "up", hold: false },
      { empty: true },
      { label: "Left", action: "left", hold: false },
      { label: "Down", action: "down", hold: false },
      { label: "Right", action: "right", hold: false }
    ];
    meta.touchNote = "Tap a direction to move the blank, or tap a neighboring tile.";

    const state = {
      cell: 126,
      originX: 108,
      originY: 108
    };

    function solvedBoard() {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
    }

    function moveBlank(direction) {
      const blank = state.tiles.indexOf(0);
      const row = Math.floor(blank / 4);
      const col = blank % 4;
      let swap = -1;
      if (direction === "up" && row < 3) {
        swap = blank + 4;
      }
      if (direction === "down" && row > 0) {
        swap = blank - 4;
      }
      if (direction === "left" && col < 3) {
        swap = blank + 1;
      }
      if (direction === "right" && col > 0) {
        swap = blank - 1;
      }
      if (swap === -1) {
        return false;
      }
      const tmp = state.tiles[blank];
      state.tiles[blank] = state.tiles[swap];
      state.tiles[swap] = tmp;
      state.moves += 1;
      return true;
    }

    function progressCount() {
      return state.tiles.filter(function (value, index) {
        return value !== 0 && value === index + 1;
      }).length;
    }

    function isSolved() {
      return JSON.stringify(state.tiles) === JSON.stringify(solvedBoard());
    }

    return {
      reset: function reset() {
        state.tiles = solvedBoard();
        state.moves = 0;
        state.time = 0;
        state.wins = runtime.readNumber("wins", 0);
        state.shuffleCount = mapSetting(runtime, "difficulty", { easy: 80, normal: 140, hard: 220 }, "normal");
        for (let shuffleCount = 0; shuffleCount < state.shuffleCount; shuffleCount += 1) {
          moveBlank(pick(["up", "down", "left", "right"]));
        }
        state.moves = 0;
        runtime.setStatus("Rebuild the full number grid.");
      },
      onAction: function onAction(action, active) {
        if (!active || ["up", "down", "left", "right"].indexOf(action) === -1) {
          return;
        }
        if (moveBlank(action) && isSolved()) {
          state.wins += 1;
          runtime.writeNumber("wins", state.wins);
          runtime.finish("Puzzle Solved", "The numbers are back in order.");
          runtime.setStatus("Slide puzzle solved.");
        }
      },
      onPointer: function onPointer(point) {
        const col = Math.floor((point.x - state.originX) / state.cell);
        const row = Math.floor((point.y - state.originY) / state.cell);
        if (col < 0 || col > 3 || row < 0 || row > 3) {
          return;
        }
        const index = row * 4 + col;
        const blank = state.tiles.indexOf(0);
        const blankRow = Math.floor(blank / 4);
        const blankCol = blank % 4;
        if (Math.abs(blankRow - row) + Math.abs(blankCol - col) !== 1) {
          return;
        }
        const tmp = state.tiles[index];
        state.tiles[index] = 0;
        state.tiles[blank] = tmp;
        state.moves += 1;
        if (isSolved()) {
          state.wins += 1;
          runtime.writeNumber("wins", state.wins);
          runtime.finish("Puzzle Solved", "The numbers are back in order.");
          runtime.setStatus("Slide puzzle solved.");
        }
      },
      update: function update(dt) {
        state.time += dt;
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#121935", "#27417b");
        const blank = state.tiles.indexOf(0);
        const blankRow = Math.floor(blank / 4);
        const blankCol = blank % 4;
        for (let index = 0; index < 16; index += 1) {
          const row = Math.floor(index / 4);
          const col = index % 4;
          const value = state.tiles[index];
          const x = state.originX + col * state.cell + 6;
          const y = state.originY + row * state.cell + 6;
          const movable = Math.abs(blankRow - row) + Math.abs(blankCol - col) === 1;
          roundRect(
            ctx,
            x,
            y,
            state.cell - 12,
            state.cell - 12,
            18,
            value === 0 ? "rgba(255,255,255,0.08)" : "#f6f0d6",
            !isPure(runtime) && movable ? "rgba(54,212,255,0.45)" : null
          );
          if (value !== 0) {
            drawCenteredText(ctx, String(value), x + (state.cell - 12) / 2, y + (state.cell - 12) / 2, 42, "#122038", "900");
          }
        }
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "Moves", value: state.moves || 0 },
          { label: "Correct", value: progressCount() },
          { label: "Time", value: Math.floor(state.time || 0) },
          { label: "Wins", value: state.wins || 0 }
        ]);
        runtime.setStatus("Correct tiles: " + progressCount() + " of 15.");
      }
    };
  }

  function createHangman(runtime, meta) {
    meta.controls = [
      { label: "Guess", text: "Type a letter or tap the on-board keyboard." },
      { label: "Track", text: "Wrong guesses build the hanging figure one step at a time." },
      { label: "Goal", text: "Reveal the whole word before your lives run out." }
    ];
    meta.touch = [];
    meta.touchNote = "Tap letters directly from the on-screen keyboard.";

    const words = [
      "ARCADE",
      "PINBALL",
      "GALAXY",
      "CABINET",
      "CHECKERS",
      "PACMAN",
      "TICKETS",
      "JOYSTICK",
      "MARBLES",
      "GALAGA",
      "CARNIVAL",
      "PUZZLE"
    ];
    const state = {};

    function buildKeys() {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      return letters.map(function (letter, index) {
        const cols = 7;
        const row = Math.floor(index / cols);
        const col = index % cols;
        return {
          letter: letter,
          x: 82 + col * 80,
          y: 452 + row * 64,
          w: 64,
          h: 46
        };
      });
    }

    function maskedWord() {
      return state.word
        .split("")
        .map(function (letter) {
          return state.guessed.has(letter) ? letter : "_";
        })
        .join(" ");
    }

    function guess(letter) {
      const upper = String(letter || "").toUpperCase();
      if (!/^[A-Z]$/.test(upper) || state.guessed.has(upper)) {
        return;
      }
      state.guessed.add(upper);
      if (state.word.indexOf(upper) === -1) {
        state.wrong += 1;
        if (state.wrong >= state.maxWrong) {
          runtime.finish("Hangman Over", "The word was " + state.word + ".");
          runtime.setStatus("Hangman lost.");
        }
        return;
      }
      const solved = state.word.split("").every(function (char) {
        return state.guessed.has(char);
      });
      if (solved) {
        state.wins += 1;
        runtime.writeNumber("wins", state.wins);
        runtime.finish("Word Solved", "You revealed " + state.word + ".");
        runtime.setStatus("Hangman won.");
      }
    }

    return {
      reset: function reset() {
        const difficulty = getDifficultyValue(runtime);
        const wordPool = words.filter(function (word) {
          if (difficulty === "easy") {
            return word.length <= 7;
          }
          if (difficulty === "hard") {
            return word.length >= 7;
          }
          return true;
        });
        state.word = pick(wordPool.length ? wordPool : words);
        state.guessed = new Set();
        state.wrong = 0;
        state.maxWrong = mapSetting(runtime, "assist", { forgiving: 7, balanced: 6, pure: 5 }, "balanced");
        state.wins = runtime.readNumber("wins", 0);
        state.keys = buildKeys();
        if (isForgiving(runtime)) {
          state.guessed.add(state.word[0]);
        }
        runtime.setStatus("Start guessing one letter at a time.");
      },
      onTextInput: function onTextInput(letter) {
        guess(letter);
      },
      onPointer: function onPointer(point) {
        state.keys.forEach(function (key) {
          if (point.x >= key.x && point.x <= key.x + key.w && point.y >= key.y && point.y <= key.y + key.h) {
            guess(key.letter);
          }
        });
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#1b1632", "#3c2a61");
        ctx.strokeStyle = "#f6f0d6";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(120, 390);
        ctx.lineTo(240, 390);
        ctx.moveTo(150, 390);
        ctx.lineTo(150, 160);
        ctx.lineTo(300, 160);
        ctx.lineTo(300, 200);
        ctx.stroke();

        if (state.wrong > 0) {
          ctx.beginPath();
          ctx.arc(300, 232, 28, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (state.wrong > 1) {
          ctx.beginPath();
          ctx.moveTo(300, 260);
          ctx.lineTo(300, 328);
          ctx.stroke();
        }
        if (state.wrong > 2) {
          ctx.beginPath();
          ctx.moveTo(300, 284);
          ctx.lineTo(270, 306);
          ctx.stroke();
        }
        if (state.wrong > 3) {
          ctx.beginPath();
          ctx.moveTo(300, 284);
          ctx.lineTo(330, 306);
          ctx.stroke();
        }
        if (state.wrong > 4) {
          ctx.beginPath();
          ctx.moveTo(300, 328);
          ctx.lineTo(274, 366);
          ctx.stroke();
        }
        if (state.wrong > 5) {
          ctx.beginPath();
          ctx.moveTo(300, 328);
          ctx.lineTo(326, 366);
          ctx.stroke();
        }

        drawCenteredText(ctx, maskedWord(), 500, 260, 36, "#f6f0d6", "900");
        state.keys.forEach(function (key) {
          const used = state.guessed.has(key.letter);
          roundRect(ctx, key.x, key.y, key.w, key.h, 12, used ? "#4a455c" : "#6b4ef7");
          drawCenteredText(ctx, key.letter, key.x + key.w / 2, key.y + key.h / 2, 22, "#ffffff", "900");
        });
      },
      syncHud: function syncHud() {
        const correct = state.word
          .split("")
          .filter(function (letter) {
            return state.guessed.has(letter);
          }).length;
        runtime.setMetrics([
          { label: "Letters", value: state.word.length },
          { label: "Lives", value: state.maxWrong - state.wrong },
          { label: "Solved", value: correct },
          { label: "Wins", value: state.wins || 0 }
        ]);
        runtime.setStatus("Wrong guesses: " + state.wrong + " of " + state.maxWrong + ".");
      }
    };
  }

  function createBubbleShooter(runtime, meta) {
    meta.controls = [
      { label: "Aim", text: "Arrow left and right tilt the launcher." },
      { label: "Fire", text: "Space or the middle touch button shoots the loaded bubble." },
      { label: "Goal", text: "Match clusters and stop the ceiling from reaching the floor." }
    ];
    meta.keyMap = {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      space: "fire"
    };
    meta.touch = [
      { label: "Left", action: "left", hold: true },
      { label: "Fire", action: "fire", hold: false },
      { label: "Right", action: "right", hold: true }
    ];
    meta.touchNote = "Hold left or right to adjust the aim, then tap fire.";

    const palette = ["#36d4ff", "#ff5f5f", "#ffcf47", "#7ef5d7", "#8a6dff"];
    const state = {
      cols: 8,
      rows: 10,
      cell: 64,
      radius: 24,
      originX: 104,
      originY: 90
    };

    function createBoard() {
      const board = Array.from({ length: state.rows }, function () {
        return Array(state.cols).fill(null);
      });
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < state.cols; col += 1) {
          board[row][col] = pick(palette);
        }
      }
      return board;
    }

    function cellCenter(row, col) {
      return {
        x: state.originX + col * state.cell + state.cell / 2,
        y: state.originY + row * state.cell + state.cell / 2
      };
    }

    function loadBubble() {
      state.currentColor = pick(palette);
    }

    function findNearestEmpty(x, y) {
      let best = null;
      for (let row = 0; row < state.rows; row += 1) {
        for (let col = 0; col < state.cols; col += 1) {
          if (state.board[row][col]) {
            continue;
          }
          const center = cellCenter(row, col);
          const dist = distance(center.x, center.y, x, y);
          if (!best || dist < best.distance) {
            best = { row: row, col: col, distance: dist };
          }
        }
      }
      return best;
    }

    function neighbors(row, col) {
      const list = [];
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ].forEach(function (step) {
        const nextRow = row + step[1];
        const nextCol = col + step[0];
        if (nextRow >= 0 && nextRow < state.rows && nextCol >= 0 && nextCol < state.cols) {
          list.push({ row: nextRow, col: nextCol });
        }
      });
      return list;
    }

    function clusterFrom(row, col) {
      const color = state.board[row][col];
      const queue = [{ row: row, col: col }];
      const seen = new Set([row + ":" + col]);
      const cluster = [];
      while (queue.length) {
        const current = queue.shift();
        cluster.push(current);
        neighbors(current.row, current.col).forEach(function (next) {
          const key = next.row + ":" + next.col;
          if (seen.has(key) || state.board[next.row][next.col] !== color) {
            return;
          }
          seen.add(key);
          queue.push(next);
        });
      }
      return cluster;
    }

    function removeFloating() {
      const queue = [];
      const attached = new Set();
      for (let col = 0; col < state.cols; col += 1) {
        if (state.board[0][col]) {
          queue.push({ row: 0, col: col });
          attached.add("0:" + col);
        }
      }
      while (queue.length) {
        const current = queue.shift();
        neighbors(current.row, current.col).forEach(function (next) {
          const key = next.row + ":" + next.col;
          if (attached.has(key) || !state.board[next.row][next.col]) {
            return;
          }
          attached.add(key);
          queue.push(next);
        });
      }
      for (let row = 0; row < state.rows; row += 1) {
        for (let col = 0; col < state.cols; col += 1) {
          if (state.board[row][col] && !attached.has(row + ":" + col)) {
            state.board[row][col] = null;
            state.score += 10;
          }
        }
      }
    }

    function attachShot() {
      const target = findNearestEmpty(state.shot.x, state.shot.y);
      if (!target) {
        return;
      }
      state.board[target.row][target.col] = state.shot.color;
      state.shot = null;
      state.shots += 1;
      const cluster = clusterFrom(target.row, target.col);
      if (cluster.length >= 3) {
        cluster.forEach(function (spot) {
          state.board[spot.row][spot.col] = null;
        });
        state.score += cluster.length * 20;
        removeFloating();
      }
      state.best = Math.max(state.best, state.score);
      runtime.writeNumber("best", state.best);
      if (state.shots % 5 === 0) {
        state.board.pop();
        state.board.unshift(Array.from({ length: state.cols }, function () { return pick(palette); }));
      }
      if (state.board[state.rows - 1].some(function (cell) { return Boolean(cell); })) {
        runtime.finish("Bubble Ceiling", "The clusters reached the floor line.");
        runtime.setStatus("Bubble Shooter lost.");
        return;
      }
      loadBubble();
    }

    function fireShot() {
      if (state.shot) {
        return;
      }
      state.shot = {
        x: 360,
        y: 654,
        vx: Math.cos(state.angle) * 420,
        vy: Math.sin(state.angle) * 420,
        color: state.currentColor
      };
    }

    return {
      reset: function reset() {
        state.board = createBoard();
        state.score = 0;
        state.best = runtime.readNumber("best", 0);
        state.shots = 0;
        state.angle = -Math.PI / 2;
        state.shot = null;
        loadBubble();
        runtime.setStatus("Match three or more bubbles of the same color.");
      },
      onAction: function onAction(action, active) {
        if (action === "fire" && active) {
          fireShot();
        }
      },
      update: function update(dt) {
        if (runtime.actions.left) {
          state.angle -= 2.4 * dt;
        }
        if (runtime.actions.right) {
          state.angle += 2.4 * dt;
        }
        state.angle = clamp(state.angle, -2.6, -0.54);
        if (!state.shot) {
          return;
        }
        state.shot.x += state.shot.vx * dt;
        state.shot.y += state.shot.vy * dt;
        if (state.shot.x < state.originX + state.radius || state.shot.x > state.originX + state.cols * state.cell - state.radius) {
          state.shot.vx *= -1;
        }
        if (state.shot.y <= state.originY + state.radius) {
          attachShot();
          return;
        }
        for (let row = 0; row < state.rows; row += 1) {
          for (let col = 0; col < state.cols; col += 1) {
            if (!state.board[row][col]) {
              continue;
            }
            const center = cellCenter(row, col);
            if (distance(center.x, center.y, state.shot.x, state.shot.y) <= state.radius * 2 - 2) {
              attachShot();
              return;
            }
          }
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#10243a", "#19486d");
        for (let row = 0; row < state.rows; row += 1) {
          for (let col = 0; col < state.cols; col += 1) {
            if (!state.board[row][col]) {
              continue;
            }
            const center = cellCenter(row, col);
            ctx.beginPath();
            ctx.fillStyle = state.board[row][col];
            ctx.arc(center.x, center.y, state.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(360, 654);
        ctx.lineTo(360 + Math.cos(state.angle) * 110, 654 + Math.sin(state.angle) * 110);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = state.currentColor || palette[0];
        ctx.arc(360, 654, state.radius, 0, Math.PI * 2);
        ctx.fill();
        if (state.shot) {
          ctx.beginPath();
          ctx.fillStyle = state.shot.color;
          ctx.arc(state.shot.x, state.shot.y, state.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      syncHud: function syncHud() {
        const bubbles = state.board.flat().filter(Boolean).length;
        runtime.setMetrics([
          { label: "Score", value: state.score || 0 },
          { label: "Bubbles", value: bubbles },
          { label: "Shots", value: state.shots || 0 },
          { label: "Best", value: state.best || 0 }
        ]);
        runtime.setStatus("Aim for matching clusters.");
      }
    };
  }

  function createMatchThree(runtime, meta) {
    meta.controls = [
      { label: "Swap", text: "Tap one gem, then tap an adjacent gem to swap." },
      { label: "Score", text: "Only swaps that create a match count." },
      { label: "Round", text: "You have thirty moves to build the highest score you can." }
    ];
    meta.touch = [];
    meta.touchNote = "Tap one gem, then an adjacent gem.";

    const colors = ["#36d4ff", "#ff5f5f", "#ffcf47", "#7ef5d7", "#8a6dff", "#ff8d43"];
    const state = {
      size: 8,
      cell: 68,
      originX: 88,
      originY: 88
    };

    function randomGem() {
      return randInt(1, colors.length);
    }

    function createBoard() {
      const board = Array.from({ length: state.size }, function () {
        return Array.from({ length: state.size }, function () {
          return randomGem();
        });
      });
      while (findMatches(board).length) {
        for (let row = 0; row < state.size; row += 1) {
          for (let col = 0; col < state.size; col += 1) {
            if (findMatches(board).some(function (spot) { return spot.row === row && spot.col === col; })) {
              board[row][col] = randomGem();
            }
          }
        }
      }
      return board;
    }

    function findMatches(board) {
      const matches = [];
      for (let row = 0; row < state.size; row += 1) {
        let run = 1;
        for (let col = 1; col <= state.size; col += 1) {
          if (col < state.size && board[row][col] === board[row][col - 1]) {
            run += 1;
          } else {
            if (run >= 3 && board[row][col - 1]) {
              for (let offset = 0; offset < run; offset += 1) {
                matches.push({ row: row, col: col - 1 - offset });
              }
            }
            run = 1;
          }
        }
      }
      for (let col = 0; col < state.size; col += 1) {
        let run = 1;
        for (let row = 1; row <= state.size; row += 1) {
          if (row < state.size && board[row][col] === board[row - 1][col]) {
            run += 1;
          } else {
            if (run >= 3 && board[row - 1][col]) {
              for (let offset = 0; offset < run; offset += 1) {
                matches.push({ row: row - 1 - offset, col: col });
              }
            }
            run = 1;
          }
        }
      }
      const seen = new Set();
      return matches.filter(function (spot) {
        const key = spot.row + ":" + spot.col;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }

    function refillBoard() {
      for (let col = 0; col < state.size; col += 1) {
        const values = [];
        for (let row = state.size - 1; row >= 0; row -= 1) {
          if (state.board[row][col]) {
            values.push(state.board[row][col]);
          }
        }
        while (values.length < state.size) {
          values.push(randomGem());
        }
        for (let row = state.size - 1; row >= 0; row -= 1) {
          state.board[row][col] = values[state.size - 1 - row];
        }
      }
    }

    function resolveMatches() {
      let combo = 0;
      let matches = findMatches(state.board);
      while (matches.length) {
        combo += 1;
        matches.forEach(function (spot) {
          state.board[spot.row][spot.col] = 0;
        });
        state.score += matches.length * 30 * combo;
        refillBoard();
        matches = findMatches(state.board);
      }
      state.combo = combo;
      state.best = Math.max(state.best, state.score);
      runtime.writeNumber("best", state.best);
    }

    function swap(a, b) {
      const temp = state.board[a.row][a.col];
      state.board[a.row][a.col] = state.board[b.row][b.col];
      state.board[b.row][b.col] = temp;
    }

    return {
      reset: function reset() {
        state.board = createBoard();
        state.selected = null;
        state.moves = mapSetting(runtime, "pace", { relaxed: 40, classic: 30, turbo: 20 }, "classic");
        state.score = 0;
        state.combo = 0;
        state.best = runtime.readNumber("best", 0);
        runtime.setStatus("Build matches with every swap.");
      },
      onPointer: function onPointer(point) {
        if (state.moves <= 0 || runtime.ended) {
          return;
        }
        const cell = gridCellFromPoint(point, state.originX, state.originY, state.cell, state.size, state.size);
        if (!cell) {
          return;
        }
        if (!state.selected) {
          state.selected = cell;
          return;
        }
        const adjacent = Math.abs(state.selected.row - cell.row) + Math.abs(state.selected.col - cell.col) === 1;
        if (!adjacent) {
          state.selected = cell;
          return;
        }
        swap(state.selected, cell);
        if (!findMatches(state.board).length) {
          swap(state.selected, cell);
          state.selected = null;
          return;
        }
        state.moves -= 1;
        resolveMatches();
        state.selected = null;
        if (state.moves <= 0) {
          runtime.finish("Moves Spent", "Your match-three round is complete.");
          runtime.setStatus("Match-3 over.");
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#2d1433", "#582c65");
        for (let row = 0; row < state.size; row += 1) {
          for (let col = 0; col < state.size; col += 1) {
            const x = state.originX + col * state.cell + 4;
            const y = state.originY + row * state.cell + 4;
            roundRect(ctx, x, y, state.cell - 8, state.cell - 8, 16, "rgba(255,255,255,0.06)");
            ctx.beginPath();
            ctx.fillStyle = colors[(state.board[row][col] || 1) - 1];
            ctx.arc(x + (state.cell - 8) / 2, y + (state.cell - 8) / 2, 22, 0, Math.PI * 2);
            ctx.fill();
            if (state.selected && state.selected.row === row && state.selected.col === col) {
              ctx.strokeStyle = "#f6f0d6";
              ctx.lineWidth = 4;
              roundRect(ctx, x + 2, y + 2, state.cell - 12, state.cell - 12, 14, null, "#f6f0d6");
            }
          }
        }
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "Score", value: state.score || 0 },
          { label: "Moves", value: state.moves || 0 },
          { label: "Combo", value: state.combo || 0 },
          { label: "Best", value: state.best || 0 }
        ]);
        runtime.setStatus("Selected: " + (state.selected ? state.selected.row + 1 + "," + (state.selected.col + 1) : "none"));
      }
    };
  }

  function createMastermind(runtime, meta) {
    meta.controls = [
      { label: "Pick", text: "Tap a slot, then choose a color from the palette." },
      { label: "Submit", text: "When a row is full, submit it to get exact and partial clues." },
      { label: "Goal", text: "Crack the four-color code within eight guesses." }
    ];
    meta.keyMap = {
      "1": "color0",
      "2": "color1",
      "3": "color2",
      "4": "color3",
      "5": "color4",
      "6": "color5",
      enter: "submit",
      backspace: "clear"
    };
    meta.touch = [];
    meta.touchNote = "Tap the slots and palette directly on the board.";

    const colors = ["#36d4ff", "#ff5f5f", "#ffcf47", "#7ef5d7", "#8a6dff", "#ff8d43"];
    const state = {};

    function buildSecret() {
      const uniqueOnly = getDifficultyValue(runtime) === "easy";
      const secret = [];
      while (secret.length < 4) {
        const color = randInt(0, colors.length - 1);
        if (uniqueOnly && secret.indexOf(color) !== -1) {
          continue;
        }
        secret.push(color);
      }
      return secret;
    }

    function scoreGuess(guess) {
      let exact = 0;
      const secretRemainder = [];
      const guessRemainder = [];
      for (let index = 0; index < 4; index += 1) {
        if (guess[index] === state.secret[index]) {
          exact += 1;
        } else {
          secretRemainder.push(state.secret[index]);
          guessRemainder.push(guess[index]);
        }
      }
      let partial = 0;
      guessRemainder.forEach(function (color) {
        const foundIndex = secretRemainder.indexOf(color);
        if (foundIndex !== -1) {
          partial += 1;
          secretRemainder.splice(foundIndex, 1);
        }
      });
      return { exact: exact, partial: partial };
    }

    function submitRow() {
      if (state.current.some(function (value) { return value === null; })) {
        return;
      }
      const result = scoreGuess(state.current);
      state.lastHint = result.exact + "|" + result.partial;
      state.guesses.push({ values: state.current.slice(), exact: result.exact, partial: result.partial });
      if (result.exact === 4) {
        state.wins += 1;
        runtime.writeNumber("wins", state.wins);
        runtime.finish("Code Cracked", "You solved the sequence in " + state.guesses.length + " rows.");
        runtime.setStatus("Mastermind won.");
        return;
      }
      if (state.guesses.length >= state.maxRows) {
        runtime.finish("Code Locked", "The hidden code got away this round.");
        runtime.setStatus("Mastermind lost.");
        return;
      }
      state.current = [null, null, null, null];
      state.selectedSlot = 0;
    }

    function assignColor(index) {
      if (state.selectedSlot < 0 || state.selectedSlot > 3) {
        return;
      }
      state.current[state.selectedSlot] = index;
      state.selectedSlot = (state.selectedSlot + 1) % 4;
    }

    return {
      reset: function reset() {
        state.secret = buildSecret();
        state.guesses = [];
        state.current = [null, null, null, null];
        state.selectedSlot = 0;
        state.lastHint = "-";
        state.maxRows = mapSetting(runtime, "assist", { forgiving: 10, balanced: 8, pure: 6 }, "balanced");
        state.wins = runtime.readNumber("wins", 0);
        if (isForgiving(runtime)) {
          state.lastHint = "peg 1 = " + (state.secret[0] + 1);
        }
        runtime.setStatus("Work from the clues and eliminate bad placements.");
      },
      onAction: function onAction(action, active) {
        if (!active) {
          return;
        }
        if (action.indexOf("color") === 0) {
          assignColor(Number(action.replace("color", "")));
        }
        if (action === "submit") {
          submitRow();
        }
        if (action === "clear") {
          state.current[state.selectedSlot] = null;
        }
      },
      onPointer: function onPointer(point) {
        const rowY = 120 + state.guesses.length * 54;
        for (let slot = 0; slot < 4; slot += 1) {
          const x = 128 + slot * 86;
          if (point.x >= x && point.x <= x + 54 && point.y >= rowY && point.y <= rowY + 54) {
            state.selectedSlot = slot;
            return;
          }
        }
        for (let index = 0; index < colors.length; index += 1) {
          const x = 100 + index * 86;
          const y = 610;
          if (distance(point.x, point.y, x + 22, y + 22) <= 28) {
            assignColor(index);
            return;
          }
        }
        if (point.x >= 540 && point.x <= 650 && point.y >= 600 && point.y <= 646) {
          submitRow();
        }
        if (point.x >= 540 && point.x <= 650 && point.y >= 654 && point.y <= 700) {
          state.current = [null, null, null, null];
        }
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#161a31", "#34407d");
        for (let row = 0; row < 8; row += 1) {
          const y = 120 + row * 54;
          roundRect(ctx, 96, y, 528, 46, 14, "rgba(255,255,255,0.06)");
          for (let slot = 0; slot < 4; slot += 1) {
            const x = 128 + slot * 86;
            ctx.beginPath();
            ctx.fillStyle = "#0e1427";
            ctx.arc(x + 22, y + 23, 20, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        state.guesses.forEach(function (guess, row) {
          const y = 120 + row * 54;
          guess.values.forEach(function (value, slot) {
            const x = 128 + slot * 86;
            ctx.beginPath();
            ctx.fillStyle = colors[value];
            ctx.arc(x + 22, y + 23, 20, 0, Math.PI * 2);
            ctx.fill();
          });
          drawLabel(ctx, guess.exact + " exact / " + guess.partial + " near", 490, y + 23, 16, "#f6f0d6");
        });

        const currentY = 120 + state.guesses.length * 54;
        state.current.forEach(function (value, slot) {
          if (value === null) {
            return;
          }
          const x = 128 + slot * 86;
          ctx.beginPath();
          ctx.fillStyle = colors[value];
          ctx.arc(x + 22, currentY + 23, 20, 0, Math.PI * 2);
          ctx.fill();
          if (slot === state.selectedSlot) {
            ctx.strokeStyle = "#f6f0d6";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x + 22, currentY + 23, 25, 0, Math.PI * 2);
            ctx.stroke();
          }
        });

        colors.forEach(function (color, index) {
          const x = 100 + index * 86;
          const y = 610;
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.arc(x + 22, y + 22, 22, 0, Math.PI * 2);
          ctx.fill();
          drawCenteredText(ctx, String(index + 1), x + 22, y + 58, 16, "#f6f0d6", "900");
        });

        roundRect(ctx, 540, 600, 110, 46, 14, "#36d4ff");
        roundRect(ctx, 540, 654, 110, 46, 14, "#ff8d43");
        drawCenteredText(ctx, "Submit", 595, 623, 18, "#071425", "900");
        drawCenteredText(ctx, "Clear", 595, 677, 18, "#071425", "900");
      },
      syncHud: function syncHud() {
        const filled = state.current.filter(function (value) { return value !== null; }).length;
        runtime.setMetrics([
          { label: "Row", value: state.guesses.length + 1 },
          { label: "Filled", value: filled },
          { label: "Hint", value: state.lastHint || "-" },
          { label: "Rows", value: state.maxRows || 0 }
        ]);
        runtime.setStatus("Current row: " + (state.guesses.length + 1) + " of " + state.maxRows + ".");
      }
    };
  }

  function createTargetGallery(runtime, meta) {
    meta.controls = [
      { label: "Shoot", text: "Tap moving targets directly on the board." },
      { label: "Score", text: "Smaller and faster targets are worth more points." },
      { label: "Round", text: "Hold your nerve before the timer or miss limit runs out." }
    ];
    meta.touch = [];
    meta.touchNote = "Tap the targets directly on the gallery board.";

    const state = {};
    const lanes = [160, 250, 340, 430, 520];

    function spawnTarget() {
      const lane = pick(lanes);
      const speed = rand(120, 260) * mapSetting(runtime, "difficulty", { easy: 0.85, normal: 1, hard: 1.22 }, "normal");
      const fromLeft = Math.random() < 0.5;
      const radius = randInt(18, 28);
      state.targets.push({
        x: fromLeft ? -40 : BOARD_SIZE + 40,
        y: lane,
        vx: fromLeft ? speed : -speed,
        r: radius,
        points: radius < 22 ? 25 : 15
      });
    }

    return {
      reset: function reset() {
        state.targets = [];
        state.spawnTimer = 0.6;
        state.score = 0;
        state.misses = 0;
        state.best = runtime.readNumber("best", 0);
        state.missLimit = mapSetting(runtime, "assist", { forgiving: 14, balanced: 10, pure: 7 }, "balanced");
        state.timeLeft = mapSetting(runtime, "pace", { relaxed: 60, classic: 45, turbo: 30 }, "classic");
        runtime.setStatus("Tap the moving targets before they slip by.");
      },
      onPointer: function onPointer(point) {
        for (let index = 0; index < state.targets.length; index += 1) {
          const target = state.targets[index];
          if (distance(point.x, point.y, target.x, target.y) <= target.r) {
            state.score += target.points;
            state.best = Math.max(state.best, state.score);
            runtime.writeNumber("best", state.best);
            state.targets.splice(index, 1);
            return;
          }
        }
        state.misses += 1;
      },
      update: function update(dt) {
        state.timeLeft = Math.max(0, state.timeLeft - dt);
        if (state.timeLeft <= 0 || state.misses >= state.missLimit) {
          runtime.finish("Gallery Closed", "The target round is over.");
          runtime.setStatus("Target gallery complete.");
          return;
        }
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          spawnTarget();
          state.spawnTimer = rand(0.35, 0.75);
        }
        state.targets.forEach(function (target) {
          target.x += target.vx * dt;
        });
        state.targets = state.targets.filter(function (target) {
          const onScreen = target.x > -80 && target.x < BOARD_SIZE + 80;
          if (!onScreen) {
            state.misses += 1;
          }
          return onScreen;
        });
      },
      render: function render(ctx) {
        paintBackdrop(ctx, "#1d2230", "#4f4a27");
        lanes.forEach(function (lane, index) {
          roundRect(ctx, 40, lane - 30, BOARD_SIZE - 80, 52, 26, index % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)");
        });
        state.targets.forEach(function (target) {
          ctx.beginPath();
          ctx.fillStyle = "#ff5f5f";
          ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.fillStyle = "#f6f0d6";
          ctx.arc(target.x, target.y, target.r * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.fillStyle = "#36d4ff";
          ctx.arc(target.x, target.y, target.r * 0.22, 0, Math.PI * 2);
          ctx.fill();
        });
      },
      syncHud: function syncHud() {
        runtime.setMetrics([
          { label: "Score", value: state.score || 0 },
          { label: "Misses", value: state.misses || 0 },
          { label: "Time", value: Math.ceil(state.timeLeft || 0) },
          { label: "Cap", value: state.missLimit || 0 }
        ]);
        runtime.setStatus((state.missLimit || 0) + " misses ends the round.");
      }
    };
  }

  window.ClassicGamesHubArcade = {
    getGames: function getGames() {
      return GAME_DEFS.slice();
    },
    renderLibrary: renderLibrary,
    initCabinet: initCabinet
  };
})();
