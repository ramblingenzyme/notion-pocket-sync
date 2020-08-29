import "dotenv/config";
import { PocketStatus, PocketItem, Pocket } from "./pocket";
import { NotionItem, NotionStatus, ReadingList } from "./notion";

const notionToPocketAdd = (item: NotionItem) => ({
    action: "add",
    url: item.url,
}) as const;

const pocketToArchiveAction = (pocketItem: PocketItem) =>  ({
    action: "archive",
    item_id: pocketItem.id,
}) as const;

const readingList = new ReadingList();
const pocket = new Pocket();

async function main() {
    const syncedNotionEntries = await readingList.syncedArticles();
    const pocketDict = await pocket.getArticlesAsDict();

    // If I've read an article before it can go into Pocket, then whatever.
    const addPocketApiActions = syncedNotionEntries
        .filter(entry => !pocketDict[entry.url] && entry.status !== NotionStatus.READ)
        .map(notionToPocketAdd);

    const archivePocketApiActions = syncedNotionEntries
        .filter(entry => entry.status === NotionStatus.READ && pocketDict[entry.url]?.status === PocketStatus.UNREAD)
        .map(item => pocketToArchiveAction(pocketDict[item.url]))
        .filter(item => item !== null);

    await pocket.updateArticles([...addPocketApiActions, ...archivePocketApiActions]);
}

main();