# gnai-prompt-collection

Internal **Gemini web agent blueprints**: a static HTML gallery plus an optional **Salesforce** implementation (**Ai Agent Blueprints**).

## Static demo (`index.html`)

Open `index.html` in a browser (or serve the folder). Each card is a blueprint with fields aligned to the Gemini agent builder (name, description, instructions, model, knowledge, personalization). Every blueprint includes **sub-agents** (name, description, instructions, model) in a collapsed section in the detail dialog.

## Salesforce package (`force-app/`)

Metadata includes:

- **Custom objects:** `Agent_Blueprint__c`, `Agent_Sub_Agent__c` (master-detail on blueprint; SOQL child relationship `Sub_Agents__r`)
- **Lightning app:** `Ai_Agent_Blueprints` with tab **Blueprint Gallery** (LWC `gnaiBlueprintGallery`), standard Home, and object tabs for maintenance
- **LWC:** `gnaiBlueprintGallery` — search, category filter, include-drafts toggle, card grid, detail modal with copy actions, **New blueprint** (JSON payload, saves as **Draft** unless `status` is set), **Seed (if empty)** / **Replace from seed** (loads `AgentBlueprintsSeed` static resource via `AgentBlueprintSeeder`)
- **Static resource:** `AgentBlueprintsSeed` (seed JSON for the seeder)
- **Apex:** `AgentBlueprintController`, `AgentBlueprintSeeder`, tests in `AgentBlueprintControllerTest`
- **Permission set:** `Ai_Agent_Blueprint_User` (assign to users who should use the app)

### Deploy

```bash
sf project deploy start --source-dir force-app --wait 15
```

Then in Setup: assign **Ai Agent Blueprint User** to your user, open the **Ai Agent Blueprints** app, go to **Blueprint Gallery**, and click **Seed (if empty)** to load all blueprints from the bundled JSON.

### Refresh seed JSON from `index.html`

After editing the `AGENTS` array in `index.html`, regenerate the static resource body:

```bash
node scripts/extract-agents.mjs
```

Commit `force-app/main/default/staticresources/AgentBlueprintsSeed.json`, then redeploy (or use **Replace from seed** in the gallery, which deletes existing blueprint and sub-agent rows first).

The repo root `index.html` stays useful as an **offline** gallery and as the source for `extract-agents.mjs`.

## Project layout

| Path | Purpose |
|------|---------|
| `index.html` | Self-contained static UI and `AGENTS` data |
| `sfdx-project.json` | Salesforce DX project config |
| `scripts/extract-agents.mjs` | Builds `AgentBlueprintsSeed.json` from `index.html` |
| `force-app/main/default/` | Objects, tabs, app, Apex, LWC, permission set, static resources |
