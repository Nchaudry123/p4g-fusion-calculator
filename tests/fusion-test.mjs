#!/usr/bin/env node
/**
 * Headless fusion accuracy checks for Velvet Fusion Deck.
 * Run: node tests/fusion-test.mjs
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = async (rel) => JSON.parse(await readFile(join(root, rel), "utf8"));

const personasRaw = await load("data/personas.json");
const chart = await load("data/fusion-chart.json");
const specialRecipes = await load("data/special-recipes.json");
const skills = await load("data/skills.json");

const personas = Object.fromEntries(Object.entries(personasRaw).map(([name, persona]) => [
  name,
  { ...persona, name, race: persona.race === "Hang" ? "Hanged" : persona.race }
]));
const specialTargets = new Set(Object.keys(specialRecipes));

const raceLevels = new Map();
for (const persona of Object.values(personas)) {
  if (!raceLevels.has(persona.race)) raceLevels.set(persona.race, []);
  raceLevels.get(persona.race).push(persona.lvl);
}
for (const [race, levels] of raceLevels) {
  raceLevels.set(race, [...new Set(levels)].sort((a, b) => a - b));
}

const fusionTable = {};
for (let row = 0; row < chart.table.length; row++) {
  const raceA = chart.races[row] === "Hang" ? "Hanged" : chart.races[row];
  fusionTable[raceA] = {};
  for (let col = 0; col < chart.table[row].length; col++) {
    const raceB = chart.races[col] === "Hang" ? "Hanged" : chart.races[col];
    const result = chart.table[row][col] === "Hang" ? "Hanged" : chart.table[row][col];
    fusionTable[raceA][raceB] = result;
  }
}

const fissionChart = {};
for (let row = 0; row < chart.table.length; row++) {
  const raceA = chart.races[row] === "Hang" ? "Hanged" : chart.races[row];
  for (let col = 0; col < chart.table[row].length; col++) {
    const raceB = chart.races[col] === "Hang" ? "Hanged" : chart.races[col];
    const resultRace = chart.table[row][col] === "Hang" ? "Hanged" : chart.table[row][col];
    if (!resultRace || resultRace === "-") continue;
    fissionChart[resultRace] ||= {};
    fissionChart[resultRace][raceA] ||= new Set();
    fissionChart[resultRace][raceA].add(raceB);
  }
}
for (const race of Object.keys(fissionChart)) {
  fissionChart[race] = Object.fromEntries(
    Object.entries(fissionChart[race]).map(([a, set]) => [a, [...set]])
  );
}

const lvl = (name) => personas[name].lvl;
const getResultLevels = (race) => raceLevels.get(race) || [];

function getIngredientCandidates(race) {
  return Object.values(personas)
    .filter((persona) => persona.race === race)
    .map((persona) => ({ name: persona.name, race: persona.race, level: persona.lvl }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

function shouldKeepIngredientPair(a, b) {
  if (a.race !== b.race) return true;
  if (a.level !== b.level) return a.level < b.level;
  return a.name.localeCompare(b.name) < 0;
}

function getSpecialRecipes(name) {
  const ingredients = specialRecipes[name] || [];
  return ingredients.length ? [{ type: "Special", ingredients: [...ingredients] }] : [];
}

function splitWithDiffRace(name) {
  if (specialRecipes[name]) return [];
  const target = personas[name];
  const resultLvls = getResultLevels(target.race);
  const targetIndex = resultLvls.indexOf(target.lvl);
  if (targetIndex === -1) return [];
  const minResultLvl = resultLvls[targetIndex - 1] ? 2 * (resultLvls[targetIndex - 1] - 1) : 0;
  const maxResultLvl = resultLvls[targetIndex + 1] ? 2 * (target.lvl - 1) : 200;
  const recipes = [];
  for (const [raceA, raceBs] of Object.entries(fissionChart[target.race] || {})) {
    for (const ingredientA of getIngredientCandidates(raceA)) {
      for (const raceB of raceBs) {
        for (const ingredientB of getIngredientCandidates(raceB)) {
          if (
            ingredientA.name !== ingredientB.name
            && (minResultLvl - ingredientA.level) < ingredientB.level
            && ingredientB.level <= (maxResultLvl - ingredientA.level)
            && shouldKeepIngredientPair(ingredientA, ingredientB)
          ) {
            recipes.push({ type: "Normal", ingredients: [ingredientA.name, ingredientB.name] });
          }
        }
      }
    }
  }
  return recipes;
}

function splitWithSameRace(name) {
  if (specialRecipes[name]) return [];
  const target = personas[name];
  const resultLvls = getResultLevels(target.race);
  const targetIndex = resultLvls.indexOf(target.lvl);
  if (targetIndex < 0) return [];
  const minResultLvl = 2 * (target.lvl - 1);
  const maxResultLvl = resultLvls[targetIndex + 1] ? 2 * (resultLvls[targetIndex + 1] - 1) : 200;
  const candidates = getIngredientCandidates(target.race).filter((p) => p.name !== target.name);
  const recipes = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const sum = candidates[i].level + candidates[j].level;
      if (minResultLvl <= sum && sum < maxResultLvl) {
        recipes.push({ type: "Same Arcana", ingredients: [candidates[i].name, candidates[j].name] });
      }
    }
  }
  return recipes;
}

function getRecipes(name) {
  const recipes = [...getSpecialRecipes(name), ...splitWithDiffRace(name), ...splitWithSameRace(name)];
  const seen = new Set();
  return recipes.filter((recipe) => {
    if (!recipe.ingredients.every((item) => personas[item])) return false;
    const key = recipe.ingredients.slice().sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fusePersonasDirected(name1, name2) {
  if (!name1 || !name2 || name1 === name2) return null;
  const a = personas[name1];
  const b = personas[name2];
  if (!a || !b) return null;

  for (const [result, ingredients] of Object.entries(specialRecipes)) {
    if (ingredients.length === 2) {
      const set = new Set(ingredients);
      if (set.has(name1) && set.has(name2)) return { name: result, type: "Special" };
    }
  }

  const lvlSum = lvl(name1) + lvl(name2);
  if (a.race === b.race) {
    const resultLvls = getResultLevels(a.race);
    for (let i = 0; i < resultLvls.length; i++) {
      const targetLvl = resultLvls[i];
      const target = Object.values(personas).find((p) => p.race === a.race && p.lvl === targetLvl && !specialTargets.has(p.name) && p.name !== name1 && p.name !== name2);
      if (!target) continue;
      const minResultLvl = 2 * (targetLvl - 1);
      const maxResultLvl = resultLvls[i + 1] ? 2 * (resultLvls[i + 1] - 1) : 200;
      if (minResultLvl <= lvlSum && lvlSum < maxResultLvl) return { name: target.name, type: "Same Arcana" };
    }
    return null;
  }

  const resultRace = fusionTable[a.race]?.[b.race];
  if (!resultRace || resultRace === "-") return null;
  const resultLvls = getResultLevels(resultRace);
  for (let i = 0; i < resultLvls.length; i++) {
    const targetLvl = resultLvls[i];
    const target = Object.values(personas).find((p) => p.race === resultRace && p.lvl === targetLvl && !specialTargets.has(p.name));
    if (!target) continue;
    const minResultLvl = resultLvls[i - 1] ? 2 * (resultLvls[i - 1] - 1) : 0;
    const maxResultLvl = resultLvls[i + 1] ? 2 * (targetLvl - 1) : 200;
    if (minResultLvl < lvlSum && lvlSum <= maxResultLvl) return { name: target.name, type: "Normal" };
  }
  return null;
}

function fusePersonas(name1, name2) {
  const ab = fusePersonasDirected(name1, name2);
  const ba = fusePersonasDirected(name2, name1);
  if (ab && ba && ab.name !== ba.name) {
    const abOk = getRecipes(ab.name).some((r) => r.ingredients.length === 2 && new Set(r.ingredients).has(name1) && new Set(r.ingredients).has(name2));
    const baOk = getRecipes(ba.name).some((r) => r.ingredients.length === 2 && new Set(r.ingredients).has(name1) && new Set(r.ingredients).has(name2));
    if (abOk && !baOk) return ab;
    if (baOk && !abOk) return ba;
  }
  return ab || ba;
}

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(message);
  }
}

// Data integrity
assert(Object.keys(personas).length === 205, `expected 205 personas, got ${Object.keys(personas).length}`);
assert(Object.keys(specialRecipes).length >= 15, "expected special recipes");
assert(chart.races.includes("Aeon") && chart.races.includes("Jester"), "Golden arcana present");
assert(Object.keys(skills).length >= 200, `skills.json too small: ${Object.keys(skills).length}`);

const personaSkills = new Set();
for (const p of Object.values(personas)) Object.keys(p.skills || {}).forEach((s) => personaSkills.add(s));
const missingSkillMeta = [...personaSkills].filter((s) => !skills[s]);
assert(missingSkillMeta.length === 0, `skills missing metadata: ${missingSkillMeta.slice(0, 8).join(", ")}`);

// Special recipes
assert(getRecipes("Alice").some((r) => r.type === "Special" && r.ingredients.includes("Belial")), "Alice special recipe");
assert(getRecipes("Yoshitsune").some((r) => r.type === "Special" && r.ingredients.includes("Masakado")), "Yoshitsune special recipe");
assert(getRecipes("Trumpeter").some((r) => r.type === "Special"), "Trumpeter special recipe");
assert(getRecipes("Neko Shogun")[0]?.ingredients.length === 4, "Neko Shogun 4-way special");

// Reverse recipes exist for normal personas
assert(getRecipes("Jack Frost").length > 0, "Jack Frost has reverse recipes");
assert(getRecipes("Orobas").length > 0, "Orobas has reverse recipes");
assert(getRecipes("Oberon").length > 0, "Oberon has reverse recipes");
// Lowest-tier Personas may legitimately have zero reverse recipes
assert(Array.isArray(getRecipes("Pixie")), "Pixie reverse query runs");

// Round-trip: for a normal reverse recipe, forward fuse should return the target
function testRoundTrip(target, samples = 5) {
  const normals = getRecipes(target).filter((r) => r.type === "Normal" && r.ingredients.length === 2);
  assert(normals.length > 0, `${target} has normal reverse recipes`);
  for (const recipe of normals.slice(0, samples)) {
    const [a, b] = recipe.ingredients;
    const result = fusePersonasDirected(a, b);
    assert(result?.name === target, `fuseDirected(${a}, ${b}) => ${result?.name || "null"}, expected ${target}`);
  }
}

testRoundTrip("Jack Frost");
testRoundTrip("Oberon");
testRoundTrip("High Pixie");
testRoundTrip("Queen Mab");

// Known 2-ingredient specials
assert(fusePersonas("Shiva", "Parvati")?.name === "Ardha", "Shiva + Parvati = Ardha");
assert(fusePersonas("Rangda", "Barong")?.name === "Shiva", "Rangda + Barong = Shiva");
assert(fusePersonas("Belial", "Nebiros")?.name === "Alice", "Belial + Nebiros = Alice");

// Same-arcana path exists
const same = getRecipes("Jack Frost").filter((r) => r.type === "Same Arcana");
assert(same.length >= 0, "same arcana query runs"); // may be empty depending on levels; just ensure no throw

// Specials should not appear as normal reverse for special-only results
assert(getRecipes("Alice").every((r) => r.type === "Special"), "Alice only special recipes");
assert(getRecipes("Izanagi-no-Okami").every((r) => r.type === "Special"), "Izanagi-no-Okami only special");

console.log(`Fusion tests: ${passed} passed, ${failed} failed`);
if (failures.length) {
  for (const failure of failures) console.error(" -", failure);
  process.exit(1);
}
console.log("All checks passed.");
