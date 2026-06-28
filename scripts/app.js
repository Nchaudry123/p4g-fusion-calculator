const RESIST_LABELS = ["Phy", "Fire", "Ice", "Elec", "Wind", "Light", "Dark", "Alm"];
const STAT_LABELS = ["St", "Ma", "En", "Ag", "Lu"];
const state = {
  personas: {},
  names: [],
  raceLevels: new Map(),
  fissionChart: {},
  specialRecipes: {},
  personaImages: {},
  skills: {},
  active: "",
  queue: []
};

const $ = (selector) => document.querySelector(selector);

Promise.all([
  fetch("data/personas.json").then((res) => res.json()),
  fetch("data/fusion-chart.json").then((res) => res.json()),
  fetch("data/special-recipes.json").then((res) => res.json()),
  fetch("data/persona-images.json").then((res) => res.json()),
  fetch("data/skills.json").then((res) => res.json())
]).then(([personas, chart, specialRecipes, personaImages, skills]) => {
  state.personas = normalizePersonas(personas);
  state.names = Object.keys(state.personas).sort((a, b) => a.localeCompare(b));
  state.fissionChart = buildFissionChart(chart);
  state.specialRecipes = specialRecipes;
  state.personaImages = personaImages;
  state.skills = skills;
  buildRaceLevels();
  setupSearch();
  selectPersona("Yoshitsune", true);
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
  datalist.innerHTML = state.names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
  $("#selectSearch").addEventListener("click", () => selectPersonaFromInput());
  $("#personaSearch").addEventListener("keydown", (event) => {
    if (event.key === "Enter") selectPersonaFromInput();
  });
  $("#clearQueue").addEventListener("click", () => {
    state.queue = [];
    renderQueue();
  });
}

function selectPersonaFromInput() {
  const input = $("#personaSearch");
  const match = findPersona(input.value);
  if (!match) {
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

function selectPersona(name, primary = false) {
  state.active = name;
  $("#personaSearch").value = name;
  if (primary) state.queue = [name];
  else addToQueue(name);
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
  const buttons = recipe.ingredients.map((name, i) => {
    const persona = state.personas[name];
    const spacer = i < recipe.ingredients.length - 1 ? `<div class="fusion-x">x</div>` : "";
    return `
      <button class="persona-button" type="button" data-persona="${escapeAttr(name)}">
        <img src="${escapeAttr(personaImage(name))}" alt="" loading="lazy">
        <span>
          <strong>${escapeHtml(name)}</strong>
          <span class="mini">Lv ${persona?.lvl ?? "?"} ${escapeHtml(persona?.race ?? "")}</span>
        </span>
        <span class="mini">queue +</span>
      </button>
      ${spacer}
    `;
  }).join("");

  return `
    <article class="recipe" style="--i: ${index}">
      <div class="recipe-head">
        <span class="recipe-title">Recipe ${index + 1}</span>
        <span class="recipe-meta">${recipe.type}${recipe.score ? ` / Lv sum ${recipe.score}` : ""}</span>
      </div>
      <div class="ingredients">${buttons}</div>
    </article>
  `;
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
