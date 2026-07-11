const RESIST_LABELS = ["Phy", "Fire", "Ice", "Elec", "Wind", "Light", "Dark", "Alm"];
const STAT_LABELS = ["St", "Ma", "En", "Ag", "Lu"];
const INTRO_SEEN_KEY = "p4g-fusion-intro-seen";
const USER_DATA_KEY = "p4g-fusion-user-levels";
const DESIRED_SKILLS_KEY = "p4g-fusion-desired-skills";
const MARGARET_DONE_KEY = "p4g-fusion-margaret-done";

const ARCANA_CARD_IMAGES = {
  Fool: "fool", Magician: "magician", Priestess: "priestess", Empress: "empress",
  Emperor: "emperor", Hierophant: "hierophant", Lovers: "lovers", Chariot: "chariot",
  Justice: "justice", Hermit: "hermit", Fortune: "fortune", Strength: "strength",
  Hanged: "hanged", Death: "death", Temperance: "temperance", Devil: "devil",
  Tower: "tower", Star: "star", Moon: "moon", Sun: "sun", Judgement: "judgement",
  World: "world", Aeon: "extra-22", Jester: "extra-23"
};

const SOCIAL_LINK_UNLOCKS = {
  Loki: "Fool", Mada: "Magician", Scathach: "Priestess", Isis: "Empress",
  Odin: "Emperor", Kohryu: "Hierophant", Ishtar: "Lovers", Futsunushi: "Chariot",
  Sraosha: "Justice", "Ongyo-Ki": "Hermit", Norn: "Fortune", "Zaou-Gongen": "Strength",
  Attis: "Hanged", Mahakala: "Death", Vishnu: "Temperance", Beelzebub: "Devil",
  Shiva: "Tower", Helel: "Star", Sandalphon: "Moon", Asura: "Sun",
  Lucifer: "Judgement", Kaguya: "Aeon", "Magatsu-Izanagi": "Jester"
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

/** P4G-style inherit affinity: result type → skill elements it can receive. */
const INHERIT_AFFINITY = {
  phys: { phy: true, fir: false, ice: false, ele: false, win: false, lig: false, dar: false, alm: false, ail: true, rec: false, sup: true, pas: true },
  fire: { phy: false, fir: true, ice: false, ele: false, win: false, lig: false, dar: false, alm: false, ail: false, rec: false, sup: true, pas: true },
  ice: { phy: false, fir: false, ice: true, ele: false, win: false, lig: false, dar: false, alm: false, ail: false, rec: false, sup: true, pas: true },
  elec: { phy: false, fir: false, ice: false, ele: true, win: false, lig: false, dar: false, alm: false, ail: false, rec: false, sup: true, pas: true },
  wind: { phy: false, fir: false, ice: false, ele: false, win: true, lig: false, dar: false, alm: false, ail: false, rec: false, sup: true, pas: true },
  light: { phy: false, fir: false, ice: false, ele: false, win: false, lig: true, dar: false, alm: false, ail: false, rec: true, sup: true, pas: true },
  dark: { phy: false, fir: false, ice: false, ele: false, win: false, lig: false, dar: true, alm: false, ail: true, rec: false, sup: true, pas: true },
  almighty: { phy: false, fir: false, ice: false, ele: false, win: false, lig: false, dar: false, alm: true, ail: false, rec: false, sup: true, pas: true },
  ailment: { phy: false, fir: false, ice: false, ele: false, win: false, lig: false, dar: false, alm: false, ail: true, rec: false, sup: true, pas: true },
  recovery: { phy: false, fir: false, ice: false, ele: false, win: false, lig: true, dar: false, alm: false, ail: false, rec: true, sup: true, pas: true },
  support: { phy: false, fir: false, ice: false, ele: false, win: false, lig: false, dar: false, alm: false, ail: false, rec: false, sup: true, pas: true }
};

const ELEMENT_LABELS = {
  phy: "Physical", fir: "Fire", ice: "Ice", ele: "Elec", win: "Wind",
  lig: "Light", dar: "Dark", alm: "Almighty", ail: "Ailment", rec: "Recovery",
  sup: "Support", pas: "Passive"
};

const state = {
  personas: {},
  names: [],
  arcanas: [],
  raceLevels: new Map(),
  fusionTable: {},
  fissionChart: {},
  specialRecipes: {},
  specialTargets: new Set(),
  personaImages: {},
  skills: {},
  skillNames: [],
  active: "",
  queue: [],
  selectedRecipe: null,
  userLevels: {},
  ownedPersonas: new Set(),
  desiredSkills: [],
  margaretDone: new Set(),
  logQuery: "",
  logArcana: "All",
  logOwnedFilter: "all",
  recipeFilter: "all",
  recipeSort: "smart",
  useCurrentLevels: false,
  activeCalculatorTab: "search",
  drawTimer: 0,
  searchTimer: 0,
  toastTimer: 0
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
  state.arcanas = [...new Set(Object.values(state.personas).map((persona) => persona.race))]
    .sort((a, b) => a.localeCompare(b));
  state.fusionTable = buildFusionTable(chart);
  state.fissionChart = buildFissionChart(chart);
  state.specialRecipes = specialRecipes;
  state.specialTargets = new Set(Object.keys(specialRecipes));
  state.personaImages = personaImages;
  state.skills = skills;
  state.skillNames = Object.keys(skills).sort((a, b) => a.localeCompare(b));
  loadUserData();
  loadDesiredSkills();
  loadMargaretDone();
  buildRaceLevels();
  setupSearch();
  setupUserData();
  setupRecipeControls();
  setupInheritance();
  setupForwardFusion();
  setupMargaret();
  setupShareAndPath();
  setupStarterTips();
  applyUrlState();
  setupCalculatorTabs();
  renderInitialState();
  if (state.active) {
    const tips = $("#starterTips");
    if (tips) tips.hidden = true;
    renderActivePersona();
    renderRecipes();
    renderInheritance();
    playDeckDraw(state.active);
  }
  renderQueue();
  renderMargaret();
  renderInheritance();
}).catch((error) => {
  $("#recipes").innerHTML = `<div class="empty">Could not load fusion data: ${escapeHtml(error.message)}</div>`;
});

