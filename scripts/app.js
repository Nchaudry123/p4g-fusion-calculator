const RESIST_LABELS = ["Phy", "Fire", "Ice", "Elec", "Wind", "Light", "Dark", "Alm"];
const STAT_LABELS = ["St", "Ma", "En", "Ag", "Lu"];
const INTRO_SEEN_KEY = "p4g-fusion-intro-seen";
const USER_DATA_KEY = "p4g-fusion-user-levels";
const ARCANA_CARD_IMAGES = {
  Fool: "fool",
  Magician: "magician",
  Priestess: "priestess",
  Empress: "empress",
  Emperor: "emperor",
  Hierophant: "hierophant",
  Lovers: "lovers",
  Chariot: "chariot",
  Justice: "justice",
  Hermit: "hermit",
  Fortune: "fortune",
  Strength: "strength",
  Hanged: "hanged",
  Death: "death",
  Temperance: "temperance",
  Devil: "devil",
  Tower: "tower",
  Star: "star",
  Moon: "moon",
  Sun: "sun",
  Judgement: "judgement",
  World: "world",
  Aeon: "extra-22",
  Jester: "extra-23"
};
const SOCIAL_LINK_UNLOCKS = {
  Loki: "Fool",
  Mada: "Magician",
  Scathach: "Priestess",
  Isis: "Empress",
  Odin: "Emperor",
  Kohryu: "Hierophant",
  Ishtar: "Lovers",
  Futsunushi: "Chariot",
  Sraosha: "Justice",
  "Ongyo-Ki": "Hermit",
  Norn: "Fortune",
  "Zaou-Gongen": "Strength",
  Attis: "Hanged",
  Mahakala: "Death",
  Vishnu: "Temperance",
  Beelzebub: "Devil",
  Shiva: "Tower",
  Helel: "Star",
  Sandalphon: "Moon",
  Asura: "Sun",
  Lucifer: "Judgement",
  Kaguya: "Aeon",
  "Magatsu-Izanagi": "Jester"
};
const MARGARET_REQUESTS = {
  "Ippon-Datara": { rank: 2, skill: "Sukukaja" },
  Matador: { rank: 3, skill: "Mahama" },
  Gdon: { rank: 4, skill: "Rampage" },
  "Neko Shogun": { rank: 5, skill: "Bufula" },
  "Black Frost": { rank: 6, skill: "Auto-Sukukaja" },
  Yatagarasu: { rank: 7, skill: "Megido" },
  Yatsufusa: { rank: 8, skill: "Mediarama" },
  Ganesha: { rank: 9, skill: "Tetrakarn" },
  Trumpeter: { rank: 10, skill: "Mind Charge" }
};
const state = {
  personas: {},
  names: [],
  arcanas: [],
  raceLevels: new Map(),
  fissionChart: {},
  specialRecipes: {},
  personaImages: {},
  skills: {},
  active: "",
  queue: [],
  selectedRecipe: null,
  userLevels: {},
  ownedPersonas: new Set(),
  logQuery: "",
  logArcana: "All",
  logOwnedFilter: "all",
  useCurrentLevels: false,
  activeCalculatorTab: "search",
  drawTimer: 0,
  searchTimer: 0
};

const $ = (selector) => document.querySelector(selector);

setupIntro();
setupInstallSupport();

Promise.all([
  fetch("data/personas.json").then((res) => res.json()),
  fetch("data/fusion-chart.json").then((res) => res.json()),
  fetch("data/special-recipes.json").then((res) => res.json()),
  fetch("data/persona-images.json").then((res) => res.json()),
  fetch("data/skills.json").then((res) => res.json())
]).then(([personas, chart, specialRecipes, personaImages, skills]) => {
  state.personas = normalizePersonas(personas);
  state.names = Object.keys(state.personas).sort((a, b) => a.localeCompare(b));
  state.arcanas = [...new Set(Object.values(state.personas).map((persona) => persona.race))].sort((a, b) => a.localeCompare(b));
  state.fissionChart = buildFissionChart(chart);
  state.specialRecipes = specialRecipes;
  state.personaImages = personaImages;
  state.skills = skills;
  loadUserData();
  buildRaceLevels();
  setupSearch();
  setupUserData();
  setupCalculatorTabs();
  renderInitialState();
}).catch((error) => {
  $("#recipes").innerHTML = `<div class="empty">Could not load fusion data: ${escapeHtml(error.message)}</div>`;
});

function setupInstallSupport() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Install support is progressive enhancement.
    });
  });
}

function normalizePersonas(raw) {
  return Object.fromEntries(Object.entries(raw).map(([name, persona]) => [
    name,
    { ...persona, name, race: persona.race === "Hang" ? "Hanged" : persona.race }
  ]));
}

function buildFissionChart(chart) {
  const fissions = {};
  const { races, table } = chart;

  for (let row = 0; row < table.length; row++) {
    const raceA = races[row];
    for (let col = 0; col < table[row].length; col++) {
      const raceB = races[col];
      const resultRace = table[row][col] === "Hang" ? "Hanged" : table[row][col];
      if (!resultRace || resultRace === "-") continue;
      fissions[resultRace] ||= {};
      fissions[resultRace][raceA] ||= new Set();
      fissions[resultRace][raceA].add(raceB);
      fissions[resultRace][raceB] ||= new Set();
      fissions[resultRace][raceB].add(raceA);
    }
  }

  return Object.fromEntries(Object.entries(fissions).map(([race, row]) => [
    race,
    Object.fromEntries(Object.entries(row).map(([raceA, raceBs]) => [raceA, [...raceBs]]))
  ]));
}

