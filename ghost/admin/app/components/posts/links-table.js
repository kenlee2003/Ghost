import Component from '@glimmer/component';
import {action} from '@ember/object';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const PAGE_SIZE = 5;

export default class LinksTable extends Component {
    @tracked page = 1;

    @tracked editingLink = null;
    @tracked showError = null;

    @action
    blurElement(event) {
        if (!event.shiftKey) {
            event.preventDefault();
            event.target.blur();
        }
    }

    @action
    editLink(linkId) {
        this.editingLink = linkId;
    }

    @action
    cancelEdit(event) {
        event.preventDefault();
        this.editingLink = null;
        this.showError = null;
    }

    @action
    setLink(event) {
        event.preventDefault();
        try {
            const newUrl = new URL(event.target.value);
            const linkObj = this.links.find((_link) => {
                return _link.link.link_id === this.editingLink;
            });
            // Only call update if the new link is different from current link
            if (linkObj.link.to !== newUrl.href) {
                this.args.updateLink(this.editingLink, newUrl.href);
            }
            this.editingLink = null;
            this.showError = null;
        } catch (e) {
            this.showError = this.editingLink;
        }
    }

    @task
    *updateLinks() {
        try {
            const newUrl = new URL(event.target.value);
            const linkObj = this.links.find((_link) => {
                return _link.link.link_id === this.editingLink;
            });
            // Only call update if the new link is different from current link
            if (linkObj.link.to !== newUrl.href) {
                yield this.args.updateLinkTask.perform(this.editingLink, newUrl.href);
            }
            this.editingLink = null;
            this.showError = null;
            return true;
        } catch (e) {
            this.showError = this.editingLink;
        }
    }

    get links() {
        return this.args.links;
    }

    get visibleLinks() {
        return this.links.slice(this.startOffset - 1, this.endOffset);
    }

    get startOffset() {
        return (this.page - 1) * PAGE_SIZE + 1;
    }

    get endOffset() {
        return Math.min(this.page * PAGE_SIZE, this.links.length);
    }

    get totalPages() {
        return Math.ceil(this.links.length / PAGE_SIZE);
    }

    get totalLinks() {
        return this.links.length;
    }

    get showPagination() {
        return this.totalPages > 1;
    }

    get disablePreviousPage() {
        return this.page === 1;
    }

    get disableNextPage() {
        return this.page === this.totalPages;
    }

    @action
    openPreviousPage() {
        if (this.disablePreviousPage) {
            return;
        }
        this.page -= 1;
    }

    @action
    openNextPage() {
        if (this.disableNextPage) {
            return;
        }

        this.page += 1;
    }
}
