/**
 * Needed gameplay features for Velvet Fusion Deck.
 * Loads after app.js and hooks via p4g-ready / window.__P4G_FUSION__.
 */
(function () {
  const RECENT_KEY = "p4g-fusion-recent";
  const BOOKMARK_KEY = "p4g-fusion-bookmarks";
  const PATH_KEY = "p4g-fusion-path-checklist";
  const CONTRAST_KEY = "p4g-fusion-high-contrast";

  let api = null;

  function boot() {
    api = window.__P4G_FUSION__;
    if (!api) return;
    loadPersisted();
    setupCraft();
    setupCompare();
    setupRecentsBookmarks();
    setupUltimates();
    setupContrast();
    setupOfflinePack();
    setupKeyboard();
    setupInheritProviders();
    setupStripBookmark();
    api.state.pathChecklist = api.state.pathChecklist || {};
    window.p4gPersistPathChecklist = persistPathChecklist;
    window.p4gTrackRecent = trackRecent;
    window.p4gRenderCraft = renderCraft;
    window.p4gRenderCompare = renderCompare;
    window.p4gRenderLogExtras = renderLogExtras;
    window.p4gRenderInheritProviders = renderInheritProviders;
    renderLogExtras();
    if (api.state.highContrast) document.body.classList.add("high-contrast");
    const ver = document.getElementById("appVersion");
    if (ver) ver.textContent = "v2026.07 · fan tool, not affiliated with Atlus/SEGA";

    // Keep Craft tab fresh when ownership flips anywhere in the app.
    const originalToggle = api.togglePersonaOwned;
    if (typeof originalToggle === "function") {
      api.togglePersonaOwned = function patchedToggle(name) {
        originalToggle(name);
        renderUltimates();
        if (api.state.activeCalculatorTab === "craft") renderCraft();
      };
      // also expose for direct state mutations path if needed
      window.__P4G_FUSION__.togglePersonaOwned = api.togglePersonaOwned;
    }
  }

  function loadPersisted() {
    try {
      api.state.recentPersonas = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").filter((n) => api.state.personas[n]);
      api.state.bookmarks = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || "[]").filter((n) => api.state.personas[n]);
      api.state.pathChecklist = JSON.parse(localStorage.getItem(PATH_KEY) || "{}");
      api.state.highContrast = localStorage.getItem(CONTRAST_KEY) === "1";
    } catch {
      api.state.recentPersonas = [];
      api.state.bookmarks = [];
      api.state.pathChecklist = {};
    }
  }

  function persistPathChecklist() {
    try { localStorage.setItem(PATH_KEY, JSON.stringify(api.state.pathChecklist)); } catch { /* ignore */ }
  }

  function trackRecent(name) {
    if (!name || !api.state.personas[name]) return;
    api.state.recentPersonas = [name, ...api.state.recentPersonas.filter((n) => n !== name)].slice(0, 12);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(api.state.recentPersonas)); } catch { /* ignore */ }
    renderLogExtras();
  }

  function toggleBookmark(name) {
    if (!name) return;
    if (api.state.bookmarks.includes(name)) {
      api.state.bookmarks = api.state.bookmarks.filter((n) => n !== name);
      api.showToast(`Removed bookmark ${name}`);
    } else {
      api.state.bookmarks = [name, ...api.state.bookmarks].slice(0, 24);
      api.showToast(`Bookmarked ${name}`);
    }
    try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(api.state.bookmarks)); } catch { /* ignore */ }
    renderLogExtras();
    updateStripBookmark();
  }

  function setupStripBookmark() {
    document.getElementById("stripBookmark")?.addEventListener("click", () => {
      if (api.state.active) toggleBookmark(api.state.active);
    });
  }

  function updateStripBookmark() {
    const btn = document.getElementById("stripBookmark");
    if (!btn || !api.state.active) return;
    btn.textContent = api.state.bookmarks.includes(api.state.active) ? "Bookmarked" : "Bookmark";
  }

  function setupRecentsBookmarks() {
    // rendered via renderLogExtras
  }

  function renderLogExtras() {
    const recent = document.getElementById("recentList");
    const marks = document.getElementById("bookmarkList");
    if (recent) {
      recent.innerHTML = api.state.recentPersonas.length
        ? api.state.recentPersonas.map((name) => chipButton(name)).join("")
        : `<span class="level-empty">No recent searches yet.</span>`;
      bindChipClicks(recent);
    }
    if (marks) {
      marks.innerHTML = api.state.bookmarks.length
        ? api.state.bookmarks.map((name) => chipButton(name, true)).join("")
        : `<span class="level-empty">Bookmark Personas from the target strip.</span>`;
      bindChipClicks(marks);
    }
    renderUltimates();
    updateStripBookmark();
  }

  function chipButton(name, bookmarked = false) {
    return `<button type="button" class="nav-chip ${bookmarked ? "is-bookmarked" : ""}" data-open-persona="${api.escapeAttr(name)}">${api.escapeHtml(name)}</button>`;
  }

  function bindChipClicks(root) {
    root.querySelectorAll("[data-open-persona]").forEach((btn) => {
      btn.addEventListener("click", () => {
        api.setCalculatorTab("search");
        api.selectPersona(btn.dataset.openPersona, true);
      });
    });
  }

  /* ---------- Craft from owned ---------- */
  function setupCraft() {
    document.querySelectorAll("[data-craft-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        api.state.craftFilter = button.dataset.craftFilter;
        document.querySelectorAll("[data-craft-filter]").forEach((b) => {
          b.classList.toggle("is-active", b.dataset.craftFilter === api.state.craftFilter);
        });
        renderCraft();
      });
    });
  }

  function listCraftable() {
    const owned = api.state.ownedPersonas;
    const results = [];

    // Specials
    for (const [result, ingredients] of Object.entries(api.state.specialRecipes)) {
      const missing = ingredients.filter((n) => !owned.has(n));
      results.push({
        name: result,
        type: "Special",
        ingredients: [...ingredients],
        missing: missing.length,
        missingNames: missing,
        score: ingredients.reduce((s, n) => s + api.getPersonaLevel(n), 0),
        special: true
      });
    }

    // Normals: only scan when we have owned Personas (performance)
    if (owned.size) {
      const ownedList = [...owned];
      const seen = new Set(results.map((r) => `${r.name}|special`));
      // Pair owned with owned + sample missing partners via reverse of interesting targets
      // Faster approach: for each special-adjacent normal target that is almost ready
      // Use reverse recipes for all non-special personas is too heavy; instead
      // fuse owned pairs (directed both ways).
      for (let i = 0; i < ownedList.length; i++) {
        for (let j = 0; j < ownedList.length; j++) {
          if (i === j) continue;
          const a = ownedList[i];
          const b = ownedList[j];
          const fused = api.fusePersonasDirected(a, b);
          if (!fused) continue;
          const key = `${fused.name}|normal|${[a, b].sort().join("+")}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({
            name: fused.name,
            type: fused.type,
            ingredients: [a, b],
            missing: 0,
            missingNames: [],
            score: api.getPersonaLevel(a) + api.getPersonaLevel(b),
            special: false
          });
        }
      }

      // 1-missing: for each owned, try fusing with non-owned of result-producing races
      // Sample: get reverse recipes for high-value targets (specials + ultimates + mid-high levels)
      const watch = new Set([
        ...Object.keys(api.state.specialRecipes),
        ...Object.keys(api.SOCIAL_LINK_UNLOCKS),
        ...api.state.names.filter((n) => api.state.personas[n].lvl >= 40)
      ]);
      for (const target of watch) {
        if (owned.has(target)) continue;
        const recipes = api.getRecipes(target).slice(0, 40);
        for (const recipe of recipes) {
          if (recipe.ingredients.length !== 2 && recipe.type !== "Special") continue;
          const miss = recipe.ingredients.filter((n) => !owned.has(n));
          if (miss.length !== 1) continue;
          const key = `${target}|1|${recipe.ingredients.slice().sort().join("+")}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({
            name: target,
            type: recipe.type,
            ingredients: [...recipe.ingredients],
            missing: 1,
            missingNames: miss,
            score: recipe.score || 0,
            special: recipe.type === "Special"
          });
        }
      }
    }

    // Dedupe by name keeping lowest missing then lowest score
    const best = new Map();
    for (const row of results) {
      const prev = best.get(row.name);
      if (!prev || row.missing < prev.missing || (row.missing === prev.missing && row.score < prev.score)) {
        best.set(row.name, row);
      }
    }
    return [...best.values()].sort((a, b) => a.missing - b.missing || a.score - b.score || a.name.localeCompare(b.name));
  }

  function renderCraft() {
    const list = document.getElementById("craftList");
    const stats = document.getElementById("craftStats");
    if (!list) return;
    if (!api.state.ownedPersonas.size) {
      list.innerHTML = `<div class="empty">Mark Personas as owned in the Log tab, then return here to see ready fusions.</div>`;
      if (stats) stats.innerHTML = `<span><strong>0</strong> owned</span>`;
      return;
    }

    let rows = listCraftable();
    const filter = api.state.craftFilter || "ready";
    if (filter === "ready") rows = rows.filter((r) => r.missing === 0);
    else if (filter === "one") rows = rows.filter((r) => r.missing === 1);
    else if (filter === "specials") rows = rows.filter((r) => r.special);

    if (stats) {
      const all = listCraftable();
      stats.innerHTML = `
        <span><strong>${api.state.ownedPersonas.size}</strong> owned</span>
        <span><strong>${all.filter((r) => r.missing === 0).length}</strong> ready</span>
        <span><strong>${all.filter((r) => r.missing === 1).length}</strong> one missing</span>
        <span><strong>${rows.length}</strong> shown</span>
      `;
    }

    if (!rows.length) {
      list.innerHTML = `<div class="empty">Nothing matches this craft filter yet. Own more ingredients or switch filters.</div>`;
      return;
    }

    list.innerHTML = rows.slice(0, 60).map((row) => `
      <article class="craft-card ${row.missing === 0 ? "is-ready" : ""}">
        <button type="button" class="craft-main" data-open-persona="${api.escapeAttr(row.name)}">
          <img src="${api.escapeAttr(api.personaImage(row.name))}" alt="" loading="lazy">
          <span>
            <strong>${api.escapeHtml(row.name)}</strong>
            <em>${api.escapeHtml(row.type)} · Lv sum ${row.score} · ${row.missing === 0 ? "ready" : `missing ${row.missingNames.map(api.escapeHtml).join(", ")}`}</em>
            <span class="craft-ings">${row.ingredients.map(api.escapeHtml).join(" + ")}</span>
          </span>
        </button>
        <div class="craft-actions">
          <button type="button" class="ghost-button" data-open-persona="${api.escapeAttr(row.name)}">Open</button>
          <button type="button" class="primary-button compact-button" data-craft-path="${api.escapeAttr(row.name)}">Path</button>
        </div>
      </article>
    `).join("");

    list.querySelectorAll("[data-open-persona]").forEach((btn) => {
      btn.addEventListener("click", () => {
        api.setCalculatorTab("search");
        api.selectPersona(btn.dataset.openPersona, true);
      });
    });
    list.querySelectorAll("[data-craft-path]").forEach((btn) => {
      btn.addEventListener("click", () => {
        api.setCalculatorTab("search");
        api.selectPersona(btn.dataset.craftPath, true);
        api.renderPathPlan(btn.dataset.craftPath);
      });
    });
  }

  /* ---------- Inheritance providers ---------- */
  function setupInheritProviders() {}

  function renderInheritProviders() {
    const host = document.getElementById("inheritProviders");
    if (!host || !api.state.active) {
      if (host) host.innerHTML = "";
      return;
    }
    const target = api.state.active;
    const skills = api.state.desiredSkills;
    if (!skills.length) {
      host.innerHTML = `<div class="empty mini-empty">Track desired skills above to see which parents can supply them for ${api.escapeHtml(target)}.</div>`;
      return;
    }

    const recipes = api.getFilteredSortedRecipes(target).slice(0, 12);
    const blocks = skills.map((skill) => {
      const can = api.canInherit(target, skill);
      const native = api.state.personas[target]?.skills && skill in api.state.personas[target].skills;
      const providers = [];
      for (const recipe of recipes) {
        for (const ing of recipe.ingredients) {
          const p = api.state.personas[ing];
          if (p?.skills && skill in p.skills && !providers.includes(ing)) providers.push(ing);
        }
      }
      // Also scan all personas for the skill (top 8 by level)
      if (providers.length < 4) {
        for (const name of api.state.names) {
          const p = api.state.personas[name];
          if (p.skills && skill in p.skills && !providers.includes(name)) providers.push(name);
          if (providers.length >= 8) break;
        }
      }

      const status = native
        ? "Already on this Persona (native/learnset)"
        : can
          ? "Affinity allows inheritance"
          : "Likely blocked by inheritance type";

      return `
        <article class="provider-card ${can || native ? "is-ok" : "is-blocked"}">
          <header>
            <strong>${api.escapeHtml(skill)}</strong>
            <span>${api.escapeHtml(status)}</span>
          </header>
          <div class="provider-list">
            ${providers.length ? providers.map((name) => `
              <button type="button" class="nav-chip" data-open-persona="${api.escapeAttr(name)}">${api.escapeHtml(name)}</button>
            `).join("") : `<span class="level-empty">No known carriers in data.</span>`}
          </div>
        </article>
      `;
    }).join("");

    host.innerHTML = `<h3 class="partners-title">Skill sources for ${api.escapeHtml(target)}</h3>${blocks}`;
    bindChipClicks(host);
  }

  /* ---------- Ultimates ---------- */
  function setupUltimates() {}

  function renderUltimates() {
    const host = document.getElementById("ultimatesList");
    if (!host) return;
    const entries = Object.entries(api.SOCIAL_LINK_UNLOCKS);
    const owned = entries.filter(([name]) => api.state.ownedPersonas.has(name)).length;
    host.innerHTML = `
      <div class="ultimates-meta">${owned}/${entries.length} ultimates owned</div>
      <div class="ultimates-grid">
        ${entries.map(([name, arcana]) => {
          const has = api.state.ownedPersonas.has(name);
          return `
            <article class="ultimate-card ${has ? "is-owned" : ""}">
              <button type="button" class="ultimate-main" data-open-persona="${api.escapeAttr(name)}">
                <img src="${api.escapeAttr(api.personaImage(name))}" alt="" loading="lazy">
                <span>
                  <strong>${api.escapeHtml(name)}</strong>
                  <em>${api.escapeHtml(arcana)} · max Social Link</em>
                </span>
              </button>
              <button type="button" class="ghost-button" data-toggle-ult="${api.escapeAttr(name)}">${has ? "Owned" : "Mark owned"}</button>
            </article>
          `;
        }).join("")}
      </div>
    `;
    bindChipClicks(host);
    host.querySelectorAll("[data-toggle-ult]").forEach((btn) => {
      btn.addEventListener("click", () => {
        api.togglePersonaOwned(btn.dataset.toggleUlt);
        renderUltimates();
        renderCraft();
      });
    });
  }

  /* ---------- Compare ---------- */
  function setupCompare() {
    document.getElementById("runCompare")?.addEventListener("click", () => {
      const a = findName(document.getElementById("compareA")?.value || "");
      const b = findName(document.getElementById("compareB")?.value || "");
      api.state.compareA = a;
      api.state.compareB = b;
      renderCompare();
    });
  }

  function findName(value) {
    const n = value.trim().toLowerCase();
    return api.state.names.find((name) => name.toLowerCase() === n)
      || api.state.names.find((name) => name.toLowerCase().includes(n))
      || "";
  }

  function renderCompare() {
    const host = document.getElementById("compareResult");
    if (!host) return;
    const a = api.state.compareA || findName(document.getElementById("compareA")?.value || "");
    const b = api.state.compareB || findName(document.getElementById("compareB")?.value || "");
    if (!a || !b) {
      host.innerHTML = `<div class="empty">Pick two Personas to compare stats, resists, and skills.</div>`;
      return;
    }
    const pa = api.state.personas[a];
    const pb = api.state.personas[b];
    const stats = (api.state.personas[a].stats || []).map((v, i) => {
      const labels = ["St", "Ma", "En", "Ag", "Lu"];
      const other = (pb.stats || [])[i] || 0;
      const win = v > other ? "is-win" : v < other ? "is-lose" : "";
      return `<span class="compare-stat ${win}"><strong>${labels[i]}</strong><em>${v}</em><i>${other}</i></span>`;
    }).join("");

    const skillsA = new Set(Object.keys(pa.skills || {}));
    const skillsB = new Set(Object.keys(pb.skills || {}));
    const onlyA = [...skillsA].filter((s) => !skillsB.has(s));
    const onlyB = [...skillsB].filter((s) => !skillsA.has(s));
    const both = [...skillsA].filter((s) => skillsB.has(s));

    host.innerHTML = `
      <div class="compare-grid">
        <article class="compare-col">
          <img src="${api.escapeAttr(api.personaImage(a))}" alt="">
          <h3>${api.escapeHtml(a)}</h3>
          <p>${api.escapeHtml(api.levelLabel(a))} · ${api.escapeHtml(pa.race)} · ${api.escapeHtml(pa.inherits || "")}</p>
        </article>
        <article class="compare-col">
          <img src="${api.escapeAttr(api.personaImage(b))}" alt="">
          <h3>${api.escapeHtml(b)}</h3>
          <p>${api.escapeHtml(api.levelLabel(b))} · ${api.escapeHtml(pb.race)} · ${api.escapeHtml(pb.inherits || "")}</p>
        </article>
      </div>
      <div class="compare-stats">${stats}</div>
      <div class="compare-skills">
        <div><strong>Shared</strong><span>${both.map(api.escapeHtml).join(", ") || "—"}</span></div>
        <div><strong>Only ${api.escapeHtml(a)}</strong><span>${onlyA.map(api.escapeHtml).join(", ") || "—"}</span></div>
        <div><strong>Only ${api.escapeHtml(b)}</strong><span>${onlyB.map(api.escapeHtml).join(", ") || "—"}</span></div>
      </div>
      <div class="margaret-actions">
        <button type="button" class="ghost-button" data-open-persona="${api.escapeAttr(a)}">Open A</button>
        <button type="button" class="ghost-button" data-open-persona="${api.escapeAttr(b)}">Open B</button>
      </div>
    `;
    bindChipClicks(host);
  }

  /* ---------- Contrast ---------- */
  function setupContrast() {
    const btn = document.getElementById("contrastToggle");
    const apply = () => {
      document.body.classList.toggle("high-contrast", api.state.highContrast);
      if (btn) {
        btn.setAttribute("aria-pressed", String(api.state.highContrast));
        btn.classList.toggle("is-active", api.state.highContrast);
      }
    };
    apply();
    btn?.addEventListener("click", () => {
      api.state.highContrast = !api.state.highContrast;
      try { localStorage.setItem(CONTRAST_KEY, api.state.highContrast ? "1" : "0"); } catch { /* ignore */ }
      apply();
      api.showToast(api.state.highContrast ? "High contrast on" : "High contrast off");
    });
  }

  /* ---------- Offline pack ---------- */
  function setupOfflinePack() {
    document.getElementById("offlinePackBtn")?.addEventListener("click", async () => {
      if (!("caches" in window)) {
        api.showToast("Cache API unavailable");
        return;
      }
      const btn = document.getElementById("offlinePackBtn");
      if (btn) btn.disabled = true;
      api.showToast("Caching Persona art…");
      try {
        const cache = await caches.open("velvet-fusion-deck-images-v1");
        const paths = Object.values(api.state.personaImages || {});
        let done = 0;
        const chunk = 20;
        for (let i = 0; i < paths.length; i += chunk) {
          const slice = paths.slice(i, i + chunk);
          await Promise.all(slice.map(async (path) => {
            try {
              const res = await fetch(path, { cache: "reload" });
              if (res.ok) await cache.put(path, res.clone());
            } catch { /* skip */ }
            done += 1;
          }));
          if (btn) btn.textContent = `Offline ${done}/${paths.length}`;
        }
        api.showToast(`Offline pack ready (${paths.length} images)`);
      } catch {
        api.showToast("Offline pack failed");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Offline pack";
        }
      }
    });
  }

  /* ---------- Keyboard ---------- */
  function setupKeyboard() {
    const tabs = ["search", "forward", "player", "margaret", "craft", "compare"];
    window.addEventListener("keydown", (event) => {
      const tag = (event.target && event.target.tagName) || "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        api.setCalculatorTab("search");
        document.getElementById("personaSearch")?.focus();
        return;
      }
      if (typing) return;
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        const modal = document.getElementById("helpModal");
        if (modal) modal.hidden = false;
        return;
      }
      if (event.key === "Escape") {
        document.getElementById("helpModal").hidden = true;
        return;
      }
      if (event.key === "c") document.getElementById("contrastToggle")?.click();
      if (event.key === "f") document.getElementById("focusModeToggle")?.click();
      const num = Number(event.key);
      if (num >= 1 && num <= 6) {
        event.preventDefault();
        api.setCalculatorTab(tabs[num - 1]);
      }
    });
    document.getElementById("closeHelp")?.addEventListener("click", () => {
      document.getElementById("helpModal").hidden = true;
    });
    document.getElementById("helpModal")?.addEventListener("click", (event) => {
      if (event.target.id === "helpModal") event.target.hidden = true;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("p4g-ready", boot, { once: true });
  } else {
    document.addEventListener("p4g-ready", boot, { once: true });
    // If app already finished before this script ran:
    if (window.__P4G_FUSION__?.state?.names?.length) boot();
  }
})();
