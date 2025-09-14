import { ReactReader } from "react-reader";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Book } from "../App";
import { useState } from "react";

interface ReaderProps {
    book: Book;
    onBack: () => void;
}

export function Reader({ book, onBack }: ReaderProps) {
    const [location, setLocation] = useState<string | number>(0);
    const url = convertFileSrc(book.path);

    return (
        <div className="h-full flex flex-col">
            <div className="h-10 bg-gray-800 flex items-center px-4 border-b border-gray-700">
                <button
                    onClick={onBack}
                    className="text-gray-300 hover:text-white text-sm font-medium"
                >
                    &larr; Back to Library
                </button>
                <span className="ml-4 text-sm text-gray-400 truncate">{book.title}</span>
            </div>
            <div className="flex-1 relative">
                <ReactReader
                    url={url}
                    location={location}
                    locationChanged={(epubcifi: string | number) => setLocation(epubcifi)}
                    epubOptions={{
                        flow: "paginated",
                        manager: "default",
                    }}
                    getRendition={(rendition) => {
                        rendition.themes.register("dark", {
                            body: { color: "#ccc", background: "#242424" },
                            p: { color: "#ccc" },
                            span: { color: "#ccc" },
                            h1: { color: "#ccc" },
                            h2: { color: "#ccc" },
                            h3: { color: "#ccc" },
                            h4: { color: "#ccc" },
                        });
                        rendition.themes.select("dark");
                    }}
                />
            </div>
        </div>
    );
}
