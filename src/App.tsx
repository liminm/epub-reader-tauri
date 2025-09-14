import { useState, useEffect } from "react";
import { Library } from "./components/Library";
import { Reader } from "./components/Reader";
import { DragDropZone } from "./components/DragDropZone";

export interface Book {
  hash: string;
  title: string;
  author: string;
  coverUrl?: string;
  path: string;
  addedAt: number;
}

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("omni-books");
    if (stored) {
      setBooks(JSON.parse(stored));
    }
  }, []);

  const saveBooks = (newBooks: Book[]) => {
    setBooks(newBooks);
    localStorage.setItem("omni-books", JSON.stringify(newBooks));
  };

  const handleAddBook = (book: Book) => {
    if (books.some((b) => b.hash === book.hash)) {
      console.log("Book already exists");
      return;
    }
    saveBooks([...books, book]);
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {currentBook ? (
        <Reader book={currentBook} onBack={() => setCurrentBook(null)} />
      ) : (
        <div className="p-8 h-full flex flex-col">
          <h1 className="text-3xl font-bold mb-6">OmniRead Library</h1>
          <DragDropZone onBookAdded={handleAddBook} />
          <Library books={books} onOpen={setCurrentBook} />
        </div>
      )}
    </div>
  );
}

export default App;