function buildRaceLevels() {
  for (const persona of Object.values(state.personas)) {
    if (!state.raceLevels.has(persona.race)) state.raceLevels.set(persona.race, []);
    state.raceLevels.get(persona.race).push(persona.lvl);
  }

  for (const [race, levels] of state.raceLevels) {
    const unique = [...new Set(levels)].sort((a, b) => a - b);
    state.raceLevels.set(race, unique);
  }
}

function setupSearch() {
  $("#selectSearch").addEventListener("click", () => selectPersonaFromInput());
  $("#personaSearch").addEventListener("input", () => handleSearchInput($("#personaSearch").value));
  $("#personaSearch").addEventListener("focus", () => handleSearchInput($("#personaSearch").value));
  $("#personaSearch").addEventListener("keydown", (event) => {
    if (event.key === "Enter") selectPersonaFromInput();
    if (event.key === "Escape") clearSuggestions();
  });
  $("#clearQueue").addEventListener("click", () => {
    state.queue = [];
    renderQueue();
  });
}

function setupUserData() {
  $("#baseLevelMode").addEventListener("click", () => setLevelMode(false));
  $("#currentLevelMode").addEventListener("click", () => setLevelMode(true));
  $("#saveLevelData").addEventListener("click", saveLevelFromEditor);
  $("#levelPersonaInput").addEventListener("input", syncLevelEditor);
  $("#levelPersonaInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveLevelFromEditor();
  });
  $("#levelValueInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveLevelFromEditor();
  });
  $("#personaLevelList").innerHTML = state.names.map((name) => `<option value="${escapeAttr(name)}"></option>`).join("");
  $("#personaLogArcana").innerHTML = [
    `<option value="All">All Arcana</option>`,
    ...state.arcanas.map((arcana) => `<option value="${escapeAttr(arcana)}">${escapeHtml(arcana)}</option>`)
  ].join("");
  $("#personaLogSearch").addEventListener("input", (event) => {
    state.logQuery = event.target.value;
    renderPersonaLog();
  });
  $("#personaLogArcana").addEventListener("change", (event) => {
    state.logArcana = event.target.value;
    renderPersonaLog();
  });
  document.querySelectorAll("[data-owned-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.logOwnedFilter = button.dataset.ownedFilter;
      renderPersonaLog();
    });
  });
  renderLevelData();
  renderPersonaLog();
}

function setupCalculatorTabs() {
  const tabs = [...document.querySelectorAll("[data-calculator-tab]")];
  tabs.forEach((button, index) => {
    button.addEventListener("click", () => setCalculatorTab(button.dataset.calculatorTab));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + direction + tabs.length) % tabs.length;
      setCalculatorTab(tabs[nextIndex].dataset.calculatorTab);
      tabs[nextIndex].focus();
    });
  });

  setCalculatorTab(state.activeCalculatorTab);
}

