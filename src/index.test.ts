import { setReadInNotion, getMissingFromPocket, archiveReadInPocket, main } from ".";
import { Notion, NotionStatus, NotionItem } from "./notion";
import { Pocket, PocketStatus, PocketItem } from "./pocket";
import { pocketToArchiveAction, notionToPocketAdd } from "./helpers";
import keyBy from "lodash.keyby";

jest.mock("./notion");
jest.mock("./pocket");

afterEach(() => jest.clearAllMocks());

describe("setReadInNotion", () => {
    it("should return an empty array with no articles in Notion", async () => {
        const notion = new Notion();
        const pocket = new Pocket();

        expect(await setReadInNotion(notion, pocket)).toEqual([]);
    });

    it("should return actions to set articles in Notion as read if archived in Pocket last", async () => {
        const notion = new Notion();
        const pocket = new Pocket();
        (pocket.getArticles as jest.Mock).mockImplementationOnce(() => [{ 
            id: 1,
            status: PocketStatus.ARCHIVED,
            url: "example.com",
            lastUpdated: new Date("2020-03-02")
        }]);

        (notion.getArticlesAsDict as jest.Mock).mockImplementation(() => ({
            "example.com": {
                id: 12,
                status: NotionStatus.UNREAD,
                url: "example.com",
                lastUpdated: new Date("2020-03-01")
            }
        }));

        expect(await setReadInNotion(notion, pocket)).toEqual([{
            id: 12,
            type: "set-status",
            status: NotionStatus.READ,
        }]);
    });
});


describe("getMissingFromPocket", () => {
    it("should return an empty array with no articles in Notion", async () => {
        const notion = new Notion();
        const pocket = new Pocket();

        expect(await getMissingFromPocket(notion, pocket)).toEqual([]);
    })

    it("should return actions to add missing articles from Notion to Pocket", async () => {
        const notion = new Notion();
        const pocket = new Pocket();
        (notion.getArticles as jest.Mock).mockImplementationOnce(() => [{  id: 1, status: "To Read", url: "example.com" }]);
        (pocket.getArticlesAsDict as jest.Mock).mockImplementation(() => ({
            "abc.net.au": {
                id: 12,
                status: PocketStatus.UNREAD,
                url: "abc.net.au",
            }
        }));

        expect(await getMissingFromPocket(notion, pocket)).toEqual([{
            action: "add",
            url: "example.com",
        }]);
    });
});

describe("archiveReadInPocket", () => {
    it("should return an empty array with no articles in Notion", async () => {
        const notion = new Notion();
        const pocket = new Pocket();

        expect(await archiveReadInPocket(notion, pocket)).toEqual([]);
    });

    it("should return actions to archive Pocket articles when set to read in Notion", async () => {
        const notion = new Notion();
        const pocket = new Pocket();
        (notion.getArticles as jest.Mock).mockImplementationOnce(() => [{ 
            id: 12,
            status: NotionStatus.READ,
            url: "example.com",
            lastUpdated: new Date("2020-03-02")
        }]);

        (pocket.getArticlesAsDict as jest.Mock).mockImplementation(() => ({
            "example.com": {
                id: 1,
                status: PocketStatus.UNREAD,
                url: "example.com",
                lastUpdated: new Date("2020-03-01")
            }
        }));

        expect(await archiveReadInPocket(notion, pocket)).toEqual([{
            item_id: 1,
            action: "archive",
        }]);
    });
});

describe("main", () => {
        const notionArticles = [{
            id: "10",
            status: NotionStatus.READ,
            url: "1.com",
            lastUpdated: new Date("2020-03-01"),
        }, {
            id: "11",
            status: NotionStatus.UNREAD,
            url: "2.com",
            lastUpdated: new Date("2020-02-01"),
        }, {
            id: "12",
            status: NotionStatus.READING,
            url: "3.com",
            lastUpdated: new Date("2020-01-01")
        }] as NotionItem[];

        const pocketArticles = [{
            id: "20",
            status: PocketStatus.UNREAD,
            url: "1.com",
            lastUpdated: new Date("2020-02-01"),
        }, {
            id: "22",
            status: PocketStatus.ARCHIVED,
            url: "3.com",
            lastUpdated: new Date("2020-02-01")
        }] as PocketItem[];

    it("should run the correct set of non-overlapping actions", async () => {
        const expectedPocketActions = [
            pocketToArchiveAction(pocketArticles[0]),
            notionToPocketAdd(notionArticles[1]),
        ];

        const expectedNotionActions = [{
            id: "12",
            type: "set-status",
            status: NotionStatus.READ,
        }];

        const notion = new Notion();
        const pocket = new Pocket();
        (notion.getArticles as jest.Mock).mockImplementation(async () => notionArticles);
        (pocket.getArticles as jest.Mock).mockImplementation(async () => pocketArticles);

        (notion.getArticlesAsDict as jest.Mock).mockImplementation(async () => keyBy(notionArticles, article => article.url));
        (pocket.getArticlesAsDict as jest.Mock).mockImplementation(async () => keyBy(pocketArticles, article => article.url));

        await main(notion, pocket);

        expect(notion.runApiActions).toHaveBeenCalledWith(expect.arrayContaining(expectedNotionActions));
        expect(pocket.updateArticles).toHaveBeenCalledWith(expect.arrayContaining(expectedPocketActions));
    })
})
