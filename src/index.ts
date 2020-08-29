import "dotenv/config";
import { Pocket } from "./pocket";
import { NotionStatus, Notion } from "./notion";
import { wasUpdatedLast, readInPocket, unreadInNotion, notionToPocketAdd, readInNotion, unreadInPocket, pocketToArchiveAction } from "./helpers";

/* TODO:
[v] Set status in Notion to read if archived in Pocket
[] Move out of Pocket archive if not read in Notion
[] Set status in Notion to reading if unarchived in Pocket?
[] Add new Pocket saves to Notion
*/

const notion = new Notion();
const pocket = new Pocket();

async function setReadInNotion() {
    const pocketArticles = await pocket.getArticles();
    const notionDict = await notion.getArticlesAsDict();

    // Sets status to read in Notion if archived in Pocket
    const readUrls = pocketArticles
        .filter(item => wasUpdatedLast(item, notionDict[item.url]) && readInPocket(item) && unreadInNotion(notionDict[item.url]))
        .map(item => item.url)

    const readIds = readUrls.map(url => notionDict[url]?.id).filter(x => !!x);

    return readIds.map(id => ({
        id,
        type: "set-status",
        status: NotionStatus.READ,
    }) as const);
}

 async function getMissingFromPocket() {
    const notionArticles = await notion.getArticles();
    const pocketDict = await pocket.getArticlesAsDict();

    // If I've read an article before it can go into Pocket, then whatever.
    // Adds urls to Pocket that are in Notion
    return notionArticles
        .filter(item => pocketDict[item.url] === undefined && unreadInNotion(item))
        .map(notionToPocketAdd);
}

async function archiveReadInPocket() {
    const notionArticles = await notion.getArticles();
    const pocketDict = await pocket.getArticlesAsDict();

    // Archives Pocket entries marked as read in Notion
    return notionArticles
        .filter(item => wasUpdatedLast(item, pocketDict[item.url]) && readInNotion(item) && unreadInPocket(pocketDict[item.url]))
        .map(item => pocketToArchiveAction(pocketDict[item.url]))
        .filter(item => item !== null);
}

async function main() {
    const missingInPocket = await getMissingFromPocket();
    const archiveInPocket = await archiveReadInPocket();
    const pocketActions = [...missingInPocket, ...archiveInPocket];

    const readInNotion = await setReadInNotion();

    console.log(pocketActions);
    console.log(readInNotion);

    await pocket.updateArticles(pocketActions);
    await notion.runApiActions(readInNotion);
}

main();