function setCalculatorTab(tab) {
  const nextTab = tab === "player" ? "player" : "search";
  state.activeCalculatorTab = nextTab;
  document.querySelectorAll("[data-calculator-tab]").forEach((button) => {
    const isActive = button.dataset.calculatorTab === nextTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
  document.querySelectorAll("[data-calculator-panel]").forEach((panel) => {
    const isActive = panel.dataset.calculatorPanel === nextTab;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function loadUserData() {
  try {
    const saved = JSON.parse(localStorage.getItem(USER_DATA_KEY) || "{}");
    state.userLevels = sanitizeUserLevels(saved.levels || {});
    state.ownedPersonas = new Set((saved.owned || []).filter((name) => state.personas[name]));
    state.useCurrentLevels = Boolean(saved.useCurrentLevels);
  } catch {
    state.userLevels = {};
    state.ownedPersonas = new Set();
    state.useCurrentLevels = false;
  }
}

function persistUserData() {
  try {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify({
      useCurrentLevels: state.useCurrentLevels,
      levels: state.userLevels,
      owned: [...state.ownedPersonas].sort((a, b) => a.localeCompare(b))
    }));
  } catch {
    // The calculator still works if storage is unavailable.
  }
}

function sanitizeUserLevels(levels) {
  return Object.fromEntries(Object.entries(levels)
    .filter(([name]) => state.personas[name])
    .map(([name, level]) => [name, clampLevel(level, state.personas[name].lvl)]));
}

function clampLevel(level, fallback = 1) {
  const numeric = Number(level);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(99, Math.round(numeric)));
}

function setLevelMode(useCurrentLevels) {
  state.useCurrentLevels = useCurrentLevels;
  persistUserData();
  renderLevelData();
  refreshActiveViews();
}

function syncLevelEditor() {
  const value = $("#levelPersonaInput").value.trim().toLowerCase();
  const name = state.names.find((personaName) => personaName.toLowerCase() === value);
  if (!name) return;
  populatePersonaLogEditor(name);
}

function saveLevelFromEditor() {
  const name = findPersona($("#levelPersonaInput").value);
  if (!name) {
    $("#levelPersonaInput").setCustomValidity("Choose a Persona from the list.");
    $("#levelPersonaInput").reportValidity();
    return;
  }

  $("#levelPersonaInput").setCustomValidity("");
  const baseLevel = state.personas[name].lvl;
  const currentLevel = clampLevel($("#levelValueInput").value, baseLevel);
  if (currentLevel <= baseLevel) {
    delete state.userLevels[name];
  } else {
    state.userLevels[name] = currentLevel;
  }
  setPersonaOwned(name, $("#ownedPersonaInput").checked);
  state.useCurrentLevels = true;
  persistUserData();
  renderLevelData();
  renderPersonaLog();
  refreshActiveViews();
}

function removeUserLevel(name) {
  delete state.userLevels[name];
  persistUserData();
  renderLevelData();
  renderPersonaLog();
  refreshActiveViews();
}

function populatePersonaLogEditor(name) {
  const persona = state.personas[name];
  if (!persona) return;
  $("#levelPersonaInput").value = name;
  $("#levelValueInput").value = state.userLevels[name] || persona.lvl;
  $("#ownedPersonaInput").checked = state.ownedPersonas.has(name);
}

function setPersonaOwned(name, owned) {
  if (owned) {
    state.ownedPersonas.add(name);
  } else {
    state.ownedPersonas.delete(name);
  }
}

function togglePersonaOwned(name) {
  setPersonaOwned(name, !state.ownedPersonas.has(name));
  persistUserData();
  renderLevelData();
  renderPersonaLog();
  refreshActiveViews();
}

function viewLogPersona(name) {
  populatePersonaLogEditor(name);
  setCalculatorTab("search");
  selectPersona(name, true);
}

function renderLevelData() {
  $("#baseLevelMode").classList.toggle("is-active", !state.useCurrentLevels);
  $("#currentLevelMode").classList.toggle("is-active", state.useCurrentLevels);

  const entries = Object.entries(state.userLevels)
    .filter(([name]) => state.personas[name])
    .sort((a, b) => a[0].localeCompare(b[0]));
  const ownedCount = state.ownedPersonas.size;
  const modeCopy = state.useCurrentLevels
    ? "Recipes are checking your saved current levels."
    : "Recipes are using Persona base levels.";
  const chips = entries.length
    ? entries.map(([name, level]) => `
      <button class="level-chip" type="button" data-remove-level="${escapeAttr(name)}" title="Remove saved level for ${escapeAttr(name)}">
        <strong>${escapeHtml(name)}</strong>
        <span>Lv ${level}</span>
        <em>base ${state.personas[name].lvl}</em>
      </button>
    `).join("")
    : `<span class="level-empty">No custom levels saved yet.</span>`;

  $("#levelDataSummary").innerHTML = `
    <div class="level-mode-copy">${escapeHtml(modeCopy)}</div>
    <div class="level-mode-copy">${ownedCount} owned / ${entries.length} custom levels saved</div>
    <div class="level-chip-row">${chips}</div>
  `;
  $("#levelDataSummary").querySelectorAll("[data-remove-level]").forEach((button) => {
    button.addEventListener("click", () => removeUserLevel(button.dataset.removeLevel));
  });
}

function renderPersonaLog() {
  const query = state.logQuery.trim().toLowerCase();
  const cards = Object.values(state.personas)
    .filter((persona) => !query || persona.name.toLowerCase().includes(query) || persona.race.toLowerCase().includes(query))
    .filter((persona) => state.logArcana === "All" || persona.race === state.logArcana)
    .filter((persona) => {
      if (state.logOwnedFilter === "owned") return state.ownedPersonas.has(persona.name);
      if (state.logOwnedFilter === "missing") return !state.ownedPersonas.has(persona.name);
      return true;
    })
    .sort((a, b) => a.race.localeCompare(b.race) || getPersonaLevel(a.name) - getPersonaLevel(b.name) || a.name.localeCompare(b.name));
  const ownedCount = state.ownedPersonas.size;
  const customCount = Object.keys(state.userLevels).length;

  document.querySelectorAll("[data-owned-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.ownedFilter === state.logOwnedFilter);
  });
  $("#personaLogStats").innerHTML = `
    <span><strong>${ownedCount}</strong> owned</span>
    <span><strong>${state.names.length - ownedCount}</strong> missing</span>
    <span><strong>${customCount}</strong> leveled</span>
    <span><strong>${cards.length}</strong> shown</span>
  `;
  $("#personaLogList").innerHTML = cards.length
    ? cards.slice(0, 80).map(renderPersonaLogCard).join("")
    : `<div class="empty mini-empty">No Personas match this log filter.</div>`;
  $("#personaLogList").querySelectorAll("[data-log-view]").forEach((button) => {
    button.addEventListener("click", () => viewLogPersona(button.dataset.logView));
  });
  $("#personaLogList").querySelectorAll("[data-log-owned]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePersonaOwned(button.dataset.logOwned);
    });
  });
}

function renderPersonaLogCard(persona) {
  const owned = state.ownedPersonas.has(persona.name);
  const customLevel = state.userLevels[persona.name];
  return `
    <article class="persona-log-card ${owned ? "is-owned" : ""}">
      <button class="persona-log-main" type="button" data-log-view="${escapeAttr(persona.name)}">
        <img src="${escapeAttr(personaImage(persona.name))}" alt="" loading="lazy">
        <span>
          <strong>${escapeHtml(persona.name)}</strong>
          <em>${escapeHtml(levelLabel(persona.name))} / ${escapeHtml(persona.race)}${customLevel ? ` / base ${persona.lvl}` : ""}</em>
        </span>
      </button>
      <button class="owned-state ${owned ? "is-owned" : ""}" type="button" data-log-owned="${escapeAttr(persona.name)}">
        ${owned ? "Owned" : "Missing"}
      </button>
    </article>
  `;
}