function setupInstallSupport() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

function normalizePersonas(raw) {
  return Object.fromEntries(Object.entries(raw).map(([name, persona]) => [
    name,
    { ...persona, name, race: persona.race === "Hang" ? "Hanged" : persona.race }
  ]));
}

function buildFusionTable(chart) {
  const { races, table } = chart;
  const map = {};
  for (let row = 0; row < table.length; row++) {
    const raceA = races[row] === "Hang" ? "Hanged" : races[row];
    map[raceA] = {};
    for (let col = 0; col < table[row].length; col++) {
      const raceB = races[col] === "Hang" ? "Hanged" : races[col];
      const result = table[row][col] === "Hang" ? "Hanged" : table[row][col];
      map[raceA][raceB] = result;
    }
  }
  return map;
}

function buildFissionChart(chart) {
  const fissions = {};
  const { races, table } = chart;

  // Keep directed pairs only (table[row][col] is not always symmetric in this dataset).
  // Reverse recipes therefore match forward lookups of table[raceA][raceB].
  for (let row = 0; row < table.length; row++) {
    const raceA = races[row] === "Hang" ? "Hanged" : races[row];
    for (let col = 0; col < table[row].length; col++) {
      const raceB = races[col] === "Hang" ? "Hanged" : races[col];
      const resultRace = table[row][col] === "Hang" ? "Hanged" : table[row][col];
      if (!resultRace || resultRace === "-") continue;
      fissions[resultRace] ||= {};
      fissions[resultRace][raceA] ||= new Set();
      fissions[resultRace][raceA].add(raceB);
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
    state.raceLevels.set(race, [...new Set(levels)].sort((a, b) => a - b));
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
    $("#pathPlan").innerHTML = "";
    renderQueue();
    updateUrlState();
  });
}

function setupRecipeControls() {
  document.querySelectorAll("[data-recipe-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.recipeFilter = button.dataset.recipeFilter;
      document.querySelectorAll("[data-recipe-filter]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.recipeFilter === state.recipeFilter);
      });
      renderRecipes();
    });
  });
  $("#recipeSort").addEventListener("change", (event) => {
    state.recipeSort = event.target.value;
    renderRecipes();
  });
}

function setupInheritance() {
  $("#skillOptions").innerHTML = state.skillNames
    .map((name) => `<option value="${escapeAttr(name)}"></option>`).join("");
  $("#addDesiredSkill").addEventListener("click", addDesiredSkillFromInput);
  $("#desiredSkillInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDesiredSkillFromInput();
    }
  });
  $("#clearDesiredSkills").addEventListener("click", () => {
    state.desiredSkills = [];
    persistDesiredSkills();
    renderInheritance();
    renderRecipes();
  });
}

function setupForwardFusion() {
  $("#runForward").addEventListener("click", runForwardFusion);
  $("#forwardA").addEventListener("keydown", (event) => {
    if (event.key === "Enter") runForwardFusion();
  });
  $("#forwardB").addEventListener("keydown", (event) => {
    if (event.key === "Enter") runForwardFusion();
  });
  $("#forwardA").addEventListener("change", renderForwardPartners);
  $("#forwardA").addEventListener("blur", renderForwardPartners);
}

function setupMargaret() {
  // rendered on data load / updates
}

function setupShareAndPath() {
  $("#shareQueue").addEventListener("click", () => {
    copyText(buildShareUrl()).then(() => showToast("Share link copied")).catch(() => showToast("Could not copy link"));
  });
  $("#copyShareLink")?.addEventListener("click", () => {
    copyText(buildShareUrl()).then(() => showToast("Page link copied")).catch(() => showToast("Could not copy link"));
  });
  $("#planPath").addEventListener("click", () => {
    if (!state.active) {
      showToast("Select a Persona first");
      return;
    }
    renderPathPlan(state.active);
  });
}

function setupStarterTips() {
  document.querySelectorAll("[data-demo-persona]").forEach((button) => {
    button.addEventListener("click", () => {
      setCalculatorTab("search");
      selectPersona(button.dataset.demoPersona, true);
    });
  });
  document.querySelectorAll("[data-open-tab]").forEach((button) => {
    button.addEventListener("click", () => setCalculatorTab(button.dataset.openTab));
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
  $("#personaLevelList").innerHTML = state.names
    .map((name) => `<option value="${escapeAttr(name)}"></option>`).join("");
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
  $("#exportData").addEventListener("click", exportUserData);
  $("#importData").addEventListener("change", importUserData);
  $("#resetData").addEventListener("click", resetUserData);
  renderLevelData();
  renderPersonaLog();
  renderCompletionDashboard();
}

function setupCalculatorTabs() {
  const tabs = [...document.querySelectorAll("[data-calculator-tab]")];
  tabs.forEach((button, index) => {
    button.addEventListener("click", () => setCalculatorTab(button.dataset.calculatorTab));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowLeft" ? -1 : 1) + tabs.length) % tabs.length;
      setCalculatorTab(tabs[nextIndex].dataset.calculatorTab);
      tabs[nextIndex].focus();
    });
  });
  setCalculatorTab(state.activeCalculatorTab);
}

function setCalculatorTab(tab) {
  const allowed = new Set(["search", "forward", "player", "margaret"]);
  const nextTab = allowed.has(tab) ? tab : "search";
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
  if (nextTab === "margaret") renderMargaret();
  if (nextTab === "player") {
    renderCompletionDashboard();
    renderPersonaLog();
  }
  if (nextTab === "forward") renderForwardPartners();
  updateUrlState();
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
    // storage may be unavailable
  }
}

function loadDesiredSkills() {
  try {
    const saved = JSON.parse(localStorage.getItem(DESIRED_SKILLS_KEY) || "[]");
    state.desiredSkills = saved.filter((skill) => typeof skill === "string");
  } catch {
    state.desiredSkills = [];
  }
}

function persistDesiredSkills() {
  try {
    localStorage.setItem(DESIRED_SKILLS_KEY, JSON.stringify(state.desiredSkills));
  } catch {
    // ignore
  }
}

function loadMargaretDone() {
  try {
    const saved = JSON.parse(localStorage.getItem(MARGARET_DONE_KEY) || "[]");
    state.margaretDone = new Set(saved.filter((name) => MARGARET_REQUESTS[name]));
  } catch {
    state.margaretDone = new Set();
  }
}

