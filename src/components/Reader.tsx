import { useEffect, useRef, useState } from "react";
import ePub, { Book as EpubBook, Rendition } from "epubjs";
// import { convertFileSrc } from "@tauri-apps/api/core";
// import { readFile } from "@tauri-apps/plugin-fs";
import { Book } from "../types";

interface ReaderProps {
    book: Book;
    onBack: () => void;
}

export function Reader({ book, onBack }: ReaderProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<EpubBook | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toc, setToc] = useState<any[]>([]);
    const [isTocOpen, setIsTocOpen] = useState(false);

    useEffect(() => {
        const loadBook = async () => {
            if (!book) return;

            try {
                console.log("Loading book:", book.path);
                // Use custom protocol 'epubstream' which supports CORS headers
                // We construct the URL manually.
                // Note: On Linux/macOS, path starts with /, so we append it to the protocol + host.
                // e.g. epubstream://localhost/home/user/book.epub_unpacked/
                // IMPORTANT: We append "_unpacked/" to the URL to ensure epub.js treats it as a directory
                // and not a binary file (hiding the .epub extension from the end of the URL).
                const url = `epubstream://localhost${book.path}_unpacked/`;
                console.log("Book URL:", url);

                // Initialize book with URL.
                const epub = ePub(url);
                bookRef.current = epub;

                // Load TOC
                const navigation = await epub.loaded.navigation;
                setToc(navigation.toc);

                // Render to the viewer div
                if (viewerRef.current) {
                    const rendition = epub.renderTo(viewerRef.current, {
                        width: "100%",
                        height: "100%",
                        flow: "scrolled-doc",
                    });
                    renditionRef.current = rendition;

                    // Display the book
                    await rendition.display();

                    // Add keyboard listeners
                    const handleKeyDown = (e: KeyboardEvent) => {
                        if (e.key === "ArrowRight") rendition.next();
                        if (e.key === "ArrowLeft") rendition.prev();
                    };

                    rendition.on("keydown", handleKeyDown);
                    document.addEventListener("keydown", handleKeyDown);

                    // Apply theme with default fallback
                    rendition.themes.default({
                        "body": {
                            "color": "#000 !important",
                            "background": "#fff !important",
                            "font-size": "16px !important"
                        }
                    });
                }

                setIsReady(true);

            } catch (e: any) {
                console.error("Error loading book:", e);
                setError(e.message || String(e));
            }
        };

        loadBook();

        return () => {
            if (bookRef.current) {
                bookRef.current.destroy();
            }
        };
    }, [book.path]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") prevPage();
            if (e.key === "ArrowRight") nextPage();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const prevPage = () => renditionRef.current?.prev();
    const nextPage = () => renditionRef.current?.next();

    const handleChapterClick = (href: string) => {
        if (renditionRef.current) {
            renditionRef.current.display(href);
            setIsTocOpen(false);
        }
    };

    return (
        <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "#111827", overflow: "hidden" }}>
            {/* Header - Fixed height */}
            <div style={{ height: "56px", background: "#1f2937", display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid #374151", justifyContent: "space-between", zIndex: 50, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <button onClick={onBack} style={{ color: "#d1d5db", marginRight: "16px", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>
                        <span style={{ fontSize: "20px", marginRight: "4px" }}>‹</span> Back
                    </button>
                    <button
                        onClick={() => setIsTocOpen(!isTocOpen)}
                        style={{ color: "#d1d5db", marginRight: "16px", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
                        title="Table of Contents"
                    >
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span style={{ color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "300px", fontWeight: 500 }}>{book.title}</span>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={prevPage} style={{ padding: "6px 16px", background: "#2563eb", color: "white", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
                        Previous
                    </button>
                    <button onClick={nextPage} style={{ padding: "6px 16px", background: "#2563eb", color: "white", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
                        Next
                    </button>
                </div>
            </div>

            {/* Content area - Flex grow */}
            <div style={{ flex: 1, position: "relative", background: "white", width: "100%", overflow: "hidden", display: "flex" }}>

                {/* TOC Sidebar */}
                {isTocOpen && (
                    <div style={{ width: "300px", background: "#1f2937", borderRight: "1px solid #374151", overflowY: "auto", zIndex: 45, display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "16px", borderBottom: "1px solid #374151", color: "#e5e7eb", fontWeight: "bold" }}>Table of Contents</div>
                        <div style={{ flex: 1, overflowY: "auto" }}>
                            {toc.map((chapter, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleChapterClick(chapter.href)}
                                    style={{
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "12px 16px",
                                        background: "none",
                                        border: "none",
                                        color: "#d1d5db",
                                        cursor: "pointer",
                                        borderBottom: "1px solid #374151",
                                        fontSize: "14px"
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = "#374151"}
                                    onMouseOut={(e) => e.currentTarget.style.background = "none"}
                                >
                                    {chapter.label.trim()}
                                </button>
                            ))}
                            {toc.length === 0 && <div style={{ padding: "16px", color: "#9ca3af", fontSize: "14px" }}>No chapters found</div>}
                        </div>
                    </div>
                )}

                {/* Main Viewer Area */}
                <div style={{ flex: 1, position: "relative", background: "white", overflow: "hidden" }}>
                    {error && <div style={{ color: "#ef4444", padding: "16px", position: "absolute", zIndex: 40, background: "rgba(255,255,255,0.9)", width: "100%", textAlign: "center", borderBottom: "1px solid #fecaca" }}>{error}</div>}
                    {!isReady && !error && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, background: "#111827", color: "white" }}>
                            <div className="animate-spin" style={{ width: "32px", height: "32px", border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", marginRight: "12px" }}></div>
                            Loading Book...
                        </div>
                    )}

                    {/* Click zones for navigation */}
                    <div
                        style={{ position: "absolute", top: 0, left: 0, width: "80px", height: "100%", zIndex: 30, cursor: "pointer" }}
                        onClick={prevPage}
                        title="Previous Page"
                    />
                    <div
                        style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "100%", zIndex: 30, cursor: "pointer" }}
                        onClick={nextPage}
                        title="Next Page"
                    />

                    {/* Viewer - Absolute to fill the flex-1 container */}
                    <div ref={viewerRef} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />
                </div>
            </div>
        </div>
    );
}
