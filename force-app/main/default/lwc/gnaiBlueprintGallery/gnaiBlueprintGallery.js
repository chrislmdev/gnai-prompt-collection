import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getBlueprints from '@salesforce/apex/AgentBlueprintController.getBlueprints';
import createBlueprint from '@salesforce/apex/AgentBlueprintController.createBlueprint';
import seedFromStaticResource from '@salesforce/apex/AgentBlueprintSeeder.seedFromStaticResource';

function reduceErrors(errors) {
    if (!Array.isArray(errors)) {
        errors = [errors];
    }
    return errors
        .filter((error) => !!error)
        .map((error) => {
            if (Array.isArray(error.body)) {
                return error.body.map((e) => e.message);
            }
            if (error.body && typeof error.body.message === 'string') {
                return error.body.message;
            }
            if (typeof error.message === 'string') {
                return error.message;
            }
            return error.statusText;
        })
        .reduce((prev, curr) => prev.concat(curr), [])
        .filter((message) => !!message)
        .join('; ');
}

export default class GnaiBlueprintGallery extends LightningElement {
    @track blueprints = [];
    searchKey = '';
    categoryFilter = '';
    includeDrafts = true;
    loading = false;
    error;

    detailOpen = false;
    selected;

    newOpen = false;
    newJson = '';

    connectedCallback() {
        this.refresh();
    }

    get categoryOptions() {
        const opts = [{ label: 'All categories', value: '' }];
        const seen = new Set();
        for (const b of this.blueprints || []) {
            const c = b.category || '';
            if (!seen.has(c)) {
                seen.add(c);
                opts.push({ label: c || '(uncategorized)', value: c });
            }
        }
        return opts;
    }

    get filteredBlueprints() {
        let rows = [...(this.blueprints || [])];
        const q = (this.searchKey || '').trim().toLowerCase();
        if (q) {
            rows = rows.filter((b) => {
                const tags = (b.tags || []).join(' ').toLowerCase();
                return (
                    (b.agentName && b.agentName.toLowerCase().includes(q)) ||
                    (b.summary && b.summary.toLowerCase().includes(q)) ||
                    (b.description && b.description.toLowerCase().includes(q)) ||
                    (b.externalId && b.externalId.toLowerCase().includes(q)) ||
                    tags.includes(q)
                );
            });
        }
        if (this.categoryFilter !== '') {
            const cf = this.categoryFilter;
            rows = rows.filter((b) => (b.category || '') === cf);
        }
        return rows;
    }

    get hasSelectedSubAgents() {
        return this.selected && this.selected.subRows && this.selected.subRows.length > 0;
    }

    get exportJson() {
        if (!this.selected) {
            return '';
        }
        const s = this.selected;
        return JSON.stringify(
            {
                id: s.externalId,
                category: s.category,
                tags: s.tags || [],
                summary: s.summary,
                agentName: s.agentName,
                description: s.description,
                instructions: s.instructions,
                model: s.model,
                knowledge: s.knowledge,
                personalization: s.personalization,
                status: s.status,
                subAgents: s.subAgents || []
            },
            null,
            2
        );
    }

    handleSearchChange(event) {
        this.searchKey = event.target.value;
    }

    handleCategoryChange(event) {
        this.categoryFilter = event.detail.value;
    }

    handleDraftToggle(event) {
        this.includeDrafts = event.detail.checked;
        this.refresh();
    }

    refresh() {
        this.loading = true;
        this.error = undefined;
        return getBlueprints({ includeDrafts: this.includeDrafts })
            .then((data) => {
                const rows = data || [];
                this.blueprints = rows.map((b) => {
                    const tags = b.tags || [];
                    const tagRows = tags.map((t, i) => ({
                        key: `${b.recordId}-tag-${i}`,
                        label: t
                    }));
                    return { ...b, tagRows };
                });
                this.loading = false;
            })
            .catch((e) => {
                this.error = reduceErrors(e);
                this.loading = false;
            });
    }

    handleSeed() {
        this.loading = true;
        seedFromStaticResource({ replaceExisting: false })
            .then((count) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Seed complete',
                        message: `Inserted or updated ${count} blueprint(s) from seed.`,
                        variant: count > 0 ? 'success' : 'info'
                    })
                );
                this.refresh();
            })
            .catch((e) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Seed failed',
                        message: reduceErrors(e),
                        variant: 'error'
                    })
                );
                this.loading = false;
            });
    }

    handleReplaceSeed() {
        if (!window.confirm('Delete all blueprints and sub-agents, then reload from seed?')) {
            return;
        }
        this.loading = true;
        seedFromStaticResource({ replaceExisting: true })
            .then((count) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Replace complete',
                        message: `Loaded ${count} blueprint(s) from seed.`,
                        variant: 'success'
                    })
                );
                this.refresh();
            })
            .catch((e) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Replace failed',
                        message: reduceErrors(e),
                        variant: 'error'
                    })
                );
                this.loading = false;
            });
    }

    handleOpenCard(event) {
        const id = event.currentTarget.dataset.recordId;
        const bp = this.blueprints.find((b) => b.recordId === id);
        if (!bp) {
            this.selected = undefined;
            this.detailOpen = false;
            return;
        }
        const subs = bp.subAgents || [];
        const subRows = subs.map((s, i) => ({
            rowKey: `${bp.recordId}-sub-${i}`,
            name: s.name,
            description: s.description,
            instructions: s.instructions,
            model: s.model
        }));
        this.selected = { ...bp, subRows };
        this.detailOpen = true;
    }

    closeDetail() {
        this.detailOpen = false;
        this.selected = undefined;
    }

    openNewModal() {
        this.newJson =
            '{"id":"my-slug","category":"General","tags":["demo"],"summary":"","agentName":"New agent","description":"","instructions":"","model":"","knowledge":"","personalization":"","status":"Draft","subAgents":[]}';
        this.newOpen = true;
    }

    closeNew() {
        this.newOpen = false;
    }

    handleNewJsonChange(event) {
        this.newJson = event.target.value;
    }

    handleCreate() {
        this.loading = true;
        createBlueprint({ jsonPayload: this.newJson })
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Blueprint created',
                        message: 'Saved as Draft unless status was set in JSON.',
                        variant: 'success'
                    })
                );
                this.newOpen = false;
                this.refresh();
            })
            .catch((e) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Create failed',
                        message: reduceErrors(e),
                        variant: 'error'
                    })
                );
                this.loading = false;
            });
    }

    async copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Copied',
                    variant: 'success'
                })
            );
        } catch (err) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Copy failed',
                    message: reduceErrors(err),
                    variant: 'error'
                })
            );
        }
    }

    copyField(event) {
        const value = event.currentTarget.dataset.value || '';
        this.copyText(value);
    }

    copyExport() {
        this.copyText(this.exportJson);
    }
}