function persistMargaretDone() {
  try {
    localStorage.setItem(MARGARET_DONE_KEY, JSON.stringify([...state.margaretDone]));
  } catch {
    // ignore
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
  if (currentLevel <= baseLevel) delete state.userLevels[name];
  else state.userLevels[name] = currentLevel;
  setPersonaOwned(name, $("#ownedPersonaInput").checked);
  state.useCurrentLevels = true;
  persistUserData();
  renderLevelData();
  renderPersonaLog();
  renderCompletionDashboard();
  refreshActiveViews();
  showToast(`Saved ${name}`);
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
  if (owned) state.ownedPersonas.add(name);
  else state.ownedPersonas.delete(name);
}

function togglePersonaOwned(name) {
  setPersonaOwned(name, !state.ownedPersonas.has(name));
  persistUserData();
  renderLevelData();
  renderPersonaLog();
  renderCompletionDashboard();
  refreshActiveViews();
}

function viewLogPersona(name) {
  populatePersonaLogEditor(name);
  setCalculatorTab("search");
  selectPersona(name, true);
}

function exportUserData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    useCurrentLevels: state.useCurrentLevels,
    levels: state.userLevels,
    owned: [...state.ownedPersonas].sort((a, b) => a.localeCompare(b)),
    desiredSkills: state.desiredSkills,
    margaretDone: [...state.margaretDone]
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "velvet-fusion-deck-data.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Exported player data");
}

