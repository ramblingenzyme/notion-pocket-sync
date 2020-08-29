import Notabase, { Collection } from "@vihanb/notabase";

export enum NotionStatus {
    READ = "Read",
    UNREAD = "To Read",
    READING = "Reading",
}

type NotionItemId = string & { _: "NotionItemId" };

export interface NotionItem {
    id: NotionItemId;
    url: string;
    status: NotionStatus;
}

export interface ReadingListItem {
    id: NotionItemId;
    syncPocket: boolean;
    Status: NotionStatus;
    Name: string;
    Tags: string[];
    URL: string;
}

type UpdatableKeys = keyof Omit<ReadingListItem, "id">;

export class ReadingList {
    private page: Promise<Collection>;
    private nb: Notabase;

    constructor() {
        this.nb = new Notabase({
            token: process.env.NOTION_AUTH,
        });
        this.page = this.nb.fetch(process.env.READING_LIST_PAGE);
    }

    async syncedArticles(): Promise<NotionItem[]> {
        const { rows } = await this.page;
        return rows
            .filter(e => e.syncPocket)
            .map(e => {
                console.log(e);
                return ({
                    id: e.id,
                    url: e.URL,
                    status: e.Status,
                });
            });
    }

    async syncedArticlesAsDict() {
        const rows = await this.syncedArticles();
        return Object.fromEntries(rows.map(row => [row.url, row]));
    }

    async rawArticles() {
        const { rows } = await this.page;
        return rows;
    }

    async updateRow<T extends UpdatableKeys>(id: NotionItem["id"], property: T, value: ReadingListItem[T]) {
        const { rows } = await this.page;
        const row = rows.find(r => r.id === id);

        if (!row) {
            throw new Error("Row doesn't exist");
        }

        row[property] = value;
    }
}
