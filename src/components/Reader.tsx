import { useEffect, useRef, useState } from "react";
import ePub, { Book as EpubBook, Rendition } from "epubjs";
// import { convertFileSrc } from "@tauri-apps/api/core";
// import { readFile } from "@tauri-apps/plugin-fs";
import { Book } from "../types";

interface ReaderProps {
    book: Book;
    onBack: () => void;
    onUpdateBook: (book: Book) => void;
}

export function Reader({ book, onBack, onUpdateBook }: ReaderProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<EpubBook | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toc, setToc] = useState<any[]>([]);
    const [isTocOpen, setIsTocOpen] = useState(false);

    const [viewMode, setViewMode] = useState<"scrolled" | "single" | "double">("scrolled");

    // Theme State
    const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem("reader_fontSize") || "100"));
    const [fontFamily, setFontFamily] = useState(() => localStorage.getItem("reader_fontFamily") || "Helvetica, sans-serif");
    const [theme, setTheme] = useState<"light" | "dark" | "sepia">(() => (localStorage.getItem("reader_theme") as any) || "light");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Persist settings
    useEffect(() => {
        localStorage.setItem("reader_fontSize", fontSize.toString());
        localStorage.setItem("reader_fontFamily", fontFamily);
        localStorage.setItem("reader_theme", theme);
    }, [fontSize, fontFamily, theme]);

    // 1. Initialize Book
    useEffect(() => {
        if (!book) return;

        let active = true;
        const loadBook = async () => {
            try {
                const url = `epubstream://localhost${book.path}_unpacked/`;
                const epub = ePub(url);
                bookRef.current = epub;

                await epub.ready;
                if (!active) return;

                // Load TOC
                const navigation = await epub.loaded.navigation;
                setToc(navigation.toc);

                setIsReady(true);
            } catch (e: any) {
                console.error("Error loading book:", e);
                setError(e.message || String(e));
            }
        };

        loadBook();

        return () => {
            active = false;
            if (bookRef.current) {
                bookRef.current.destroy();
                bookRef.current = null;
            }
        };
    }, [book.path]);

    // 2. Initialize/Update Rendition based on ViewMode
    useEffect(() => {
        if (!isReady || !bookRef.current || !viewerRef.current) return;

        const epub = bookRef.current;
        let currentLocation: any = book.lastLocation || null;

        // Save current location if we are re-rendering
        if (renditionRef.current) {
            try {
                currentLocation = renditionRef.current.location.start.cfi;
                renditionRef.current.destroy();
            } catch (e) {
                console.warn("Error destroying previous rendition:", e);
            }
        }

        // Configure options based on viewMode
        const options: any = {
            width: "100%",
            height: "100%",
        };

        if (viewMode === "scrolled") {
            options.flow = "scrolled-doc";
            options.manager = "continuous";
        } else if (viewMode === "single") {
            options.flow = "paginated";
            options.spread = "none";
        } else if (viewMode === "double") {
            options.flow = "paginated";
            options.spread = "always"; // Force double spread
        }

        console.log("Creating rendition with options:", options);
        const rendition = epub.renderTo(viewerRef.current, options);
        renditionRef.current = rendition;

        // Display at previous location or start
        rendition.display(currentLocation || undefined);

        // Add keyboard listeners to the rendition (iframe)
        rendition.on("keydown", (e: any) => {
            console.log("Rendition keydown:", e.key);
            if (e.key === "ArrowRight") {
                console.log("Calling next() from rendition listener");
                rendition.next();
            }
            if (e.key === "ArrowLeft") {
                console.log("Calling prev() from rendition listener");
                rendition.prev();
            }
        });

        // Track relocation
        rendition.on("relocated", (location: any) => {
            // Update book state
            onUpdateBook({
                ...book,
                lastLocation: location.start.cfi,
            });
        });

        // Focus the viewer to ensure keyboard events are captured
        if (viewerRef.current) {
            viewerRef.current.focus();
        }

        return () => {
            if (renditionRef.current) {
                renditionRef.current.destroy();
                renditionRef.current = null;
            }
        };
    }, [isReady, viewMode]);

    // 3. Apply Theme Settings
    useEffect(() => {
        if (!renditionRef.current) return;

        const rendition = renditionRef.current;

        // Register themes
        rendition.themes.register("light", { body: { color: "#000", background: "#fff" } });
        rendition.themes.register("dark", { body: { color: "#fff", background: "#111" } });
        rendition.themes.register("sepia", { body: { color: "#5f4b32", background: "#f6f1d1" } });

        // Apply settings
        rendition.themes.select(theme);
        rendition.themes.fontSize(`${fontSize}%`);
        rendition.themes.font(fontFamily);

        // Apply layout specific styles
        rendition.themes.default({
            "body": {
                "padding": viewMode === "scrolled" ? "20px 10% !important" : "0 !important",
            }
        });

    }, [theme, fontSize, fontFamily, viewMode, isReady]);

    // Global keyboard listener for the main window
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            console.log("Global keydown:", e.key);
            if (e.key === "ArrowLeft") {
                console.log("Calling prev() from global listener");
                renditionRef.current?.prev();
            }
            if (e.key === "ArrowRight") {
                console.log("Calling next() from global listener");
                renditionRef.current?.next();
            }
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

    const toggleViewMode = () => {
        setViewMode(prev => {
            if (prev === "scrolled") return "single";
            if (prev === "single") return "double";
            return "scrolled";
        });
    };

    const getViewModeIcon = () => {
        if (viewMode === "scrolled") {
            return (
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            );
        } else if (viewMode === "single") {
            return (
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            );
        } else {
            return (
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            );
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
                        style={{ color: "#d1d5db", marginRight: "12px", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
                        title="Table of Contents"
                    >
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <button
                        onClick={toggleViewMode}
                        style={{ color: "#d1d5db", marginRight: "12px", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
                        title={`View Mode: ${viewMode}`}
                    >
                        {getViewModeIcon()}
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        style={{ color: "#d1d5db", marginRight: "16px", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
                        title="Settings"
                    >
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

                {/* Settings Panel */}
                {isSettingsOpen && (
                    <div style={{ position: "absolute", top: "10px", right: "10px", width: "250px", background: "#1f2937", border: "1px solid #374151", borderRadius: "8px", padding: "16px", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
                        <div style={{ marginBottom: "16px" }}>
                            <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "8px", fontWeight: "bold", textTransform: "uppercase" }}>Theme</div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button onClick={() => setTheme("light")} style={{ flex: 1, height: "32px", background: "#fff", border: theme === "light" ? "2px solid #3b82f6" : "1px solid #374151", borderRadius: "4px" }} title="Light"></button>
                                <button onClick={() => setTheme("dark")} style={{ flex: 1, height: "32px", background: "#111", border: theme === "dark" ? "2px solid #3b82f6" : "1px solid #374151", borderRadius: "4px" }} title="Dark"></button>
                                <button onClick={() => setTheme("sepia")} style={{ flex: 1, height: "32px", background: "#f6f1d1", border: theme === "sepia" ? "2px solid #3b82f6" : "1px solid #374151", borderRadius: "4px" }} title="Sepia"></button>
                            </div>
                        </div>
                        <div style={{ marginBottom: "16px" }}>
                            <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "8px", fontWeight: "bold", textTransform: "uppercase" }}>Font Size</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#d1d5db" }}>
                                <button onClick={() => setFontSize(Math.max(50, fontSize - 10))} style={{ width: "32px", height: "32px", background: "#374151", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>-</button>
                                <span>{fontSize}%</span>
                                <button onClick={() => setFontSize(Math.min(200, fontSize + 10))} style={{ width: "32px", height: "32px", background: "#374151", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>+</button>
                            </div>
                        </div>
                        <div>
                            <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "8px", fontWeight: "bold", textTransform: "uppercase" }}>Font Family</div>
                            <select
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value)}
                                style={{ width: "100%", padding: "8px", background: "#374151", color: "white", border: "none", borderRadius: "4px", outline: "none" }}
                            >
                                <option value="Helvetica, sans-serif">Sans-serif</option>
                                <option value="Georgia, serif">Serif</option>
                                <option value="Courier New, monospace">Monospace</option>
                            </select>
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
                    <div
                        ref={viewerRef}
                        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", outline: "none" }}
                        tabIndex={-1}
                    />
                </div>
            </div>
        </div>
    );
}