function importUserData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || "{}"));
      state.userLevels = sanitizeUserLevels(data.levels || {});
      state.ownedPersonas = new Set((data.owned || []).filter((name) => state.personas[name]));
      state.useCurrentLevels = Boolean(data.useCurrentLevels);
      if (Array.isArray(data.desiredSkills)) {
        state.desiredSkills = data.desiredSkills.filter((skill) => typeof skill === "string");
        persistDesiredSkills();
      }
      if (Array.isArray(data.margaretDone)) {
        state.margaretDone = new Set(data.margaretDone.filter((name) => MARGARET_REQUESTS[name]));
        persistMargaretDone();
      }
      persistUserData();
      renderLevelData();
      renderPersonaLog();
      renderCompletionDashboard();
      renderInheritance();
      renderMargaret();
      refreshActiveViews();
      showToast("Imported player data");
    } catch {
      showToast("Import failed — invalid JSON");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

function resetUserData() {
  if (!window.confirm("Reset owned Personas, custom levels, and Margaret checks?")) return;
  state.userLevels = {};
  state.ownedPersonas = new Set();
  state.useCurrentLevels = false;
  state.margaretDone = new Set();
  persistUserData();
  persistMargaretDone();
  renderLevelData();
  renderPersonaLog();
  renderCompletionDashboard();
  renderMargaret();
  refreshActiveViews();
  showToast("Player log reset");
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

function renderCompletionDashboard() {
  const total = state.names.length;
  const owned = state.ownedPersonas.size;
  const pct = total ? Math.round((owned / total) * 100) : 0;
  const byArcana = state.arcanas.map((arcana) => {
    const members = Object.values(state.personas).filter((p) => p.race === arcana);
    const ownedCount = members.filter((p) => state.ownedPersonas.has(p.name)).length;
    return { arcana, ownedCount, total: members.length, pct: members.length ? Math.round((ownedCount / members.length) * 100) : 0 };
  }).sort((a, b) => a.pct - b.pct || a.arcana.localeCompare(b.arcana));

  const ultimates = Object.keys(SOCIAL_LINK_UNLOCKS);
  const ownedUltimates = ultimates.filter((name) => state.ownedPersonas.has(name));
  const specials = Object.keys(state.specialRecipes);
  const ownedSpecials = specials.filter((name) => state.ownedPersonas.has(name));
  const readySpecials = specials.filter((name) => {
    const ingredients = state.specialRecipes[name] || [];
    return ingredients.length && ingredients.every((item) => state.ownedPersonas.has(item));
  });

  $("#completionDashboard").innerHTML = `
    <div class="dash-grid">
      <div class="dash-card">
        <span>Compendium</span>
        <strong>${owned}/${total}</strong>
        <em>${pct}% complete</em>
        <div class="dash-bar"><i style="width:${pct}%"></i></div>
      </div>
      <div class="dash-card">
        <span>Ultimates</span>
        <strong>${ownedUltimates.length}/${ultimates.length}</strong>
        <em>Max Social Link Personas</em>
      </div>
      <div class="dash-card">
        <span>Special fusions</span>
        <strong>${ownedSpecials.length}/${specials.length}</strong>
        <em>${readySpecials.length} craftable from owned</em>
      </div>
      <div class="dash-card">
        <span>Lowest arcana</span>
        <strong>${escapeHtml(byArcana[0]?.arcana || "—")}</strong>
        <em>${byArcana[0] ? `${byArcana[0].ownedCount}/${byArcana[0].total}` : ""}</em>
      </div>
    </div>
    <div class="dash-arcana">
      ${byArcana.slice(0, 8).map((row) => `
        <button type="button" class="dash-arcana-chip" data-dash-arcana="${escapeAttr(row.arcana)}">
          <strong>${escapeHtml(row.arcana)}</strong>
          <span>${row.ownedCount}/${row.total}</span>
          <i style="width:${row.pct}%"></i>
        </button>
      `).join("")}
    </div>
  `;
  $("#completionDashboard").querySelectorAll("[data-dash-arcana]").forEach((button) => {
    button.addEventListener("click", () => {
      state.logArcana = button.dataset.dashArcana;
      $("#personaLogArcana").value = state.logArcana;
      renderPersonaLog();
    });
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

  document.querySelectorAll("[data-owned-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.ownedFilter === state.logOwnedFilter);
  });
  $("#personaLogStats").innerHTML = `
    <span><strong>${state.ownedPersonas.size}</strong> owned</span>
    <span><strong>${state.names.length - state.ownedPersonas.size}</strong> missing</span>
    <span><strong>${Object.keys(state.userLevels).length}</strong> leveled</span>
    <span><strong>${cards.length}</strong> shown</span>
  `;
  $("#personaLogList").innerHTML = cards.length
    ? cards.slice(0, 100).map(renderPersonaLogCard).join("")
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

function renderMargaret() {
  const list = $("#margaretList");
  if (!list) return;
  const entries = Object.entries(MARGARET_REQUESTS).sort((a, b) => a[1].rank - b[1].rank);
  list.innerHTML = entries.map(([name, request]) => {
    const done = state.margaretDone.has(name);
    const owned = state.ownedPersonas.has(name);
    const persona = state.personas[name];
    const hasSkill = persona && Object.keys(persona.skills || {}).some((skill) => skill === request.skill);
    return `
      <article class="margaret-card ${done ? "is-done" : ""} ${owned ? "is-owned" : ""}">
        <div class="margaret-main">
          <img src="${escapeAttr(personaImage(name))}" alt="" loading="lazy">
          <div>
            <span class="margaret-rank">Rank ${request.rank}</span>
            <strong>${escapeHtml(name)}</strong>
            <em>Needs <b>${escapeHtml(request.skill)}</b>${hasSkill ? " (innate/learnable on self)" : " (inherit onto it)"}</em>
            <span class="margaret-status">${owned ? "In your log" : "Not marked owned"} · ${done ? "Checked off" : "Open"}</span>
          </div>
        </div>
        <div class="margaret-actions">
          <button type="button" class="primary-button compact-button" data-margaret-plan="${escapeAttr(name)}" data-skill="${escapeAttr(request.skill)}">Plan craft</button>
          <button type="button" class="ghost-button" data-margaret-toggle="${escapeAttr(name)}">${done ? "Undo" : "Mark done"}</button>
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-margaret-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.margaretPlan;
      const skill = button.dataset.skill;
      if (skill && !state.desiredSkills.includes(skill)) {
        state.desiredSkills.push(skill);
        persistDesiredSkills();
      }
      setCalculatorTab("search");
      selectPersona(name, true);
      renderPathPlan(name);
      showToast(`Planning ${name} with ${skill}`);
    });
  });
  list.querySelectorAll("[data-margaret-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.margaretToggle;
      if (state.margaretDone.has(name)) state.margaretDone.delete(name);
      else state.margaretDone.add(name);
      persistMargaretDone();
      renderMargaret();
    });
  });
}

function refreshActiveViews() {
  if (state.active) {
    renderActivePersona();
    renderRecipes();
    renderInheritance();
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
    try { sessionStorage.setItem(INTRO_SEEN_KEY, "true"); } catch { /* ignore */ }
    window.setTimeout(() => { intro.hidden = true; }, 620);
  };

  try {
    if (sessionStorage.getItem(INTRO_SEEN_KEY) === "true") {
      intro.hidden = true;
      document.body.classList.remove("intro-active");
      return;
    }
  } catch {
    // keep intro
  }

  enter.addEventListener("click", dismissIntro);
  window.addEventListener("keydown", (event) => {
    if (intro.hidden) return;
    if (event.key === "Enter" || event.key === "Escape") dismissIntro();
  });
  window.setTimeout(() => enter.focus({ preventScroll: true }), 1600);
}

function renderInitialState() {
  if (state.active) return;
  $("#personaSearch").value = "";
  $("#activePersona").innerHTML = `
    <div class="empty starter-empty">
      <strong>Search a Persona or Arcana to begin</strong>
      <span>Reverse fusion recipes, inheritance scoring, and multi-step craft paths start from a target Persona.</span>
      <div class="starter-actions">
        <button type="button" class="primary-button compact-button" data-demo-persona="Trumpeter">Trumpeter</button>
        <button type="button" class="ghost-button" data-demo-persona="Alice">Alice</button>
        <button type="button" class="ghost-button" data-demo-persona="Yoshitsune">Yoshitsune</button>
      </div>
    </div>`;
  $("#activePersona").querySelectorAll("[data-demo-persona]").forEach((button) => {
    button.addEventListener("click", () => selectPersona(button.dataset.demoPersona, true));
  });
  $("#recipeSummary").innerHTML = "";
  $("#recipes").innerHTML = "";
  $("#deckStage").className = "deck-stage";
  $("#deckStage").innerHTML = "";
  renderInheritance();
  renderQueue();
}

function handleSearchInput(value) {
  const tips = $("#starterTips");
  if (tips) tips.hidden = Boolean(value.trim()) || Boolean(state.active);
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

function findSkill(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  return state.skillNames.find((name) => name.toLowerCase() === normalized)
    || state.skillNames.find((name) => name.toLowerCase().includes(normalized));
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
  const personaMatches = state.names.filter((name) => name.toLowerCase().includes(normalized)).slice(0, 7);
  const arcanaMatches = arcana
    ? Object.values(state.personas)
      .filter((persona) => persona.race === arcana)
      .sort((a, b) => a.lvl - b.lvl || a.name.localeCompare(b.name))
      .map((persona) => persona.name)
      .slice(0, 7)
    : [];
  const previewNames = exactPersona ? [exactPersona] : personaMatches.length ? personaMatches : arcanaMatches;
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
  state.searchTimer = setTimeout(() => stage.classList.remove("is-running"), 850);
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
  state.drawTimer = setTimeout(() => stage.classList.remove("is-running"), 2400);
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
  const tips = $("#starterTips");
  if (tips) tips.hidden = true;
  $("#personaSearch").value = name;
  if (primary) {
    state.queue = [name];
    state.selectedRecipe = null;
    $("#pathPlan").innerHTML = "";
  } else {
    if (recipeContext) state.selectedRecipe = recipeContext;
    addToQueue(name);
  }
  clearSuggestions();
  playDeckDraw(name);
  renderActivePersona();
  renderInheritance();
  renderRecipes();
  renderQueue();
  updateUrlState();
}

function viewPersona(name) {
  state.active = name;
  $("#personaSearch").value = name;
  renderActivePersona();
  renderInheritance();
  renderRecipes();
  renderQueue();
  updateUrlState();
}

function addToQueue(name) {
  if (!state.queue.includes(name)) state.queue.push(name);
}

function removeFromQueue(index) {
  state.queue.splice(index, 1);
  renderQueue();
  updateUrlState();
}

function renderQueue() {
  const list = $("#queueList");
  if (!state.queue.length) {
    list.innerHTML = `<li class="empty">Search a Persona to set priority 1. Click recipe ingredients to append priority 2, 3, and beyond.</li>`;
    return;
  }

  list.innerHTML = state.queue.map((name, index) => {
    const persona = state.personas[name];
    const owned = state.ownedPersonas.has(name);
    return `
      <li class="queue-item ${owned ? "is-owned" : ""}">
        <span class="queue-rank">${index + 1}</span>
        <button class="small-action queue-name" type="button" data-select="${escapeAttr(name)}">
          ${escapeHtml(name)}
          <span class="queue-meta">${escapeHtml(levelLabel(name))} ${escapeHtml(persona.race)}${owned ? " · owned" : ""}</span>
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
  if (!persona) return;
  const currentLevel = getPersonaLevel(persona.name);
  const stats = renderStats(persona);
  const resists = decodeResists(persona.resists).map((item) => (
    `<span class="resist ${item.kind}"><strong>${item.label}</strong><em>${item.value}</em></span>`
  )).join("");
  const skills = renderSkills(persona);
  const image = personaImage(persona.name);
  const badges = renderPersonaBadges(persona.name);
  const owned = state.ownedPersonas.has(persona.name);

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
              <span class="${owned ? "owned-pill" : "missing-pill"}">${owned ? "Owned" : "Not in log"}</span>
            </div>
            ${badges ? `<div class="persona-badges">${badges}</div>` : ""}
            <div class="persona-quick-actions">
              <button type="button" class="ghost-button" data-toggle-owned="${escapeAttr(persona.name)}">${owned ? "Unmark owned" : "Mark owned"}</button>
              <button type="button" class="ghost-button" data-run-path="${escapeAttr(persona.name)}">Auto craft path</button>
            </div>
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
  $("#activePersona").querySelectorAll("[data-toggle-owned]").forEach((button) => {
    button.addEventListener("click", () => togglePersonaOwned(button.dataset.toggleOwned));
  });
  $("#activePersona").querySelectorAll("[data-run-path]").forEach((button) => {
    button.addEventListener("click", () => renderPathPlan(button.dataset.runPath));
  });
  $("#activePersona").querySelectorAll("[data-add-skill]").forEach((button) => {
    button.addEventListener("click", () => {
      addDesiredSkill(button.dataset.addSkill);
    });
  });
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
      <button class="skill-row skill-row-button" type="button" data-element="${escapeAttr(String(element).toLowerCase())}" data-add-skill="${escapeAttr(skill)}" title="Add ${escapeAttr(skill)} to desired inheritance">
        <span class="skill-name">${escapeHtml(skill)}</span>
        <span class="skill-meta">${escapeHtml(learnedText)} / ${escapeHtml(ELEMENT_LABELS[element] || element)} / ${escapeHtml(detail.target || "—")}</span>
      </button>
    `;
  }).join("") || `<div class="empty mini-empty">No learned moves listed.</div>`;
}

function addDesiredSkillFromInput() {
  const skill = findSkill($("#desiredSkillInput").value);
  if (!skill) {
    $("#desiredSkillInput").setCustomValidity("Choose a skill from the list.");
    $("#desiredSkillInput").reportValidity();
    return;
  }
  $("#desiredSkillInput").setCustomValidity("");
  addDesiredSkill(skill);
  $("#desiredSkillInput").value = "";
}

function addDesiredSkill(skill) {
  if (!skill) return;
  if (!state.desiredSkills.includes(skill)) {
    state.desiredSkills.push(skill);
    persistDesiredSkills();
  }
  renderInheritance();
  renderRecipes();
  showToast(`Tracking ${skill}`);
}

function removeDesiredSkill(skill) {
  state.desiredSkills = state.desiredSkills.filter((item) => item !== skill);
  persistDesiredSkills();
  renderInheritance();
  renderRecipes();
}

function canInherit(resultName, skillName) {
  const persona = state.personas[resultName];
  const skill = state.skills[skillName];
  if (!persona || !skill) return false;
  // Result already learns it natively: treat as covered without inheritance.
  if (persona.skills && skillName in persona.skills) return true;
  const affinity = INHERIT_AFFINITY[persona.inherits] || INHERIT_AFFINITY.support;
  const element = skill.element || "sup";
  return Boolean(affinity[element]);
}

function renderInheritance() {
  const box = $("#desiredSkills");
  const hint = $("#inheritHint");
  if (!box || !hint) return;

  if (!state.desiredSkills.length) {
    box.innerHTML = `<span class="level-empty">No desired skills yet. Click a moveset skill or add one above.</span>`;
  } else {
    box.innerHTML = state.desiredSkills.map((skill) => {
      const detail = state.skills[skill] || {};
      const ok = state.active ? canInherit(state.active, skill) : true;
      return `
        <button class="level-chip skill-chip ${ok ? "" : "is-blocked"}" type="button" data-remove-skill="${escapeAttr(skill)}" title="${ok ? "Remove" : "May be blocked by inheritance type"}">
          <strong>${escapeHtml(skill)}</strong>
          <span>${escapeHtml(ELEMENT_LABELS[detail.element] || detail.element || "skill")}</span>
          ${state.active ? `<em>${ok ? "inheritable" : "blocked?"}</em>` : ""}
        </button>
      `;
    }).join("");
    box.querySelectorAll("[data-remove-skill]").forEach((button) => {
      button.addEventListener("click", () => removeDesiredSkill(button.dataset.removeSkill));
    });
  }

  if (!state.active) {
    hint.innerHTML = "Select a Persona to score recipes by inheritance coverage.";
    return;
  }
  const persona = state.personas[state.active];
  const affinity = INHERIT_AFFINITY[persona.inherits] || {};
  const allowed = Object.entries(affinity)
    .filter(([, yes]) => yes)
    .map(([el]) => ELEMENT_LABELS[el] || el);
  hint.innerHTML = `
    <strong>${escapeHtml(persona.name)}</strong> inherits as <em>${escapeHtml(persona.inherits || "unknown")}</em>.
    Likely elements: ${allowed.map(escapeHtml).join(", ") || "support/passives"}.
    Recipes below are scored by how many desired skills parents can supply.
  `;
}

function recipeOwnership(recipe) {
  const owned = recipe.ingredients.filter((name) => state.ownedPersonas.has(name)).length;
  const missing = recipe.ingredients.length - owned;
  return { owned, missing, ready: missing === 0 };
}

function recipeSkillCoverage(recipe, targetName) {
  if (!state.desiredSkills.length) return { hits: 0, total: 0, skills: [] };
  const parentSkills = new Set();
  for (const name of recipe.ingredients) {
    const persona = state.personas[name];
    if (!persona) continue;
    for (const skill of Object.keys(persona.skills || {})) parentSkills.add(skill);
  }
  const skills = state.desiredSkills.filter((skill) => parentSkills.has(skill) && canInherit(targetName, skill));
  return { hits: skills.length, total: state.desiredSkills.length, skills };
}

function getFilteredSortedRecipes(name) {
  let recipes = getRecipes(name).map((recipe, index) => {
    const ownership = recipeOwnership(recipe);
    const coverage = recipeSkillCoverage(recipe, name);
    return {
      ...recipe,
      index,
      missing: ownership.missing,
      ownedCount: ownership.owned,
      ready: ownership.ready,
      skillHits: coverage.hits,
      skillTotal: coverage.total,
      coveredSkills: coverage.skills
    };
  });

  if (state.recipeFilter === "ready") recipes = recipes.filter((recipe) => recipe.ready);
  if (state.recipeFilter === "partial") {
    recipes = recipes.filter((recipe) => recipe.ownedCount > 0 && !recipe.ready);
  }

  const typeWeight = (type) => (type === "Special" ? 0 : type === "Same Arcana" ? 1 : 2);

  recipes.sort((a, b) => {
    if (state.recipeSort === "missing") {
      return a.missing - b.missing || b.skillHits - a.skillHits || (a.score || 0) - (b.score || 0);
    }
    if (state.recipeSort === "score") {
      return (a.score || 0) - (b.score || 0) || a.missing - b.missing;
    }
    if (state.recipeSort === "special") {
      return typeWeight(a.type) - typeWeight(b.type) || a.missing - b.missing || (a.score || 0) - (b.score || 0);
    }
    // smart
    if (b.skillHits !== a.skillHits) return b.skillHits - a.skillHits;
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    if (a.missing !== b.missing) return a.missing - b.missing;
    return typeWeight(a.type) - typeWeight(b.type) || (a.score || 0) - (b.score || 0);
  });

  return recipes;
}

function renderRecipes() {
  if (!state.active) {
    $("#recipeSummary").innerHTML = "";
    $("#recipes").innerHTML = "";
    return;
  }

  const recipes = getFilteredSortedRecipes(state.active);
  const allCount = getRecipes(state.active).length;
  const specialCount = recipes.filter((recipe) => recipe.type === "Special").length;
  const readyCount = recipes.filter((recipe) => recipe.ready).length;
  const selectedPath = renderSelectedRecipePath();

  $("#recipeSummary").innerHTML = [
    selectedPath,
    `<span class="chip">${recipes.length} shown / ${allCount} total</span>`,
    `<span class="chip">${readyCount} ready</span>`,
    `<span class="chip">${specialCount} special</span>`,
    state.desiredSkills.length ? `<span class="chip">skills tracked ${state.desiredSkills.length}</span>` : "",
    state.useCurrentLevels ? `<span class="chip level-chip-active">My levels on</span>` : ""
  ].filter(Boolean).join("");

  document.querySelectorAll("[data-recipe-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.recipeFilter === state.recipeFilter);
  });

  if (!recipes.length) {
    $("#recipes").innerHTML = `<div class="empty">No recipes match this filter for ${escapeHtml(state.active)}. Try "All recipes" or mark more Personas as owned.</div>`;
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
  const missingIngredients = recipe.ingredients.filter((name) => !state.ownedPersonas.has(name));
  const isSelectedRecipe = state.selectedRecipe?.target === state.active && state.selectedRecipe.index === index;
  const skillNote = recipe.skillTotal
    ? `<div class="recipe-skill-line ${recipe.skillHits ? "has-hits" : ""}"><strong>${recipe.skillHits}/${recipe.skillTotal} skills</strong><span>${recipe.coveredSkills.length ? recipe.coveredSkills.map(escapeHtml).join(", ") : "No tracked skills from these parents"}</span></div>`
    : "";

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
    <article class="recipe ${isSpecialLayout ? "is-special-fusion" : ""} ${recipeSizeClass} ${isSelectedRecipe ? "is-selected-recipe" : ""} ${recipe.ready ? "is-ready-recipe" : ""}" style="--i: ${index}; --ingredient-count: ${recipe.ingredients.length}">
      <div class="recipe-head">
        <span class="recipe-title">${isSelectedRecipe ? "Exploring" : "Recipe"} ${index + 1}</span>
        <span class="recipe-meta">${recipe.type}${recipe.score ? ` / ${state.useCurrentLevels ? "Current" : "Base"} Lv sum ${recipe.score}` : ""}</span>
      </div>
      <div class="recipe-owned-line ${missingIngredients.length ? "" : "is-complete"}">
        <strong>${recipe.ownedCount}/${recipe.ingredients.length} owned</strong>
        <span>${missingIngredients.length ? `Missing: ${missingIngredients.map(escapeHtml).join(", ")}` : "Ready from your logged Personas"}</span>
      </div>
      ${skillNote}
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
    badges.push({ kind: "social", label: "Max S.Link", detail: `${SOCIAL_LINK_UNLOCKS[name]} ultimate` });
  }
  if (MARGARET_REQUESTS[name]) {
    const request = MARGARET_REQUESTS[name];
    badges.push({ kind: "request", label: `Margaret ${request.rank}`, detail: request.skill });
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
    ingredients: [...ingredients],
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

/** Forward fusion for a directed race lookup table[raceA][raceB]. */
function fusePersonasDirected(name1, name2) {
  if (!name1 || !name2 || name1 === name2) return null;
  const a = state.personas[name1];
  const b = state.personas[name2];
  if (!a || !b) return null;

  for (const [result, ingredients] of Object.entries(state.specialRecipes)) {
    if (ingredients.length === 2) {
      const set = new Set(ingredients);
      if (set.has(name1) && set.has(name2)) return { name: result, type: "Special" };
    }
  }

  const lvlSum = getPersonaLevel(name1) + getPersonaLevel(name2);

  if (a.race === b.race) {
    const resultLvls = getResultLevels(a.race);
    for (let i = 0; i < resultLvls.length; i++) {
      const targetLvl = resultLvls[i];
      const target = Object.values(state.personas).find((p) => (
        p.race === a.race
        && p.lvl === targetLvl
        && !state.specialTargets.has(p.name)
        && p.name !== name1
        && p.name !== name2
      ));
      if (!target) continue;
      const minResultLvl = 2 * (targetLvl - 1);
      const maxResultLvl = resultLvls[i + 1] ? 2 * (resultLvls[i + 1] - 1) : 200;
      if (minResultLvl <= lvlSum && lvlSum < maxResultLvl) {
        return { name: target.name, type: "Same Arcana" };
      }
    }
    return null;
  }

  const resultRace = state.fusionTable[a.race]?.[b.race];
  if (!resultRace || resultRace === "-") return null;
  const resultLvls = getResultLevels(resultRace);
  for (let i = 0; i < resultLvls.length; i++) {
    const targetLvl = resultLvls[i];
    const target = Object.values(state.personas).find((p) => (
      p.race === resultRace
      && p.lvl === targetLvl
      && !state.specialTargets.has(p.name)
    ));
    if (!target) continue;
    const minResultLvl = resultLvls[i - 1] ? 2 * (resultLvls[i - 1] - 1) : 0;
    const maxResultLvl = resultLvls[i + 1] ? 2 * (targetLvl - 1) : 200;
    if (minResultLvl < lvlSum && lvlSum <= maxResultLvl) {
      return { name: target.name, type: "Normal" };
    }
  }
  return null;
}

/** Forward fusion: try both ingredient orders when the chart cell differs. */
function fusePersonas(name1, name2) {
  const ab = fusePersonasDirected(name1, name2);
  const ba = fusePersonasDirected(name2, name1);
  if (ab && ba && ab.name !== ba.name) {
    // Prefer the result whose reverse recipe list actually contains this pair.
    const abPair = recipeHasPair(ab.name, name1, name2);
    const baPair = recipeHasPair(ba.name, name1, name2);
    if (abPair && !baPair) return ab;
    if (baPair && !abPair) return ba;
  }
  return ab || ba;
}

function recipeHasPair(resultName, name1, name2) {
  return getRecipes(resultName).some((recipe) => {
    if (recipe.ingredients.length !== 2) return false;
    const set = new Set(recipe.ingredients);
    return set.has(name1) && set.has(name2);
  });
}

function runForwardFusion() {
  const nameA = findPersona($("#forwardA").value);
  const nameB = findPersona($("#forwardB").value);
  const out = $("#forwardResult");
  if (!nameA || !nameB) {
    out.innerHTML = `<div class="empty">Pick two valid Personas.</div>`;
    return;
  }
  if (nameA === nameB) {
    out.innerHTML = `<div class="empty">Choose two different Personas.</div>`;
    return;
  }
  const result = fusePersonas(nameA, nameB);
  if (!result) {
    out.innerHTML = `
      <div class="empty">No normal fusion result for ${escapeHtml(nameA)} + ${escapeHtml(nameB)}.
      Special multi-Persona recipes still need all listed ingredients.</div>`;
    return;
  }
  const persona = state.personas[result.name];
  out.innerHTML = `
    <article class="forward-card">
      <div class="forward-equation">
        <span>${escapeHtml(nameA)}</span>
        <em>x</em>
        <span>${escapeHtml(nameB)}</span>
        <em>=</em>
        <strong>${escapeHtml(result.name)}</strong>
      </div>
      <div class="forward-body">
        <img src="${escapeAttr(personaImage(result.name))}" alt="">
        <div>
          <span class="compendium-label">${escapeHtml(result.type)} fusion</span>
          <h3>${escapeHtml(result.name)}</h3>
          <p>${escapeHtml(levelLabel(result.name))} / ${escapeHtml(persona.race)} / ${escapeHtml(persona.inherits || "")}</p>
          <div class="margaret-actions">
            <button type="button" class="primary-button compact-button" data-open-result="${escapeAttr(result.name)}">Open reverse recipes</button>
            <button type="button" class="ghost-button" data-queue-result="${escapeAttr(result.name)}">Add to queue</button>
          </div>
        </div>
      </div>
    </article>
  `;
  out.querySelectorAll("[data-open-result]").forEach((button) => {
    button.addEventListener("click", () => {
      setCalculatorTab("search");
      selectPersona(button.dataset.openResult, true);
    });
  });
  out.querySelectorAll("[data-queue-result]").forEach((button) => {
    button.addEventListener("click", () => {
      addToQueue(button.dataset.queueResult);
      renderQueue();
      showToast(`Queued ${button.dataset.queueResult}`);
    });
  });
}

function renderForwardPartners() {
  const host = $("#forwardPartners");
  if (!host) return;
  const nameA = findPersona($("#forwardA").value);
  if (!nameA) {
    host.innerHTML = `<div class="empty mini-empty">Enter Persona A to preview possible partners from your owned list.</div>`;
    return;
  }
  const ownedPartners = [...state.ownedPersonas]
    .filter((name) => name !== nameA)
    .map((name) => ({ name, result: fusePersonas(nameA, name) }))
    .filter((row) => row.result)
    .sort((a, b) => a.result.name.localeCompare(b.result.name))
    .slice(0, 24);

  if (!ownedPartners.length) {
    host.innerHTML = `<div class="empty mini-empty">No owned partners produce a normal fusion with ${escapeHtml(nameA)} yet.</div>`;
    return;
  }

  host.innerHTML = `
    <h3 class="partners-title">Owned partners for ${escapeHtml(nameA)}</h3>
    <div class="partners-grid">
      ${ownedPartners.map((row) => `
        <button type="button" class="partner-chip" data-partner="${escapeAttr(row.name)}">
          <strong>${escapeHtml(row.name)}</strong>
          <span>→ ${escapeHtml(row.result.name)}</span>
        </button>
      `).join("")}
    </div>
  `;
  host.querySelectorAll("[data-partner]").forEach((button) => {
    button.addEventListener("click", () => {
      $("#forwardB").value = button.dataset.partner;
      runForwardFusion();
    });
  });
}

/**
 * Depth-limited reverse path planner.
 * Prefers recipes with fewer missing ingredients and lower level sum.
 */
function findCraftPath(target, maxDepth = 3) {
  const bestQueue = [];
  const visited = new Set();

  function scoreRecipe(recipe) {
    const ownership = recipeOwnership(recipe);
    const coverage = recipeSkillCoverage(recipe, target);
    return ownership.missing * 1000 - coverage.hits * 50 + (recipe.score || 0) + recipe.ingredients.length * 2;
  }

  function search(name, depth, trail, trailSet) {
    if (depth > maxDepth) return;
    if (state.ownedPersonas.has(name) && depth > 0) {
      bestQueue.push({ steps: [...trail], leaf: name, ownedLeaf: true });
      return;
    }
    if (visited.has(`${name}@${depth}`)) return;
    visited.add(`${name}@${depth}`);

    const recipes = getRecipes(name).slice().sort((a, b) => scoreRecipe(a) - scoreRecipe(b)).slice(0, 12);
    if (!recipes.length) {
      bestQueue.push({ steps: [...trail], leaf: name, ownedLeaf: state.ownedPersonas.has(name) });
      return;
    }

    const recipe = recipes[0];
    const step = { result: name, type: recipe.type, ingredients: recipe.ingredients, missing: recipeOwnership(recipe).missing };
    const nextTrail = [...trail, step];

    if (recipeOwnership(recipe).ready || depth === maxDepth) {
      bestQueue.push({ steps: nextTrail, leaf: name, ownedLeaf: recipeOwnership(recipe).ready });
      return;
    }

    for (const ingredient of recipe.ingredients) {
      if (trailSet.has(ingredient)) continue;
      if (state.ownedPersonas.has(ingredient)) continue;
      const nextSet = new Set(trailSet);
      nextSet.add(ingredient);
      search(ingredient, depth + 1, nextTrail, nextSet);
    }
  }

  search(target, 0, [], new Set([target]));
  bestQueue.sort((a, b) => {
    const missA = a.steps.reduce((sum, step) => sum + step.missing, 0);
    const missB = b.steps.reduce((sum, step) => sum + step.missing, 0);
    return missA - missB || a.steps.length - b.steps.length;
  });
  return bestQueue[0] || null;
}

function renderPathPlan(target) {
  const plan = findCraftPath(target, 3);
  const host = $("#pathPlan");
  if (!plan || !plan.steps.length) {
    host.innerHTML = `<div class="empty mini-empty">No multi-step path found for ${escapeHtml(target)}. It may be special-only or already simple.</div>`;
    // still queue ingredients of best single recipe
    const recipes = getFilteredSortedRecipes(target);
    if (recipes[0]) {
      state.queue = [target, ...recipes[0].ingredients.filter((name) => name !== target)];
      // unique preserve order
      state.queue = [...new Set(state.queue)];
      renderQueue();
    }
    return;
  }

  const queue = [target];
  for (const step of plan.steps) {
    for (const ingredient of step.ingredients) {
      if (!queue.includes(ingredient)) queue.push(ingredient);
    }
  }
  state.queue = queue;
  renderQueue();

  host.innerHTML = `
    <div class="path-plan-card">
      <div class="path-plan-head">
        <strong>Auto craft path</strong>
        <span>${plan.steps.length} step${plan.steps.length === 1 ? "" : "s"} toward ${escapeHtml(target)}</span>
      </div>
      <ol class="path-steps">
        ${plan.steps.map((step, index) => `
          <li>
            <span class="path-step-num">${index + 1}</span>
            <div>
              <strong>${escapeHtml(step.result)}</strong>
              <em>${escapeHtml(step.type)} · ${step.missing === 0 ? "ready" : `${step.missing} missing`}</em>
              <span>${step.ingredients.map(escapeHtml).join(" + ")}</span>
            </div>
          </li>
        `).join("")}
      </ol>
      <button type="button" class="ghost-button" id="dismissPath">Dismiss</button>
    </div>
  `;
  $("#dismissPath")?.addEventListener("click", () => { host.innerHTML = ""; });
  showToast(`Craft path filled for ${target}`);
  updateUrlState();
}

function buildShareUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  if (state.active) url.searchParams.set("persona", state.active);
  if (state.queue.length) url.searchParams.set("queue", state.queue.join(","));
  if (state.activeCalculatorTab && state.activeCalculatorTab !== "search") {
    url.searchParams.set("tab", state.activeCalculatorTab);
  }
  if (state.desiredSkills.length) url.searchParams.set("skills", state.desiredSkills.join(","));
  if (state.selectedRecipe?.index != null) url.searchParams.set("recipe", String(state.selectedRecipe.index));
  return url.toString();
}

function applyUrlState() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab) state.activeCalculatorTab = tab;

  const skills = params.get("skills");
  if (skills) {
    state.desiredSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
    persistDesiredSkills();
  }

  const queue = params.get("queue");
  const persona = params.get("persona");
  if (queue) {
    state.queue = queue.split(",").map((s) => s.trim()).filter((name) => state.personas[name]);
  }
  if (persona && state.personas[persona]) {
    state.active = persona;
    $("#personaSearch").value = persona;
    if (!state.queue.includes(persona)) state.queue = [persona, ...state.queue.filter((n) => n !== persona)];
    const tips = $("#starterTips");
    if (tips) tips.hidden = true;
  }
}

function updateUrlState() {
  if (!window.history?.replaceState) return;
  try {
    const url = buildShareUrl();
    window.history.replaceState({}, "", url);
  } catch {
    // ignore
  }
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.hidden = false;
  toast.textContent = message;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
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

// Expose pure helpers for Node tests when bundled/required is not used.
if (typeof window !== "undefined") {
  window.__P4G_FUSION__ = {
    fusePersonas,
    getRecipes,
    canInherit,
    findCraftPath,
    state
  };
}
