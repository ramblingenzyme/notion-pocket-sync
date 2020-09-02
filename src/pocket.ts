import RealPocket from "pocket-api";
import keyBy from "lodash.keyby";

export enum PocketStatus {
    UNREAD = "0",
    ARCHIVED = "1",
    DELETED = "2",
}

type PocketItemId = string & {_: "PocketItemId"};

export interface PocketItem {
    id: PocketItemId;
    lastUpdated: Date;
    status: PocketStatus;
    url: string;
}

export type PocketApiAction = 
    | {
        action: "add";
        url: string;
    }
    | {
        action: "archive";
        item_id: PocketItemId;
    }

export class Pocket {
    private pocket: any;
    private articles: Promise<{ list: any[]}>

    constructor() {
        this.pocket = new RealPocket(process.env.POCKET_CONSUMER_KEY);
        this.pocket.setAccessToken(process.env.POCKET_ACCESS_TOKEN);
        this.articles = this.pocket.getArticles({
            state: "all",
        })
    }

    async getArticles(): Promise<PocketItem[]> {
        const response = await this.articles;

        return Object.values(response.list).map((article: any) => ({
            id: article.item_id,
            lastUpdated: new Date(Number(article.time_updated) * 1000),
            status: article.status,
            url: article.given_url,
            resolved: article.resolved_url,
        }));
    }

    async getArticlesAsDict() {
        const articles = await this.getArticles();

        return {
            ...keyBy(articles, article => article.url),
            ...keyBy(articles, article => (article as any).resolved),
        }
    }

    async updateArticles(actions: PocketApiAction[]) {
        if (actions.length) {
            return this.pocket.modifyArticles(actions);
        }
    }
}