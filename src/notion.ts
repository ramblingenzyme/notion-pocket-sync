import keyBy from "lodash.keyby";
import { Client } from "@notionhq/client";

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
    title: string;
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
    private notion: Client;
    private rows: NotionItem[] | undefined;

    constructor() {
        this.notion = new Client({
            auth: process.env.NOTION_TOKEN,
        });
    }

    async getArticles(): Promise<NotionItem[]> {
        if (this.rows?.length) {
            return this.rows;
        }

        const result = await this.notion.databases.query({ 
            database_id: process.env.READING_LIST_DB_ID as string,
            filter: {
                property: "syncPocket",
                checkbox: {
                    equals: true
                }
            }
        });

        if (result.object !== "list") {
            throw new Error("Not a list");
        }

        const { results: rows } = result;

        this.rows = rows
            .filter(r => r.object === "page")
            .map(r => {
                const url = r.properties.URL.type === "url" ? r.properties.URL.url : undefined;
                const status = r.properties.Status.type === "select" ? r.properties.Status.select?.name : undefined;
                const title = r.properties.Name.type === "title" ? r.properties.Name.title?.[0]?.plain_text : "";

                if (!url || !status) {
                    throw new Error("Missing properties");
                }

                return ({
                    id: r.id as NotionItemId,
                    url,
                    status: status as NotionStatus,
                    title: title,
                    lastUpdated: new Date(r.last_edited_time),
                });
            });

        return this.rows;
    }

    async getArticlesAsDict() {
        const rows = await this.getArticles();
        return keyBy(rows, row => row.url);
    }

    private async getRowById(id: NotionItemId): Promise<NotionItem | undefined> {
        const rows = await this.getArticles();
        return rows.find(r => r.id === id);
    }

    private async runApiAction(action: NotionApiAction) {
        switch (action.type) {
            case "create":
                await this.notion.pages.create({
                    parent: {
                        database_id: process.env.READING_LIST_DB_ID as string,
                    },
                    properties: {
                        URL: action.value.url,
                        Status: action.value.status,
                        Name: action.value.title,
                    }
                });
                break;

            case "set-status":
                await this.notion.pages.update({
                    page_id: action.id,
                    properties: {
                        Status: action.status
                    }
                })
                break;
            case "delete":
                await this.notion.pages.update({
                    page_id: action.id,
                    archived: true,
                })
                break;
        }
    }

    async runApiActions(actions: NotionApiAction[]) {
        for (const action of actions) {
            await this.runApiAction(action);
        }
    }
}
