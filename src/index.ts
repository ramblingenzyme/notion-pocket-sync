import "dotenv/config";
import { Pocket } from "./pocket";
import { NotionStatus, Notion, NotionApiAction } from "./notion";
import { wasUpdatedLast, readInPocket, unreadInNotion, notionToPocketAdd, readInNotion, unreadInPocket, pocketToArchiveAction, pocketToAddAction, deletedInPocket } from "./helpers";

/* TODO:
[x] Set status in Notion to read if archived in Pocket
[x] Add new Pocket saves to Notion
[] Sync tags
*/

export async function setReadInNotion(notion: Notion, pocket: Pocket) {
    const pocketArticles = await pocket.getArticles();
    const notionDict = await notion.getArticlesAsDict();

    // Sets status to read in Notion if archived in Pocket
    const readUrls = pocketArticles
        .filter(item => {
            const notionItem = notionDict[item.url]
            return wasUpdatedLast(item, notionItem) && readInPocket(item) && unreadInNotion(notionItem);
        })
        .map(item => item.url)

    const readIds = readUrls.map(url => notionDict[url]?.id).filter(x => !!x);

    return readIds.map(id => ({
        id,
        type: "set-status",
        status: NotionStatus.READ,
    }) as const);
}

export async function getMissingFromNotion(notion: Notion, pocket: Pocket) {
    const pocketArticles = await pocket.getArticles()
    const notionDict = await notion.getArticlesAsDict();

    return pocketArticles
        .filter(item => !notionDict[item.url])
        .map(pocketToAddAction)
        .filter((x): x is NotionApiAction => typeof x !== "undefined")
}

export async function getMissingFromPocket(notion: Notion, pocket: Pocket) {
    const notionArticles = await notion.getArticles();
    const pocketDict = await pocket.getArticlesAsDict();

    // If I've read an article before it can go into Pocket, then whatever.
    // Adds urls to Pocket that are in Notion
    return notionArticles
        .filter(item => pocketDict[item.url] === undefined && unreadInNotion(item))
        .map(notionToPocketAdd);
}

export async function archiveReadInPocket(notion: Notion, pocket: Pocket) {
    const notionArticles = await notion.getArticles();
    const pocketDict = await pocket.getArticlesAsDict();

    // Archives Pocket entries marked as read in Notion
    return notionArticles
        .filter(item => wasUpdatedLast(item, pocketDict[item.url]) && readInNotion(item) && unreadInPocket(pocketDict[item.url]))
        .map(item => pocketToArchiveAction(pocketDict[item.url]))
        .filter(item => item !== null);
}

export async function main(notion: Notion, pocket: Pocket) {
    const nestedNotionActions = await Promise.all([
        setReadInNotion(notion, pocket),
        getMissingFromNotion(notion, pocket)
    ]);

    const nestedPocketActions = await Promise.all([
        getMissingFromPocket(notion, pocket),
        archiveReadInPocket(notion, pocket),
    ]);

    const notionActions = nestedNotionActions.flat();
    const pocketActions = nestedPocketActions.flat();

    if (process.env.DEBUG) {
        console.log(JSON.stringify(pocketActions, null, 4));
        console.log(JSON.stringify(notionActions, null, 4));
        return;
    }

    await pocket.updateArticles(pocketActions);
    await notion.runApiActions(notionActions);
}

if (process.env.NODE_ENV !== "test") {
    main(new Notion(), new Pocket());
}