let AGENTS = [];
(function loadAgentsFromPage() {
  try {
    var el = document.getElementById("agents-json-b64");
    if (el && el.textContent) {
      var b64 = el.textContent.replace(/\s/g, "");
      var json = decodeURIComponent(
        Array.prototype.map
          .call(atob(b64), function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
      AGENTS = JSON.parse(json);
    }
  } catch (e) {
    console.error(e);
    AGENTS = [];
  }
})();

function vfInvokeSeed(replaceExisting) {
  var action = window.__REMOTE_SEED__;
  if (!action) return;
  Visualforce.remoting.Manager.invokeAction(
    action,
    { replaceExisting: replaceExisting },
    function (result, event) {
      if (event.status) {
        if (result && result.success) {
          alert("Seed complete. Count: " + (result.count != null ? result.count : "?"));
          window.location.reload();
        } else {
          alert((result && result.message) || "Seed failed");
        }
      } else {
        alert(event.message || "Remote call failed");
      }
    },
    { escape: true, buffer: false }
  );
}

function vfInvokeCreate() {
  var ta = document.getElementById("vf-create-json");
  if (!ta || !ta.value.trim()) {
    alert("Paste JSON payload for createBlueprint (same shape as LWC).");
    return;
  }
  var action = window.__REMOTE_CREATE__;
  if (!action) return;
  Visualforce.remoting.Manager.invokeAction(
    action,
    { jsonPayload: ta.value.trim() },
    function (result, event) {
      if (event.status) {
        if (result && result.success) {
          alert("Created blueprint Id: " + result.recordId);
          window.location.reload();
        } else {
          alert((result && result.message) || "Create failed");
        }
      } else {
        alert(event.message || "Remote call failed");
      }
    },
    { escape: true, buffer: false }
  );
}
const FIELD_DEFS = [
      { key: "agentName", label: "Agent Name" },
      { key: "description", label: "Description" },
      { key: "instructions", label: "Instructions" },
      { key: "model", label: "Model" },
      { key: "knowledge", label: "Knowledge" },
      { key: "personalization", label: "Personalization (example prompts)" }
    ];

    const SUB_AGENT_FIELD_DEFS = [
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
      { key: "instructions", label: "Instructions" },
      { key: "model", label: "Model" }
    ];

    const categoryList = [...new Set(AGENTS.map((a) => a.category))].sort((a, b) => a.localeCompare(b));
    const allTags = [...new Set(AGENTS.flatMap((a) => a.tags))].sort((a, b) => a.localeCompare(b));

    /** Empty set = no filter (show all). Multiple selections use OR within each dimension. */
    const activeCategories = new Set();
    const activeTags = new Set();
    let searchQuery = "";

    const grid = document.getElementById("card-grid");
    const categoryChips = document.getElementById("category-chips");
    const tagChips = document.getElementById("tag-chips");
    const searchInput = document.getElementById("search");
    const countPill = document.getElementById("count-pill");
    const toast = document.getElementById("toast");
    const dialog = document.getElementById("detail-dialog");
    const dialogTitle = document.getElementById("dialog-title");
    const dialogTags = document.getElementById("dialog-tags");
    const dialogFields = document.getElementById("dialog-fields");
    const dialogCopyAll = document.getElementById("dialog-copy-all");
    let dialogAgent = null;

    function normalize(s) {
      return (s || "").toLowerCase();
    }

    function searchHaystack(a) {
      const subSlice =
        Array.isArray(a.subAgents) && a.subAgents.length
          ? a.subAgents
              .map((s) =>
                [s.name, s.description, s.instructions, s.model]
                  .map((x) => String(x || ""))
                  .join(" ")
              )
              .join(" ")
          : "";
      return normalize(
        [
          a.summary,
          a.agentName,
          a.description,
          a.instructions,
          a.model,
          a.knowledge,
          a.personalization,
          a.category,
          (a.tags || []).join(" "),
          subSlice
        ].join(" ")
      );
    }

    function matchesFilters(a) {
      if (activeCategories.size > 0 && !activeCategories.has(a.category)) return false;
      if (activeTags.size > 0) {
        const tagOrMatch = [...activeTags].some((t) => a.tags.includes(t));
        if (!tagOrMatch) return false;
      }
      if (searchQuery && !searchHaystack(a).includes(searchQuery)) return false;
      return true;
    }

    function buildCopyAllText(a) {
      const lines = [];
      for (const f of FIELD_DEFS) {
        lines.push(`## ${f.label}`, "", String(a[f.key] || "").trim(), "");
      }
      if (Array.isArray(a.subAgents) && a.subAgents.length) {
        for (const sub of a.subAgents) {
          lines.push(`## Sub-agent: ${String(sub.name || "").trim()}`, "");
          for (const f of SUB_AGENT_FIELD_DEFS) {
            lines.push(`### ${f.label}`, "", String(sub[f.key] || "").trim(), "");
          }
        }
      }
      return lines.join("\n").trim();
    }

    function renderDialogFields(a) {
      dialogFields.innerHTML = "";
      for (const f of FIELD_DEFS) {
        const block = document.createElement("div");
        block.className = "field-block";
        const val = String(a[f.key] || "");
        block.innerHTML = `
          <div class="field-head">
            <span>${escapeHtml(f.label)}</span>
            <button type="button" class="btn btn-ghost btn-sm" data-field-copy="${escapeAttr(f.key)}">Copy</button>
          </div>
          <pre class="field-body" id="field-${escapeAttr(a.id)}-${escapeAttr(f.key)}">${escapeHtml(val)}</pre>
        `;
        dialogFields.appendChild(block);
      }
      dialogFields.querySelectorAll("[data-field-copy]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-field-copy");
          if (dialogAgent && key in dialogAgent) copyText(String(dialogAgent[key]));
        });
      });

      if (Array.isArray(a.subAgents) && a.subAgents.length) {
        const det = document.createElement("details");
        det.className = "subagents-details";
        const sum = document.createElement("summary");
        sum.textContent = `Sub-agents (${a.subAgents.length})`;
        det.appendChild(sum);
        const inner = document.createElement("div");
        inner.className = "subagents-inner";
        det.appendChild(inner);

        a.subAgents.forEach((sub, idx) => {
          const group = document.createElement("div");
          group.className = "subagent-group";
          const h = document.createElement("h4");
          h.className = "subagent-group-title";
          h.textContent = String(sub.name || `Sub-agent ${idx + 1}`).trim();
          group.appendChild(h);
          for (const f of SUB_AGENT_FIELD_DEFS) {
            const block = document.createElement("div");
            block.className = "field-block";
            const val = String(sub[f.key] || "");
            block.innerHTML = `
              <div class="field-head">
                <span>${escapeHtml(f.label)}</span>
                <button type="button" class="btn btn-ghost btn-sm" data-sub-copy data-sub-idx="${idx}" data-sub-field="${escapeAttr(f.key)}">Copy</button>
              </div>
              <pre class="field-body" id="field-${escapeAttr(a.id)}-sub-${idx}-${escapeAttr(f.key)}">${escapeHtml(val)}</pre>
            `;
            group.appendChild(block);
          }
          inner.appendChild(group);
        });
        dialogFields.appendChild(det);

        dialogFields.querySelectorAll("[data-sub-copy]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-sub-idx"), 10);
            const field = btn.getAttribute("data-sub-field");
            const sub = dialogAgent && Array.isArray(dialogAgent.subAgents) ? dialogAgent.subAgents[idx] : null;
            if (sub && field && field in sub) copyText(String(sub[field] || ""));
          });
        });
      }
    }

    function openDialog(a) {
      dialogAgent = a;
      dialogTitle.textContent = a.agentName;
      dialogTags.innerHTML = a.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
      renderDialogFields(a);
      dialog.showModal();
    }

    function renderCards() {
      if (!grid) return;
      const ph = document.getElementById("grid-placeholder");
      if (ph) ph.remove();
      grid.innerHTML = "";
      let visible = 0;
      for (const a of AGENTS) {
        const show = matchesFilters(a);
        const card = document.createElement("article");
        card.className = "card" + (show ? "" : " hidden");
        if (show) visible++;

        card.innerHTML = `
          <div class="card-top">
            <h2>${escapeHtml(a.agentName)}</h2>
            <span class="badge">${escapeHtml(a.category)}</span>
          </div>
          <p class="summary">${escapeHtml(a.summary)}</p>
          <div class="tags">${a.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
          <div class="card-actions">
            <button type="button" class="btn btn-primary" data-view="${escapeAttr(a.id)}">View blueprint</button>
            <button type="button" class="btn btn-ghost" data-copy-all="${escapeAttr(a.id)}">Copy all</button>
          </div>
        `;
        grid.appendChild(card);
      }

      countPill.innerHTML = `<strong>${visible}</strong> blueprints`;

      grid.querySelectorAll("[data-view]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-view");
          const agent = AGENTS.find((x) => x.id === id);
          if (agent) openDialog(agent);
        });
      });
      grid.querySelectorAll("[data-copy-all]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-copy-all");
          const agent = AGENTS.find((x) => x.id === id);
          if (agent) copyText(buildCopyAllText(agent));
        });
      });
    }

    function escapeHtml(str) {
      const d = document.createElement("div");
      d.textContent = str;
      return d.innerHTML;
    }
    function escapeAttr(str) {
      return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    }

    function applyFilters() {
      const cards = grid.querySelectorAll(".card");
      let visible = 0;
      cards.forEach((card, i) => {
        const a = AGENTS[i];
        const show = matchesFilters(a);
        card.classList.toggle("hidden", !show);
        if (show) visible++;
      });
      countPill.innerHTML = `<strong>${visible}</strong> blueprints`;
    }

    function syncCategoryPressed() {
      if (!categoryChips) return;
      const clearBtn = categoryChips.querySelector('[data-action="clear-categories"]');
      if (clearBtn) clearBtn.setAttribute("aria-pressed", activeCategories.size === 0 ? "true" : "false");
      categoryChips.querySelectorAll(".chip[data-cat]").forEach((c) => {
        const cat = c.dataset.cat;
        c.setAttribute("aria-pressed", activeCategories.has(cat) ? "true" : "false");
      });
    }

    function syncTagPressed() {
      if (!tagChips) return;
      const clearBtn = tagChips.querySelector('[data-action="clear-tags"]');
      if (clearBtn) clearBtn.setAttribute("aria-pressed", activeTags.size === 0 ? "true" : "false");
      tagChips.querySelectorAll(".chip[data-tag]").forEach((c) => {
        const t = c.dataset.tag;
        c.setAttribute("aria-pressed", activeTags.has(t) ? "true" : "false");
      });
    }

    function renderChips() {
      if (!categoryChips || !tagChips) return;
      categoryChips.innerHTML = "";

      const clearCat = document.createElement("button");
      clearCat.type = "button";
      clearCat.className = "chip chip-clear";
      clearCat.dataset.action = "clear-categories";
      clearCat.textContent = "All categories";
      clearCat.title = "Clear category filter (show all categories)";
      clearCat.setAttribute("aria-pressed", activeCategories.size === 0 ? "true" : "false");
      clearCat.addEventListener("click", () => {
        activeCategories.clear();
        syncCategoryPressed();
        applyFilters();
      });
      categoryChips.appendChild(clearCat);

      categoryList.forEach((cat) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.dataset.cat = cat;
        b.textContent = cat;
        b.setAttribute("aria-pressed", activeCategories.has(cat) ? "true" : "false");
        b.addEventListener("click", () => {
          if (activeCategories.has(cat)) activeCategories.delete(cat);
          else activeCategories.add(cat);
          syncCategoryPressed();
          applyFilters();
        });
        categoryChips.appendChild(b);
      });

      tagChips.innerHTML = "";

      const clearTags = document.createElement("button");
      clearTags.type = "button";
      clearTags.className = "chip chip-clear";
      clearTags.dataset.action = "clear-tags";
      clearTags.textContent = "All tags";
      clearTags.title = "Clear tag filter (show all tags)";
      clearTags.setAttribute("aria-pressed", activeTags.size === 0 ? "true" : "false");
      clearTags.addEventListener("click", () => {
        activeTags.clear();
        syncTagPressed();
        applyFilters();
      });
      tagChips.appendChild(clearTags);

      allTags.forEach((tag) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.dataset.tag = tag;
        b.textContent = tag;
        b.setAttribute("aria-pressed", activeTags.has(tag) ? "true" : "false");
        b.addEventListener("click", () => {
          if (activeTags.has(tag)) activeTags.delete(tag);
          else activeTags.add(tag);
          syncTagPressed();
          applyFilters();
        });
        tagChips.appendChild(b);
      });
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        showToast();
      } catch (_e) {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast();
      }
    }

    let toastTimer;
    function showToast() {
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
    }

    /* Render data first so a failure in theme/storage/listeners still shows blueprints */
    renderChips();
    renderCards();

    if (dialogCopyAll) {
      dialogCopyAll.addEventListener("click", () => {
        if (dialogAgent) copyText(buildCopyAllText(dialogAgent));
      });
    }
    if (dialog) {
      const closeBtn = dialog.querySelector("[data-close]");
      if (closeBtn) closeBtn.addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        searchQuery = normalize(searchInput.value.trim());
        applyFilters();
      });
    }

    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");

    function getStoredTheme() {
      try {
        return localStorage.getItem("theme");
      } catch (_e) {
        return null;
      }
    }
    function setTheme(theme) {
      const t = theme === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", t);
      document.documentElement.style.colorScheme = t === "light" ? "light" : "dark";
      if (themeIcon) themeIcon.textContent = t === "light" ? "◑" : "◐";
      try {
        localStorage.setItem("theme", t);
      } catch (_e) {
        /* ignore private mode / blocked storage */
      }
    }

    function currentTheme() {
      const a = document.documentElement.getAttribute("data-theme");
      return a === "light" ? "light" : "dark";
    }

    (function initTheme() {
      try {
        const stored = getStoredTheme();
        if (stored === "light" || stored === "dark") {
          setTheme(stored);
          return;
        }
        const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
        setTheme(prefersLight ? "light" : "dark");
      } catch (_err) {
        setTheme("dark");
      }
    })();

    function onThemeToggle() {
      setTheme(currentTheme() === "light" ? "dark" : "light");
    }

    if (themeToggle) {
      themeToggle.addEventListener("click", onThemeToggle);
    }