function refreshActiveViews() {
  if (state.active) {
    renderActivePersona();
    renderRecipes();
  }
  renderQueue();
}

function setupIntro() {
  const intro = $("#introScreen");
  const enter = $("#introEnter");
  if (!intro || !enter) return;

  const dismissIntro = () => {
    intro.classList.add("is-leaving");
    document.body.classList.remove("intro-active");
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "true");
    } catch {
      // Session storage is a convenience only.
    }
    window.setTimeout(() => {
      intro.hidden = true;
    }, 620);
  };

  try {
    if (sessionStorage.getItem(INTRO_SEEN_KEY) === "true") {
      intro.hidden = true;
      document.body.classList.remove("intro-active");
      return;
    }
  } catch {
    // Keep showing the intro if storage is unavailable.
  }

  enter.addEventListener("click", dismissIntro);
  window.addEventListener("keydown", (event) => {
    if (intro.hidden) return;
    if (event.key === "Enter" || event.key === "Escape") dismissIntro();
  });
  window.setTimeout(() => enter.focus({ preventScroll: true }), 1600);
}

function renderInitialState() {
  $("#personaSearch").value = "";
  $("#activePersona").innerHTML = `<div class="empty">Search a Persona or Arcana to begin planning a fusion.</div>`;
  $("#recipeSummary").innerHTML = "";
  $("#recipes").innerHTML = "";
  $("#deckStage").className = "deck-stage";
  $("#deckStage").innerHTML = "";
  renderQueue();
}

function handleSearchInput(value) {
  renderSuggestions(value);
  playDeckSearch(value);
}

function selectPersonaFromInput() {
  const input = $("#personaSearch");
  const match = findPersona(input.value);
  if (!match) {
    const arcana = findArcana(input.value);
    if (arcana) {
      input.setCustomValidity("");
      renderSuggestions(arcana, true);
      return;
    }
    input.setCustomValidity("Choose a Persona from the list.");
    input.reportValidity();
    return;
  }
  input.setCustomValidity("");
  selectPersona(match, true);
}

function findPersona(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  return state.names.find((name) => name.toLowerCase() === normalized)
    || state.names.find((name) => name.toLowerCase().includes(normalized));
}

function findArcana(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  return state.arcanas.find((arcana) => arcana.toLowerCase() === normalized)
    || state.arcanas.find((arcana) => arcana.toLowerCase().includes(normalized));
}

function renderSuggestions(value, forceArcana = false) {
  const tray = $("#suggestions");
  const query = value.trim().toLowerCase();
  if (!query) {
    clearSuggestions();
    return;
  }

  const arcana = findArcana(value);
  const personaMatches = state.names
    .filter((name) => name.toLowerCase().includes(query))
    .slice(0, arcana && !forceArcana ? 6 : 12);
  const arcanaMatches = arcana
    ? Object.values(state.personas)
      .filter((persona) => persona.race === arcana)
      .sort((a, b) => a.lvl - b.lvl || a.name.localeCompare(b.name))
    : [];
  const cards = forceArcana || (arcana && arcana.toLowerCase() === query)
    ? arcanaMatches
    : personaMatches.map((name) => state.personas[name]);

  if (!cards.length) {
    tray.innerHTML = `<div class="suggestion-empty">No Personas or Arcana matched.</div>`;
    tray.classList.add("is-open");
    return;
  }

  const title = forceArcana || (arcana && arcana.toLowerCase() === query)
    ? `${arcana} Arcana`
    : "Matching Personas";
  tray.innerHTML = `
    <div class="suggestion-title">${escapeHtml(title)}</div>
    <div class="suggestion-grid">
      ${cards.map((persona, index) => renderSuggestionCard(persona, index)).join("")}
    </div>
  `;
  tray.classList.add("is-open");
  tray.querySelectorAll("[data-suggest]").forEach((button) => {
    button.addEventListener("click", () => selectPersona(button.dataset.suggest, true));
  });
}

function renderSuggestionCard(persona, index) {
  return `
    <button class="suggestion-card" style="--i: ${index}" type="button" data-suggest="${escapeAttr(persona.name)}">
      <img src="${escapeAttr(personaImage(persona.name))}" alt="" loading="lazy">
      <span>
        <strong>${escapeHtml(persona.name)}</strong>
        <em>${escapeHtml(levelLabel(persona.name))} / ${escapeHtml(persona.race)}</em>
        ${renderPersonaBadges(persona.name, "mini")}
      </span>
    </button>
  `;
}

function clearSuggestions() {
  $("#suggestions").classList.remove("is-open");
  $("#suggestions").innerHTML = "";
}

