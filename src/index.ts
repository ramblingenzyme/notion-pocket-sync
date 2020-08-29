import "dotenv/config";
import { PocketStatus, PocketItem, Pocket } from "./pocket";
import { NotionItem, NotionStatus, ReadingList } from "./notion";

/* TODO:
[v] Set status in Notion to read if archived in Pocket
[] Move out of Pocket archive if not read in Notion
[] Set status in Notion to reading if unarchived in Pocket?
[] Add new Pocket saves to Notion
*/

const notionToPocketAdd = (item: NotionItem) => ({
    action: "add",
    url: item.url,
}) as const;

const pocketToArchiveAction = (pocketItem: PocketItem) => ({
    action: "archive",
    item_id: pocketItem.id,
}) as const;

const readingList = new ReadingList();
const pocket = new Pocket();

const readInPocket = (item?: PocketItem) => item?.status === PocketStatus.ARCHIVED;
const unreadInPocket = (item?: PocketItem) => item?.status === PocketStatus.UNREAD;

const readInNotion = (item?: NotionItem) => item?.status === NotionStatus.READ;
const unreadInNotion = (item?: NotionItem) => item?.status === NotionStatus.UNREAD || item?.status === NotionStatus.READING;

async function syncPocketReadToNotion() {
    const pocketArticles = await pocket.getArticles();
    const notionDict = await readingList.syncedArticlesAsDict();

    // Sets status to read in Notion if archived in Pocket
    const readUrls = pocketArticles
        .filter(item => readInPocket(item) && unreadInNotion(notionDict[item.url]))
        .map(item => item.url)

    const readIds = readUrls.map(url => notionDict[url]?.id).filter(x => !!x);
    for (const readId of readIds) {
        readingList.updateRow(readId, "Status", NotionStatus.READ);
    }
}

async function syncNotionToPocket() {
    const syncedNotionEntries = await readingList.syncedArticles();
    const pocketDict = await pocket.getArticlesAsDict();

    // If I've read an article before it can go into Pocket, then whatever.
    // Adds urls to Pocket that are in Notion
    const addPocketApiActions = syncedNotionEntries
        .filter(item => !pocketDict[item.url] && unreadInNotion(item))
        .map(notionToPocketAdd);

    // Archives Pocket entries marked as read in Notion
    const archivePocketApiActions = syncedNotionEntries
        .filter(entry => readInNotion(entry) && unreadInPocket(pocketDict[entry.url]))
        .map(item => pocketToArchiveAction(pocketDict[item.url]))
        .filter(item => item !== null);

    await pocket.updateArticles([...addPocketApiActions, ...archivePocketApiActions]);
}

syncNotionToPocket()
    .then(syncPocketReadToNotion);