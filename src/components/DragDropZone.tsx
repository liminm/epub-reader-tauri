import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import ePub from "epubjs";
import { readFile } from "@tauri-apps/plugin-fs";
import { Book } from "../types";

interface DragDropZoneProps {
    onBookAdded: (book: Book) => void;
}

export function DragDropZone({ onBookAdded }: DragDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Use ref to keep track of the latest callback without triggering effect re-runs
    const onBookAddedRef = useRef(onBookAdded);

    useEffect(() => {
        onBookAddedRef.current = onBookAdded;
    }, [onBookAdded]);

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

                // Get cover and convert to base64
                let coverUrl: string | undefined;
                try {
                    const coverUrlBlob = await book.coverUrl();
                    if (coverUrlBlob) {
                        const response = await fetch(coverUrlBlob);
                        const blob = await response.blob();
                        coverUrl = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                    }
                } catch (e) {
                    console.warn("Failed to load cover:", e);
                }

                // 3. Create Book Object
                setStatus(`Adding ${fileName} to library...`);
                const newBook: Book = {
                    hash,
                    title: metadata.title,
                    author: metadata.creator,
                    coverUrl: coverUrl,
                    path,
                    addedAt: Date.now(),
                };

                onBookAddedRef.current(newBook);
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
            className={`relative group border-2 border-dashed rounded-xl p-3 transition-all duration-300 ease-in-out cursor-pointer
                ${isDragging
                    ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                    : "border-gray-700 hover:border-blue-400 hover:bg-gray-800/50"
                }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex items-center justify-center space-x-3 pointer-events-none min-h-[40px]">
                {status ? (
                    <>
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-blue-400 animate-pulse">{status}</p>
                    </>
                ) : (
                    <>
                        <div className={`transition-transform duration-300 ${isDragging ? "scale-110 text-blue-400" : "text-gray-400 group-hover:text-blue-400 group-hover:scale-110"}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <div className="flex items-baseline space-x-2">
                            <p className="text-base font-medium text-gray-300">
                                Drop ePub files here
                            </p>
                            <span className="text-xs text-gray-500 hidden sm:inline-block">
                                or click to browse
                            </span>
                        </div>
                    </>
                )}
            </div>

            {error && (
                <div className="absolute top-full left-0 right-0 mt-2 mx-auto w-max max-w-[90%] z-10 animate-fade-in">
                    <div className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-xs flex items-center shadow-lg backdrop-blur-sm">
                        <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                </div>
            )}
        </div>
    );
}