function playDeckSearch(value) {
  const stage = $("#deckStage");
  const query = value.trim();
  if (!stage) return;

  clearTimeout(state.searchTimer);
  clearTimeout(state.drawTimer);
  if (!query) {
    stage.className = "deck-stage";
    stage.innerHTML = "";
    return;
  }

  const normalized = query.toLowerCase();
  const exactPersona = state.names.find((name) => name.toLowerCase() === normalized);
  const arcana = findArcana(query);
  const personaMatches = state.names
    .filter((name) => name.toLowerCase().includes(normalized))
    .slice(0, 7);
  const arcanaMatches = arcana
    ? Object.values(state.personas)
      .filter((persona) => persona.race === arcana)
      .sort((a, b) => a.lvl - b.lvl || a.name.localeCompare(b.name))
      .map((persona) => persona.name)
      .slice(0, 7)
    : [];
  const previewNames = exactPersona
    ? [exactPersona]
    : personaMatches.length
      ? personaMatches
      : arcanaMatches;
  const targetName = exactPersona || previewNames[0] || "";
  const target = state.personas[targetName];
  const deckNames = buildDeckNames(targetName, previewNames);
  const modeLabel = exactPersona
    ? "Exact Persona locked"
    : arcana && !personaMatches.length
      ? `${arcana} Arcana sweep`
      : "Searching the compendium";

  stage.innerHTML = `
    <div class="deck-copy">
      <span>Velvet deck</span>
      <strong>${escapeHtml(modeLabel)}</strong>
      <em>${target ? `Top draw: ${escapeHtml(target.name)} / ${escapeHtml(levelLabel(target.name))} ${escapeHtml(target.race)}` : `No draw yet for "${escapeHtml(query)}"`}</em>
    </div>
    <div class="draw-table" aria-hidden="true">
      ${deckNames.map((cardName, index) => renderDrawCard(cardName, index, deckNames.length, cardName === targetName && Boolean(targetName), "search")).join("")}
    </div>
    ${renderSelectedDraw(targetName, query, false)}
  `;
  stage.className = "deck-stage is-visible is-searching is-running";
  state.searchTimer = setTimeout(() => {
    stage.classList.remove("is-running");
  }, 850);
}

function playDeckDraw(name) {
  const stage = $("#deckStage");
  const target = state.personas[name];
  if (!stage || !target) return;

  clearTimeout(state.drawTimer);
  clearTimeout(state.searchTimer);
  const deckNames = buildDeckNames(name);

  stage.innerHTML = `
    <div class="deck-copy">
      <span>Selected draw</span>
      <strong>${escapeHtml(target.name)}</strong>
      <em>Priority ${state.queue.indexOf(name) + 1 || 1} / ${escapeHtml(levelLabel(target.name))} ${escapeHtml(target.race)}</em>
    </div>
    <div class="draw-table" aria-hidden="true">
      ${deckNames.map((cardName, index) => renderDrawCard(cardName, index, deckNames.length, cardName === name, "draw")).join("")}
    </div>
    ${renderSelectedDraw(name, target.name, true)}
  `;
  stage.className = "deck-stage is-visible is-chosen";
  void stage.offsetWidth;
  stage.classList.add("is-running");
  state.drawTimer = setTimeout(() => {
    stage.classList.remove("is-running");
  }, 2400);
}

function buildDeckNames(targetName, preferred = []) {
  const preferredSet = preferred.filter((name) => state.personas[name] && name !== targetName);
  const randomNames = state.names
    .filter((item) => item !== targetName && !preferredSet.includes(item))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(0, 7 - preferredSet.length));
  return preferredSet.concat(randomNames, targetName).filter(Boolean).slice(-8);
}

function renderDrawCard(cardName, index, total, isTarget, mode) {
  const persona = state.personas[cardName];
  if (!persona) return "";
  const rotation = (index - total / 2) * 5.5;
  return `
    <div class="draw-card ${isTarget ? "is-target" : ""}" data-mode="${mode}" style="--i: ${index}; --r: ${rotation}deg; --spread: ${index - (total - 1) / 2};">
      <img class="draw-persona" src="${escapeAttr(personaImage(cardName))}" alt="">
      <span class="card-corner">${escapeHtml(persona.race)}</span>
      <span class="card-name">${escapeHtml(cardName)}</span>
    </div>
  `;
}

function renderSelectedDraw(name, fallback, chosen) {
  const persona = state.personas[name];
  if (!persona) {
    return `
      <div class="selected-draw is-empty">
        <span>Input</span>
        <strong>${escapeHtml(fallback)}</strong>
        <em>Keep typing to reveal a matching Persona or Arcana.</em>
      </div>
    `;
  }

  return `
    <div class="selected-draw ${chosen ? "is-chosen" : ""}">
      <span>${chosen ? "Chosen card" : "Current draw"}</span>
      <div class="selected-card-stack" aria-hidden="true">
        <img class="selected-card-persona" src="${escapeAttr(personaImage(persona.name))}" alt="">
        <img class="selected-persona" src="${escapeAttr(personaImage(persona.name))}" alt="">
      </div>
      <strong>${escapeHtml(persona.name)}</strong>
      <em>${escapeHtml(levelLabel(persona.name))} / ${escapeHtml(persona.race)}</em>
    </div>
  `;
}

function selectPersona(name, primary = false, recipeContext = null) {
  state.active = name;
  $("#personaSearch").value = name;
  if (primary) {
    state.queue = [name];
    state.selectedRecipe = null;
  } else {
    if (recipeContext) state.selectedRecipe = recipeContext;
    addToQueue(name);
  }
  clearSuggestions();
  playDeckDraw(name);
  renderActivePersona();
  renderRecipes();
  renderQueue();
}

function viewPersona(name) {
  state.active = name;
  $("#personaSearch").value = name;
  renderActivePersona();
  renderRecipes();
  renderQueue();
}

function addToQueue(name) {
  if (!state.queue.includes(name)) state.queue.push(name);
}

