import { NotionItem, NotionStatus } from "./notion";
import { PocketItem, PocketStatus } from "./pocket";

export const notionToPocketAdd = (item: NotionItem) => ({
    action: "add",
    url: item.url,
}) as const;

export const pocketToArchiveAction = (pocketItem: PocketItem) => ({
    action: "archive",
    item_id: pocketItem.id,
}) as const;


export const readInPocket = (item?: PocketItem) => item?.status === PocketStatus.ARCHIVED;
export const unreadInPocket = (item?: PocketItem) => item?.status === PocketStatus.UNREAD;

export const readInNotion = (item?: NotionItem) => item?.status === NotionStatus.READ;
export const unreadInNotion = (item?: NotionItem) => item?.status !== NotionStatus.READ;

interface LastUpdated {
    lastUpdated: Date;
}
export const getValue = (x?: LastUpdated) => x?.lastUpdated.valueOf();
export const wasUpdatedLast = (a: LastUpdated, b: LastUpdated | undefined) => Number(getValue(a)) > Number(getValue(b));