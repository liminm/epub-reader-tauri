import localforage from "localforage";
import { Book } from "../types";

localforage.config({
    name: "OmniRead",
    storeName: "books_db",
});

export const storage = {
    getBooks: async (): Promise<Book[]> => {
        const books = await localforage.getItem<Book[]>("books");
        return books || [];
    },

    saveBooks: async (books: Book[]): Promise<void> => {
        await localforage.setItem("books", books);
    },

    clearBooks: async (): Promise<void> => {
        await localforage.removeItem("books");
    },
};
