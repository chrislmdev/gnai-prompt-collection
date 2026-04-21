import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const s0 = html.indexOf("<style>") + "<style>".length;
const s1 = html.indexOf("</style>");
const css = html.slice(s0, s1).trim();
fs.writeFileSync(
  path.join(root, "force-app/main/default/staticresources/GnaiAgentBlueprintsStyles.css"),
  css + "\n\n/* VF admin toolbar */\n.vf-admin-bar { display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; padding:0.5rem 1rem; border-bottom:1px solid var(--border); background:var(--bg-elevated); font-size:0.8rem; }\n.vf-admin-bar button { font-family:inherit; }\n.vf-admin-bar textarea { min-width:220px; min-height:2.5rem; font-family:var(--mono); font-size:0.72rem; }\n",
  "utf8"
);

const start = html.indexOf("const FIELD_DEFS");
const end = html.lastIndexOf("</script>");
let js = html.slice(start, end).trim();
js = js.replace(/a\.tags\.join/g, "(a.tags || []).join");

const head = `let AGENTS = [];
(function loadAgentsFromPage() {
  try {
    var el = document.getElementById("agents-json-b64");
    if (el && el.textContent) {
      var b64 = el.textContent.replace(/\\s/g, "");
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
`;

fs.writeFileSync(
  path.join(root, "force-app/main/default/staticresources/GnaiAgentBlueprintsApp.js"),
  head + js,
  "utf8"
);
console.log("Wrote GnaiAgentBlueprintsStyles.css and GnaiAgentBlueprintsApp.js");
