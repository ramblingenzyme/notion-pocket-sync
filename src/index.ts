import "dotenv/config";
import Notabase from "@vihanb/notabase";

const nb = new Notabase({
    token: process.env.NOTION_AUTH,
})

async function main() {
    const readingList = await nb.fetch(process.env.READING_LIST_PAGE);
    console.log(JSON.stringify(readingList.rows, null, 2));
}

main();