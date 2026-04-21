# gnai-prompt-collection

Internal **Gemini web agent blueprints**: a static HTML gallery plus an optional **Salesforce** implementation (**Ai Agent Blueprints**).

## Static demo (`index.html`)

Open `index.html` in a browser (or serve the folder). Each card is a blueprint with fields aligned to the Gemini agent builder (name, description, instructions, model, knowledge, personalization). Every blueprint includes **sub-agents** (name, description, instructions, model) in a collapsed section in the detail dialog.

## Salesforce package (`force-app/`)

Metadata includes:

- **Custom objects:** `Agent_Blueprint__c`, `Agent_Sub_Agent__c` (master-detail on blueprint; SOQL child relationship `Sub_Agents__r`)
- **Lightning app:** `Ai_Agent_Blueprints` with tab **Gnai Blueprints** (Visualforce page `AgentBlueprints`), standard Home, and object tabs for maintenance
- **Visualforce:** `AgentBlueprints.page` — same gallery UX as `index.html`; data from `AgentBlueprintController.getBlueprints`; admin bar for **Seed (if empty)** / **Replace from seed** and **New blueprint** via JavaScript remoting (`AgentBlueprintPageController`)
- **Static resources:** `GnaiAgentBlueprintsStyles` (CSS), `GnaiAgentBlueprintsApp` (JS), `AgentBlueprintsSeed` (seed JSON). After changing `index.html`, run `node scripts/build-vf-assets.mjs` to refresh the CSS/JS resources before deploy.
- **Apex:** `AgentBlueprintController`, `AgentBlueprintSeeder`, `AgentBlueprintPageController`, tests in `AgentBlueprintControllerTest` and `AgentBlueprintPageControllerTest`
- **Permission set:** `Ai_Agent_Blueprint_User` (assign to users who should use the app)

### Deploy

```bash
sf project deploy start --source-dir force-app --wait 15
```

Then in Setup: assign **Ai Agent Blueprint User** to your user, open the **Ai Agent Blueprints** app, open **Gnai Blueprints**, and click **Seed (if empty)** to load all blueprints from the bundled JSON. You can also open `/apex/AgentBlueprints` directly if the tab is on a different app.

The page loads **Google Fonts** (DM Sans, JetBrains Mono). If your org’s CSP blocks them, fonts fall back to system faces; you can later bundle fonts in a zip static resource if you need strict parity with `index.html`.

### Refresh seed JSON from `index.html`

After editing the `AGENTS` array in `index.html`, regenerate the static resource body:

```bash
node scripts/extract-agents.mjs
```

Commit `force-app/main/default/staticresources/AgentBlueprintsSeed.json`, then redeploy (or use **Replace from seed** on the Visualforce page, which deletes existing blueprint and sub-agent rows first).

To sync the **hosted gallery** markup and behavior with edits to `index.html`, run:

```bash
node scripts/build-vf-assets.mjs
```

Then commit the updated `GnaiAgentBlueprintsStyles` / `GnaiAgentBlueprintsApp` static resources and redeploy. The repo root `index.html` remains a convenient **offline reference** for the same UI.

## Project layout

| Path | Purpose |
|------|---------|
| `index.html` | Self-contained static UI and `AGENTS` data |
| `sfdx-project.json` | Salesforce DX project config |
| `scripts/extract-agents.mjs` | Builds `AgentBlueprintsSeed.json` from `index.html` |
| `scripts/build-vf-assets.mjs` | Extracts CSS/JS from `index.html` into VF static resources |
| `force-app/main/default/` | Objects, tabs, app, Apex, VF page, permission set, static resources |
