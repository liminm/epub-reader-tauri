import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DragDropZone } from "./components/DragDropZone";
import { Library } from "./components/Library";
import { Reader } from "./components/Reader";
import { ErrorBoundary } from "./components/ErrorBoundary";

export interface Book {
  title: string;
  path: string;
  cover?: string;
  lastRead?: string;
  progress?: number;
  hash: string;
}

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("books");
    if (saved) {
      setBooks(JSON.parse(saved));
    }
  }, []);

  const handleAddBook = (book: Book) => {
    const newBooks = [...books, book];
    setBooks(newBooks);
    localStorage.setItem("books", JSON.stringify(newBooks));
  };

  const clearLibrary = () => {
    localStorage.removeItem("books");
    setBooks([]);
    setCurrentBook(null);
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {currentBook ? (
        <ErrorBoundary>
          <Reader book={currentBook} onBack={() => setCurrentBook(null)} />
        </ErrorBoundary>
      ) : (
        <div className="p-8 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">OmniRead Library</h1>
            <button
              onClick={clearLibrary}
              className="text-xs text-red-400 hover:text-red-300 underline"
            >
              Clear Library
            </button>
          </div>
          <DragDropZone onBookAdded={handleAddBook} />
          <Library books={books} onOpen={setCurrentBook} />
        </div>
      )}
    </div>
  );
}

export default App;
