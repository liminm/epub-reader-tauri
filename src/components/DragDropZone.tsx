import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import ePub from "epubjs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Book } from "../App";

interface DragDropZoneProps {
    onBookAdded: (book: Book) => void;
}

export function DragDropZone({ onBookAdded }: DragDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [processing, setProcessing] = useState(false);

    const [error, setError] = useState<string | null>(null);

    // Handle file drop from OS
    useEffect(() => {
        const unlisten = listen("tauri://drag-drop", async (event: any) => {
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
                handleFiles(paths);
            }
        });

        return () => {
            unlisten.then((f) => f());
        };
    }, []);

    const handleFiles = async (paths: string[]) => {
        setProcessing(true);
        setError(null);
        for (const path of paths) {
            if (!path.toLowerCase().endsWith(".epub")) continue;

            try {
                console.log("Processing file:", path);
                // 1. Calculate Hash
                const hash = await invoke<string>("calculate_book_hash", { filePath: path });
                console.log("Hash calculated:", hash);

                // 2. Parse Metadata
                const url = convertFileSrc(path);
                console.log("File URL:", url);

                const book = ePub(url);
                await book.ready;
                console.log("Book ready");

                const metadata = await book.loaded.metadata;
                console.log("Metadata loaded:", metadata);

                const coverUrl = await book.coverUrl();
                console.log("Cover URL:", coverUrl);

                // 3. Create Book Object
                const newBook: Book = {
                    hash,
                    title: metadata.title,
                    author: metadata.creator,
                    coverUrl: coverUrl || undefined,
                    path,
                    addedAt: Date.now(),
                };

                onBookAdded(newBook);
            } catch (e: any) {
                console.error("Error processing file:", path, e);
                setError(`Failed to process ${path}: ${e.message || e}`);
            }
        }
        setProcessing(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // This handles browser-internal drops, but for OS drops we rely on tauri://drag-drop
        // However, if the user drags from OS to the window, the browser might also fire drop events if not prevented.
        // The tauri://drag-drop event is more reliable for OS files.
    };

    return (
        <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-500/10" : "border-gray-600 hover:border-gray-500"
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {processing ? (
                <p className="text-lg">Processing books...</p>
            ) : (
                <div>
                    <p className="text-xl font-medium mb-2">Drag & Drop ePub files here</p>
                    <p className="text-gray-400 text-sm">or click to browse (coming soon)</p>
                </div>
            )}
            {error && (
                <div className="mt-4 p-2 bg-red-500/20 text-red-200 rounded text-sm">
                    {error}
                </div>
            )}
        </div>
    );
}

import { useEffect } from "react";
