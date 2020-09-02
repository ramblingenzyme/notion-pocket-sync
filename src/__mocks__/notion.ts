
const { NotionStatus } = jest.requireActual("../notion");
export { NotionStatus };

export class Notion {
    getArticles = jest.fn(() => Promise.resolve([]));

    getArticlesAsDict = jest.fn(() => Promise.resolve({}));

    runApiActions = jest.fn(() => Promise.resolve());
}