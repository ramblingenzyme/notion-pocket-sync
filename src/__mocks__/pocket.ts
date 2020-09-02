const { PocketStatus } = jest.requireActual("../pocket");
export { PocketStatus };

export class Pocket {
    getArticles = jest.fn(() => Promise.resolve([]));

    getArticlesAsDict = jest.fn(() => Promise.resolve({}));

    updateArticles = jest.fn(() => Promise.resolve());
}