function removeFromQueue(index) {
  state.queue.splice(index, 1);
  renderQueue();
}

function renderQueue() {
  const list = $("#queueList");
  if (!state.queue.length) {
    list.innerHTML = `<li class="empty">Search a Persona to set priority 1. Click recipe ingredients to append priority 2, 3, and beyond.</li>`;
    return;
  }

  list.innerHTML = state.queue.map((name, index) => {
    const persona = state.personas[name];
    return `
      <li class="queue-item">
        <span class="queue-rank">${index + 1}</span>
        <button class="small-action queue-name" type="button" data-select="${escapeAttr(name)}">
          ${escapeHtml(name)}
          <span class="queue-meta">${escapeHtml(levelLabel(name))} ${escapeHtml(persona.race)}</span>
          ${renderPersonaBadges(name, "mini")}
        </button>
        <button class="small-action" type="button" aria-label="Remove ${escapeAttr(name)}" data-remove="${index}">x</button>
      </li>
    `;
  }).join("");

  list.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => viewPersona(button.dataset.select));
  });
  list.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => removeFromQueue(Number(button.dataset.remove)));
  });
}

function renderActivePersona() {
  const persona = state.personas[state.active];
  const currentLevel = getPersonaLevel(persona.name);
  const stats = renderStats(persona);
  const resists = decodeResists(persona.resists).map((item) => (
    `<span class="resist ${item.kind}"><strong>${item.label}</strong><em>${item.value}</em></span>`
  )).join("");
  const skills = renderSkills(persona);
  const image = personaImage(persona.name);
  const badges = renderPersonaBadges(persona.name);

  $("#activePersona").innerHTML = `
    <article class="persona-card">
      <div class="persona-visual">
        <img class="persona-arcana-card" src="${escapeAttr(arcanaCardImage(persona.race))}" alt="">
        <img src="${escapeAttr(image)}" alt="${escapeAttr(persona.name)} artwork" loading="lazy">
      </div>
      <div class="persona-info">
        <div class="persona-heading">
          <div>
            <span class="compendium-label">Compendium File</span>
            <h2 class="persona-name">${escapeHtml(persona.name)}</h2>
            <div class="persona-meta">
              <span>${escapeHtml(levelLabel(persona.name))}</span>
              ${currentLevel !== persona.lvl ? `<span>Base level ${persona.lvl}</span>` : ""}
              <span>${escapeHtml(persona.race)} Arcana</span>
              <span>${escapeHtml(persona.inherits || "inheritance")} type</span>
            </div>
            ${badges ? `<div class="persona-badges">${badges}</div>` : ""}
          </div>
          <div class="arcana-badge">
            <img src="${escapeAttr(personaImage(persona.name))}" alt="">
            <span>${escapeHtml(levelLabel(persona.name))}</span>
            <strong>${escapeHtml(persona.race)}</strong>
          </div>
        </div>
        <div class="persona-profile">
          <section class="detail-block stat-block">
            <h3>Stats</h3>
            <div class="stats">${stats}</div>
          </section>
          <section class="detail-block resist-block">
            <h3>Resistances</h3>
            <div class="resist-grid">${resists}</div>
          </section>
        </div>
        <section class="detail-block moves-block">
          <h3>Moveset</h3>
          <div class="skill-list">${skills}</div>
        </section>
      </div>
    </article>
  `;
}

function renderStats(persona) {
  return (persona.stats || []).map((value, index) => {
    const percentage = Math.max(8, Math.min(100, Number(value) || 0));
    return `
      <span class="stat" style="--stat: ${percentage}%">
        <strong>${STAT_LABELS[index]}</strong>
        <em>${value}</em>
        <i aria-hidden="true"></i>
      </span>
    `;
  }).join("");
}

function personaImage(name) {
  return state.personaImages[name] || "assets/personas/taowu.png";
}

function getPersonaLevel(name) {
  const persona = state.personas[name];
  if (!persona) return 1;
  return state.useCurrentLevels ? state.userLevels[name] || persona.lvl : persona.lvl;
}

function levelLabel(name) {
  const persona = state.personas[name];
  if (!persona) return "Lv ?";
  const currentLevel = getPersonaLevel(name);
  return currentLevel === persona.lvl ? `Lv ${persona.lvl}` : `Lv ${currentLevel}`;
}

function levelDetail(name) {
  const persona = state.personas[name];
  if (!persona) return "";
  const currentLevel = getPersonaLevel(name);
  return currentLevel === persona.lvl ? "" : `Base ${persona.lvl}`;
}

function arcanaCardImage(arcana) {
  return `assets/arcana/${ARCANA_CARD_IMAGES[arcana] || "world"}.png`;
}

function renderSkills(persona) {
  return Object.entries(persona.skills || {}).map(([skill, learned]) => {
    const detail = state.skills[skill] || {};
    const learnedText = learned < 1 ? "Innate" : `Lv ${learned}`;
    const element = detail.element || "skill";
    return `
      <div class="skill-row" data-element="${escapeAttr(element.toLowerCase())}">
        <span class="skill-name">${escapeHtml(skill)}</span>
        <span class="skill-meta">${escapeHtml(learnedText)} / ${escapeHtml(element)} / ${escapeHtml(detail.target || "self")}</span>
      </div>
    `;
  }).join("") || `<div class="empty mini-empty">No learned moves listed.</div>`;
}

