import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import ePub from "epubjs";
import { readFile } from "@tauri-apps/plugin-fs";
import { Book } from "../App";

interface DragDropZoneProps {
    onBookAdded: (book: Book) => void;
}

export function DragDropZone({ onBookAdded }: DragDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
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
        setError(null);
        for (const path of paths) {
            if (!path.toLowerCase().endsWith(".epub")) continue;

            try {
                const fileName = path.split(/[/\\]/).pop();
                setStatus(`Processing ${fileName}...`);

                // 1. Calculate Hash
                setStatus(`Hashing ${fileName}...`);
                const hash = await invoke<string>("calculate_book_hash", { filePath: path });

                // 2. Parse Metadata
                setStatus(`Reading metadata for ${fileName}...`);

                // Read file as ArrayBuffer to avoid asset protocol issues
                const fileBytes = await readFile(path);
                const book = ePub(fileBytes.buffer);

                await book.ready;
                const metadata = await book.loaded.metadata;
                const coverUrl = await book.coverUrl();

                // 3. Create Book Object
                setStatus(`Adding ${fileName} to library...`);
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
        setStatus(null);
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
    };

    return (
        <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-500/10" : "border-gray-600 hover:border-gray-500"
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {status ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg animate-pulse">{status}</p>
                </div>
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
