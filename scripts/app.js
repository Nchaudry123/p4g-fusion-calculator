const RESIST_LABELS = ["Phy", "Fire", "Ice", "Elec", "Wind", "Light", "Dark", "Alm"];
const STAT_LABELS = ["St", "Ma", "En", "Ag", "Lu"];
const INTRO_SEEN_KEY = "p4g-fusion-intro-seen";
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
  drawTimer: 0,
  searchTimer: 0
};

const $ = (selector) => document.querySelector(selector);

setupIntro();

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
  buildRaceLevels();
  setupSearch();
  renderInitialState();
}).catch((error) => {
  $("#recipes").innerHTML = `<div class="empty">Could not load fusion data: ${escapeHtml(error.message)}</div>`;
});

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
  const datalist = $("#personaOptions");
  datalist.innerHTML = state.names.concat(state.arcanas).map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
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
  return state.names.find((name) => name.toLowerCase() === normalized)
    || state.names.find((name) => name.toLowerCase().includes(normalized));
}

function findArcana(value) {
  const normalized = value.trim().toLowerCase();
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
        <em>Lv ${persona.lvl} / ${escapeHtml(persona.race)}</em>
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
      <em>${target ? `Top draw: ${escapeHtml(target.name)} / Lv ${target.lvl} ${escapeHtml(target.race)}` : `No draw yet for "${escapeHtml(query)}"`}</em>
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
      <em>Priority ${state.queue.indexOf(name) + 1 || 1} / Lv ${target.lvl} ${escapeHtml(target.race)}</em>
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
      <span class="card-corner">P4G</span>
      <img src="${escapeAttr(personaImage(cardName))}" alt="">
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
      <img src="${escapeAttr(personaImage(persona.name))}" alt="">
      <strong>${escapeHtml(persona.name)}</strong>
      <em>Lv ${persona.lvl} / ${escapeHtml(persona.race)}</em>
    </div>
  `;
}

function selectPersona(name, primary = false) {
  state.active = name;
  $("#personaSearch").value = name;
  if (primary) state.queue = [name];
  else addToQueue(name);
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
          <span class="queue-meta">Lv ${persona.lvl} ${escapeHtml(persona.race)}</span>
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
  const stats = (persona.stats || []).map((value, index) => (
    `<span class="stat">${STAT_LABELS[index]} ${value}</span>`
  )).join("");
  const resists = decodeResists(persona.resists).map((item) => (
    `<span class="resist ${item.kind}"><strong>${item.label}</strong>${item.value}</span>`
  )).join("");
  const skills = renderSkills(persona);
  const image = personaImage(persona.name);
  const badges = renderPersonaBadges(persona.name);

  $("#activePersona").innerHTML = `
    <article class="persona-card">
      <div class="persona-visual">
        <img src="${escapeAttr(image)}" alt="${escapeAttr(persona.name)} artwork" loading="lazy">
      </div>
      <div class="persona-info">
        <div class="persona-heading">
          <div>
            <h2 class="persona-name">${escapeHtml(persona.name)}</h2>
            <div class="persona-meta">Level ${persona.lvl} / ${escapeHtml(persona.race)} / ${escapeHtml(persona.inherits || "inheritance")} type</div>
            ${badges ? `<div class="persona-badges">${badges}</div>` : ""}
          </div>
          <div class="arcana-badge">
            <span>Lv ${persona.lvl}</span>
            <strong>${escapeHtml(persona.race)}</strong>
          </div>
        </div>
        <div class="stats">${stats}</div>
        <section class="detail-block">
          <h3>Resistances</h3>
          <div class="resist-grid">${resists}</div>
        </section>
        <section class="detail-block">
          <h3>Moves</h3>
          <div class="skill-list">${skills}</div>
        </section>
      </div>
    </article>
  `;
}

function personaImage(name) {
  return state.personaImages[name] || "assets/personas/taowu.png";
}

function renderSkills(persona) {
  return Object.entries(persona.skills || {}).map(([skill, learned]) => {
    const detail = state.skills[skill] || {};
    const learnedText = learned < 1 ? "Innate" : `Lv ${learned}`;
    return `
      <div class="skill-row">
        <span class="skill-name">${escapeHtml(skill)}</span>
        <span class="skill-meta">${escapeHtml(learnedText)} / ${escapeHtml(detail.element || "skill")} / ${escapeHtml(detail.target || "self")}</span>
      </div>
    `;
  }).join("") || `<div class="empty mini-empty">No learned moves listed.</div>`;
}

function renderRecipes() {
  const recipes = getRecipes(state.active);
  const specialCount = recipes.filter((recipe) => recipe.type === "Special").length;
  $("#recipeSummary").innerHTML = [
    `<span class="chip">${recipes.length} recipes</span>`,
    `<span class="chip">${specialCount} special</span>`,
    `<span class="chip">${Math.max(0, recipes.length - specialCount)} normal</span>`
  ].join("");

  if (!recipes.length) {
    $("#recipes").innerHTML = `<div class="empty">No reverse fusion recipes were found for ${escapeHtml(state.active)}.</div>`;
    return;
  }

  $("#recipes").innerHTML = recipes.map((recipe, index) => renderRecipe(recipe, index)).join("");
  $("#recipes").querySelectorAll("[data-persona]").forEach((button) => {
    button.addEventListener("click", () => selectPersona(button.dataset.persona, false));
  });
}

function renderRecipe(recipe, index) {
  const isSpecialLayout = recipe.ingredients.length > 2;
  const targetBadges = renderPersonaBadges(state.active, "recipe");
  const ingredients = isSpecialLayout
    ? `
      <div class="special-fusion-note">
        <span>${recipe.ingredients.length}-Persona special fusion</span>
        <strong>Use every ingredient below</strong>
      </div>
      <div class="special-fusion-grid">
        ${recipe.ingredients.map((name, i) => renderIngredientButton(name, i, true)).join("")}
      </div>
    `
    : `
      <div class="fusion-equation">
        ${recipe.ingredients.map((name, i) => `
          ${renderIngredientButton(name, i, false)}
          ${i < recipe.ingredients.length - 1 ? `<div class="fusion-x">x</div>` : ""}
        `).join("")}
      </div>
    `;

  return `
    <article class="recipe ${isSpecialLayout ? "is-special-fusion" : ""}" style="--i: ${index}">
      <div class="recipe-head">
        <span class="recipe-title">Recipe ${index + 1}</span>
        <span class="recipe-meta">${recipe.type}${recipe.score ? ` / Lv sum ${recipe.score}` : ""}</span>
      </div>
      ${targetBadges ? `<div class="recipe-flags">${targetBadges}</div>` : ""}
      <div class="ingredients">${ingredients}</div>
    </article>
  `;
}

function renderIngredientButton(name, index, showStep) {
  const persona = state.personas[name];
  return `
    <button class="persona-button ${showStep ? "special-ingredient" : ""}" type="button" data-persona="${escapeAttr(name)}">
      ${showStep ? `<span class="ingredient-step">${index + 1}</span>` : ""}
      <img src="${escapeAttr(personaImage(name))}" alt="" loading="lazy">
      <span>
        <strong>${escapeHtml(name)}</strong>
        <span class="mini">Lv ${persona?.lvl ?? "?"} ${escapeHtml(persona?.race ?? "")}</span>
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
    score: ingredients.reduce((sum, ingredient) => sum + (state.personas[ingredient]?.lvl || 0), 0)
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
    for (const lvlA of getIngredientLevels(raceA)) {
      const minLvlB = minResultLvl - lvlA;
      const maxLvlB = maxResultLvl - lvlA;
      for (const raceB of raceBs) {
        for (const lvlB of getIngredientLevels(raceB)) {
          if (minLvlB < lvlB && lvlB <= maxLvlB && (raceA !== raceB || lvlA < lvlB)) {
            recipes.push({
              type: "Normal",
              ingredients: [reverseLookup(raceA, lvlA), reverseLookup(raceB, lvlB)],
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
  const nextResultLvl = resultLvls[targetIndex + 2] ? 2 * (resultLvls[targetIndex + 2] - 1) : 200;
  const ingLvls = getIngredientLevels(target.race).filter((lvl) => lvl !== target.lvl);
  const ingLvlM = maxResultLvl / 2 + 1;
  const recipes = [];

  for (const ingLvl2 of ingLvls) {
    if (ingLvlM < ingLvl2 && ingLvlM + ingLvl2 < nextResultLvl) {
      recipes.push({
        type: "Same Arcana",
        ingredients: [reverseLookup(target.race, ingLvlM), reverseLookup(target.race, ingLvl2)],
        score: ingLvlM + ingLvl2
      });
    }
  }

  for (let i = 0; i < ingLvls.length; i++) {
    for (let j = i + 1; j < ingLvls.length; j++) {
      const lvl1 = ingLvls[i];
      const lvl2 = ingLvls[j];
      if (minResultLvl <= lvl1 + lvl2 && lvl1 + lvl2 < maxResultLvl) {
        recipes.push({
          type: "Same Arcana",
          ingredients: [reverseLookup(target.race, lvl1), reverseLookup(target.race, lvl2)],
          score: lvl1 + lvl2
        });
      }
    }
  }

  return recipes;
}

function getIngredientLevels(race) {
  return getResultLevels(race);
}

function getResultLevels(race) {
  return state.raceLevels.get(race) || [];
}

function reverseLookup(race, level) {
  const match = Object.values(state.personas).find((persona) => persona.race === race && persona.lvl === level);
  return match?.name || "";
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