function renderRecipes() {
  const recipes = getRecipes(state.active);
  const specialCount = recipes.filter((recipe) => recipe.type === "Special").length;
  const selectedPath = renderSelectedRecipePath();
  $("#recipeSummary").innerHTML = [
    selectedPath,
    `<span class="chip">${recipes.length} recipes</span>`,
    `<span class="chip">${specialCount} special</span>`,
    `<span class="chip">${Math.max(0, recipes.length - specialCount)} normal</span>`,
    state.useCurrentLevels ? `<span class="chip level-chip-active">My levels on</span>` : ""
  ].filter(Boolean).join("");

  if (!recipes.length) {
    $("#recipes").innerHTML = `<div class="empty">No reverse fusion recipes were found for ${escapeHtml(state.active)}.</div>`;
    return;
  }

  $("#recipes").innerHTML = recipes.map((recipe, index) => renderRecipe(recipe, index)).join("");
  $("#recipes").querySelectorAll("[data-persona]").forEach((button) => {
    button.addEventListener("click", () => {
      const recipeIndex = Number(button.dataset.recipeIndex);
      const recipe = recipes[recipeIndex];
      selectPersona(button.dataset.persona, false, {
        target: state.active,
        index: recipeIndex,
        type: recipe.type,
        score: recipe.score,
        ingredients: recipe.ingredients,
        chosen: button.dataset.persona
      });
    });
  });
}

function renderSelectedRecipePath() {
  const selected = state.selectedRecipe;
  if (!selected) return "";
  return `
    <div class="selected-path">
      <span>Selected path</span>
      <strong>${escapeHtml(selected.target)} Recipe ${selected.index + 1}</strong>
      <em>${selected.ingredients.map((name) => name === selected.chosen ? `<b>${escapeHtml(name)}</b>` : escapeHtml(name)).join(" + ")}</em>
    </div>
  `;
}

function renderRecipe(recipe, index) {
  const isSpecialLayout = recipe.ingredients.length > 2;
  const recipeSizeClass = recipe.ingredients.length >= 10
    ? "is-ritual-fusion"
    : recipe.ingredients.length >= 5
      ? "is-large-special"
      : "";
  const targetBadges = renderPersonaBadges(state.active, "recipe");
  const ownedCount = recipe.ingredients.filter((name) => state.ownedPersonas.has(name)).length;
  const missingIngredients = recipe.ingredients.filter((name) => !state.ownedPersonas.has(name));
  const isSelectedRecipe = state.selectedRecipe?.target === state.active && state.selectedRecipe.index === index;
  const ingredients = isSpecialLayout
    ? `
      <div class="special-fusion-note">
        <span>${recipe.ingredients.length}-Persona special fusion</span>
        <strong>Use every ingredient below</strong>
      </div>
      <div class="special-fusion-grid">
        ${recipe.ingredients.map((name, i) => renderIngredientButton(name, i, true, index)).join("")}
      </div>
    `
    : `
      <div class="fusion-equation">
        ${recipe.ingredients.map((name, i) => `
          ${renderIngredientButton(name, i, false, index)}
          ${i < recipe.ingredients.length - 1 ? `<div class="fusion-x">x</div>` : ""}
        `).join("")}
      </div>
    `;

  return `
    <article class="recipe ${isSpecialLayout ? "is-special-fusion" : ""} ${recipeSizeClass} ${isSelectedRecipe ? "is-selected-recipe" : ""}" style="--i: ${index}; --ingredient-count: ${recipe.ingredients.length}">
      <div class="recipe-head">
        <span class="recipe-title">${isSelectedRecipe ? "Exploring" : "Recipe"} ${index + 1}</span>
        <span class="recipe-meta">${recipe.type}${recipe.score ? ` / ${state.useCurrentLevels ? "Current" : "Base"} Lv sum ${recipe.score}` : ""}</span>
      </div>
      <div class="recipe-owned-line ${missingIngredients.length ? "" : "is-complete"}">
        <strong>${ownedCount}/${recipe.ingredients.length} owned</strong>
        <span>${missingIngredients.length ? `Missing: ${missingIngredients.map(escapeHtml).join(", ")}` : "Ready from your logged Personas"}</span>
      </div>
      ${targetBadges ? `<div class="recipe-flags">${targetBadges}</div>` : ""}
      <div class="ingredients">${ingredients}</div>
    </article>
  `;
}

function renderIngredientButton(name, index, showStep, recipeIndex) {
  const persona = state.personas[name];
  const isChosen = state.selectedRecipe?.chosen === name && state.selectedRecipe?.index === recipeIndex;
  const owned = state.ownedPersonas.has(name);
  return `
    <button class="persona-button ${showStep ? "special-ingredient" : ""} ${owned ? "is-owned" : ""} ${isChosen ? "is-selected-ingredient" : ""}" type="button" data-persona="${escapeAttr(name)}" data-recipe-index="${recipeIndex}">
      ${showStep ? `<span class="ingredient-step">${index + 1}</span>` : ""}
      <img src="${escapeAttr(personaImage(name))}" alt="" loading="lazy">
      <span class="ingredient-copy">
        <strong>${escapeHtml(name)}</strong>
        <span class="mini ingredient-meta">${escapeHtml(levelLabel(name))} ${escapeHtml(persona?.race ?? "")}</span>
        ${levelDetail(name) ? `<span class="mini level-detail">${escapeHtml(levelDetail(name))}</span>` : ""}
        ${owned ? `<span class="mini owned-mini">Owned</span>` : ""}
        ${renderPersonaBadges(name, "mini")}
      </span>
      <span class="mini action-copy">${showStep ? "plan" : "queue +"}</span>
    </button>
  `;
}

