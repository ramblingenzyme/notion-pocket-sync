import RealPocket from "pocket-api";

const pocket = new RealPocket(process.env.POCKET_CONSUMER_KEY);
pocket.setAccessToken(process.env.POCKET_ACCESS_TOKEN)

export enum PocketStatus {
    UNREAD = 0,
    ARCHIVED = 1,
    DELETED = 2,
}

type PocketItemId = string & {_: "PocketItemId"};

export interface PocketItem {
    id: PocketItemId;
    url: string;
    status: PocketStatus;
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

    constructor() {
        this.pocket = new RealPocket(process.env.POCKET_CONSUMER_KEY);
        this.pocket.setAccessToken(process.env.POCKET_ACCESS_TOKEN);
    }

    async getArticles(): Promise<PocketItem[]> {
        const response = await pocket.getArticles({
            state: "all",
            contentType: "article"
        });

        return Object.values(response.list).map((article: any) => ({
            id: article.item_id,
            url: article.given_url,
            status: article.status,
        }));
    }

    async getArticlesAsDict<T extends keyof PocketItem>(prop?: T) {
        const articles = await this.getArticles();
        return Object.fromEntries(articles.map(a => [a[prop || "url"], a]));
    }

    async updateArticles(actions: PocketApiAction[]) {
        return pocket.modifyArticles(actions);
    }
}