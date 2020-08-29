import Notabase, { Collection } from "@vihanb/notabase";

export enum NotionStatus {
    READ = "Read",
    UNREAD = "To Read",
    READING = "Reading",
}

type NotionItemId = string & { _: "NotionItemId" };

export interface NotionItem {
    id: NotionItemId;
    lastUpdated: Date;
    status: NotionStatus;
    url: string;
}

export interface ReadingListItem {
    id: NotionItemId;
    syncPocket: boolean;
    Status: NotionStatus;
    Name: string;
    Tags: string[];
    URL: string;
    delete: () => void;
}

export type NotionApiAction =
    | {
        type: "set-status";
        id: NotionItemId;
        status: NotionStatus;
    }
    | {
        type: "delete";
        id: NotionItemId;
    }
    | {
        type: "create";
        value: Omit<NotionItem, "id" | "lastUpdated">;
    }

export class Notion {
    private page: Promise<Collection>;
    private nb: Notabase;

    constructor() {
        this.nb = new Notabase({
            token: process.env.NOTION_AUTH,
        });
        this.page = this.nb.fetch(process.env.READING_LIST_PAGE);
    }

    async getArticles(): Promise<NotionItem[]> {
        const { rows } = await this.page;
        return rows
            .filter(e => e.syncPocket)
            .map(e => ({
                id: e.id,
                url: e.URL,
                status: e.Status,
                lastUpdated: new Date(e.last_edited_time),
            }));
    }

    async getArticlesAsDict() {
        const rows = await this.getArticles();
        return Object.fromEntries(rows.map(row => [row.url, row]));
    }

    private async getRowById(id: NotionItemId): Promise<ReadingListItem | undefined> {
        const { rows } = await this.page;
        return rows.find(r => r.id === id);
    }

    private async runApiAction(action: NotionApiAction) {
        const page = await this.page;
        if (action.type === "create") {
            page.addRow(action.value);
            return;
        }

        const row = await this.getRowById(action.id);
        if (!row) {
            console.warn("Couldn't find row for id");
            return;
        }

        switch (action.type) {
            case "set-status":
                row.Status = action.status;
            case "delete":
                row.delete();
        }
    }

    async runApiActions(actions: NotionApiAction[]) {
        for (const action of actions) {
            await this.runApiAction(action);
        }
    }
}
