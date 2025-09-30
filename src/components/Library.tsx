import { Book } from "../types";

interface LibraryProps {
    books: Book[];
    onOpen: (book: Book) => void;
}

export function Library({ books, onOpen }: LibraryProps) {
    return (
        <div className="mt-4 px-1">
            {books.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 mt-10">
                    <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-lg font-medium">Your library is empty</p>
                    <p className="text-sm">Drag and drop an ePub file above to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {books.map((book, index) => (
                        <div
                            key={`${book.hash}-${index}`}
                            className="group cursor-pointer flex flex-col"
                            onClick={() => onOpen(book)}
                        >
                            <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-blue-500/10 relative border border-gray-700 group-hover:border-gray-600">
                                {book.coverUrl ? (
                                    <img
                                        src={book.coverUrl}
                                        alt={book.title}
                                        className="w-full h-full object-cover transition-opacity duration-300"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-500 p-4 text-center">
                                        <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        <span className="text-xs font-serif line-clamp-3 opacity-50">{book.title}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                            <div className="mt-3 space-y-1 px-1">
                                <h3 className="font-semibold text-sm text-gray-200 truncate group-hover:text-blue-400 transition-colors" title={book.title}>
                                    {book.title}
                                </h3>
                                <p className="text-xs text-gray-500 truncate group-hover:text-gray-400 transition-colors">{book.author || "Unknown Author"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