function renderPersonaBadges(name, size = "normal") {
  const badges = [];
  if (SOCIAL_LINK_UNLOCKS[name]) {
    badges.push({
      kind: "social",
      label: "Max S.Link",
      detail: `${SOCIAL_LINK_UNLOCKS[name]} ultimate`
    });
  }
  if (MARGARET_REQUESTS[name]) {
    const request = MARGARET_REQUESTS[name];
    badges.push({
      kind: "request",
      label: `Margaret ${request.rank}`,
      detail: request.skill
    });
  }

  return badges.map((badge) => `
    <span class="info-badge ${badge.kind} ${size}">
      <strong>${escapeHtml(badge.label)}</strong>
      <span>${escapeHtml(badge.detail)}</span>
    </span>
  `).join("");
}

function getRecipes(name) {
  const recipes = [];
  recipes.push(...getSpecialRecipes(name));
  recipes.push(...splitWithDiffRace(name));
  recipes.push(...splitWithSameRace(name));

  const seen = new Set();
  return recipes
    .filter((recipe) => recipe.ingredients.every((ingredient) => state.personas[ingredient]))
    .filter((recipe) => {
      const key = recipe.ingredients.slice().sort().join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "Special" ? -1 : 1;
      return (a.score || 0) - (b.score || 0) || a.ingredients.join("").localeCompare(b.ingredients.join(""));
    });
}

function getSpecialRecipes(name) {
  const ingredients = state.specialRecipes[name] || [];
  if (!ingredients.length) return [];
  return [{
    type: "Special",
    ingredients,
    score: ingredients.reduce((sum, ingredient) => sum + getPersonaLevel(ingredient), 0)
  }];
}

function splitWithDiffRace(name) {
  if (state.specialRecipes[name]) return [];

  const target = state.personas[name];
  const resultLvls = getResultLevels(target.race);
  const targetIndex = resultLvls.indexOf(target.lvl);
  if (targetIndex === -1) return [];

  const minResultLvl = resultLvls[targetIndex - 1] ? 2 * (resultLvls[targetIndex - 1] - 1) : 0;
  const maxResultLvl = resultLvls[targetIndex + 1] ? 2 * (target.lvl - 1) : 200;
  const recipes = [];

  for (const [raceA, raceBs] of Object.entries(state.fissionChart[target.race] || {})) {
    for (const ingredientA of getIngredientCandidates(raceA)) {
      const lvlA = ingredientA.level;
      const minLvlB = minResultLvl - lvlA;
      const maxLvlB = maxResultLvl - lvlA;
      for (const raceB of raceBs) {
        for (const ingredientB of getIngredientCandidates(raceB)) {
          const lvlB = ingredientB.level;
          if (ingredientA.name !== ingredientB.name && minLvlB < lvlB && lvlB <= maxLvlB && shouldKeepIngredientPair(ingredientA, ingredientB)) {
            recipes.push({
              type: "Normal",
              ingredients: [ingredientA.name, ingredientB.name],
              score: lvlA + lvlB
            });
          }
        }
      }
    }
  }

  return recipes;
}

function splitWithSameRace(name) {
  if (state.specialRecipes[name]) return [];

  const target = state.personas[name];
  const resultLvls = getResultLevels(target.race);
  const targetIndex = resultLvls.indexOf(target.lvl);
  if (targetIndex < 0) return [];

  const minResultLvl = 2 * (target.lvl - 1);
  const maxResultLvl = resultLvls[targetIndex + 1] ? 2 * (resultLvls[targetIndex + 1] - 1) : 200;
  const candidates = getIngredientCandidates(target.race).filter((ingredient) => ingredient.name !== target.name);
  const recipes = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const lvl1 = candidates[i].level;
      const lvl2 = candidates[j].level;
      if (minResultLvl <= lvl1 + lvl2 && lvl1 + lvl2 < maxResultLvl) {
        recipes.push({
          type: "Same Arcana",
          ingredients: [candidates[i].name, candidates[j].name],
          score: lvl1 + lvl2
        });
      }
    }
  }

  return recipes;
}

function getIngredientCandidates(race) {
  return Object.values(state.personas)
    .filter((persona) => persona.race === race)
    .map((persona) => ({
      name: persona.name,
      race: persona.race,
      baseLevel: persona.lvl,
      level: getPersonaLevel(persona.name)
    }))
    .sort((a, b) => a.level - b.level || a.baseLevel - b.baseLevel || a.name.localeCompare(b.name));
}

function shouldKeepIngredientPair(ingredientA, ingredientB) {
  if (ingredientA.race !== ingredientB.race) return true;
  if (ingredientA.level !== ingredientB.level) return ingredientA.level < ingredientB.level;
  return ingredientA.name.localeCompare(ingredientB.name) < 0;
}

function getResultLevels(race) {
  return state.raceLevels.get(race) || [];
}

function decodeResists(code = "") {
  const labels = { "-": "normal", s: "strong", w: "weak", n: "null", r: "repel", d: "drain", S: "strong" };
  return code.split("").map((token, index) => ({
    label: RESIST_LABELS[index] || "?",
    value: labels[token] || token,
    kind: labels[token] || "normal"
  }));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}
