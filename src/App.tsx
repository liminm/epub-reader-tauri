import { useState, useEffect } from "react";
import { DragDropZone } from "./components/DragDropZone";
import { Library } from "./components/Library";
import { Reader } from "./components/Reader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { storage } from "./utils/storage";
import { Book } from "./types";

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  useEffect(() => {
    const loadBooks = async () => {
      const savedBooks = await storage.getBooks();
      setBooks(savedBooks);
    };
    loadBooks();
  }, []);

  const handleAddBook = async (book: Book) => {
    setBooks((prevBooks) => {
      const newBooks = [...prevBooks, book];
      // Side effect: save to storage. 
      // Note: In a stricter React setup, we might use a useEffect for this, 
      // but this ensures we save exactly what we set.
      storage.saveBooks(newBooks);
      return newBooks;
    });
  };

  const clearLibrary = async () => {
    await storage.clearBooks();
    setBooks([]);
    setCurrentBook(null);
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden flex flex-col">
      {currentBook ? (
        <ErrorBoundary>
          <Reader book={currentBook} onBack={() => setCurrentBook(null)} />
        </ErrorBoundary>
      ) : (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6 md:p-8 overflow-hidden">
          <header className="flex justify-between items-end mb-6 pb-4 border-b border-gray-800">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                OmniRead
              </h1>
              <p className="text-gray-400 text-sm mt-1">Your personal ePub library</p>
            </div>
            {books.length > 0 && (
              <button
                onClick={clearLibrary}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors px-3 py-1 rounded hover:bg-gray-800"
              >
                Clear Library
              </button>
            )}
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <div className="mb-8 flex justify-center">
              <div className="w-full max-w-2xl">
                <DragDropZone onBookAdded={handleAddBook} />
              </div>
            </div>

            <div className="flex flex-col pb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-200">Library</h2>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">{books.length} Books</span>
              </div>
              <Library books={books} onOpen={setCurrentBook} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
