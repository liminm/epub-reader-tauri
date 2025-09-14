import { Book } from "../App";

interface LibraryProps {
    books: Book[];
    onOpen: (book: Book) => void;
}

export function Library({ books, onOpen }: LibraryProps) {
    return (
        <div className="flex-1 overflow-y-auto mt-6">
            {books.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                    <p>Your library is empty.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {books.map((book) => (
                        <div
                            key={book.hash}
                            className="group cursor-pointer flex flex-col"
                            onClick={() => onOpen(book)}
                        >
                            <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform group-hover:scale-105 relative">
                                {book.coverUrl ? (
                                    <img
                                        src={book.coverUrl}
                                        alt={book.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-500">
                                        No Cover
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                            <div className="mt-2">
                                <h3 className="font-semibold text-sm truncate" title={book.title}>
                                    {book.title}
                                </h3>
                                <p className="text-xs text-gray-400 truncate">{book.author}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
