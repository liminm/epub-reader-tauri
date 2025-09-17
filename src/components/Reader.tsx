import { useEffect, useRef, useState } from "react";
import ePub, { Book as EpubBook, Rendition } from "epubjs";
import { readFile } from "@tauri-apps/plugin-fs";
import { Book } from "../App";

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

    useEffect(() => {
        let active = true;

        const loadBook = async () => {
            try {
                console.log("Loading book:", book.path);
                const fileBytes = await readFile(book.path);
                if (!active) return;

                const bookData = fileBytes.buffer;
                console.log("File read, size:", bookData.byteLength);

                // Initialize book with ArrayBuffer
                const epub = ePub(bookData);
                bookRef.current = epub;

                await epub.ready;
                console.log("Book ready");

                if (!active || !viewerRef.current) return;

                // Render to div
                const rendition = epub.renderTo(viewerRef.current, {
                    width: "100%",
                    height: "100%",
                    flow: "paginated",
                    manager: "default",
                });
                renditionRef.current = rendition;

                rendition.on("started", () => console.log("Rendition started"));
                rendition.on("displayError", (err: any) => console.error("Display Error:", err));
                rendition.on("relocated", (location: any) => {
                    console.log("Relocated:", location);
                });

                await rendition.display();
                console.log("Rendition displayed");

                // Force iframe visibility and permissions
                const iframe = viewerRef.current.querySelector("iframe");
                if (iframe) {
                    iframe.style.width = "100%";
                    iframe.style.height = "100%";
                    iframe.style.border = "none";
                    iframe.style.display = "block";

                    // Add more sandbox permissions
                    iframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-forms allow-modals");

                    // Check computed dimensions
                    const rect = iframe.getBoundingClientRect();
                    console.log("Iframe dimensions:", rect.width, "x", rect.height);

                    console.log("Iframe styled:", iframe);

                    // Try to access iframe content after a delay to ensure it's loaded
                    setTimeout(() => {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (iframeDoc) {
                                console.log("Iframe document accessible");
                                console.log("Iframe body HTML:", iframeDoc.body?.innerHTML?.substring(0, 200));

                                // Inject CSS to force visibility
                                const style = iframeDoc.createElement("style");
                                style.textContent = `
                                    * {
                                        max-width: 100% !important;
                                        box-sizing: border-box !important;
                                    }
                                    body {
                                        margin: 0 !important;
                                        padding: 20px !important;
                                        background: white !important;
                                        min-height: 100vh !important;
                                        display: block !important;
                                        visibility: visible !important;
                                    }
                                    img {
                                        display: block !important;
                                        max-width: 100% !important;
                                        height: auto !important;
                                        visibility: visible !important;
                                        opacity: 1 !important;
                                    }
                                `;
                                iframeDoc.head?.appendChild(style);

                                // Check image status
                                const img = iframeDoc.querySelector("img");
                                if (img) {
                                    console.log("Image found:", img.src);
                                    console.log("Image dimensions:", img.width, "x", img.height);
                                    console.log("Image complete:", img.complete);
                                    console.log("Image naturalWidth:", img.naturalWidth);
                                }
                            }
                        } catch (e) {
                            console.error("Cannot access iframe content:", e);
                        }
                    }, 500);
                }

                // Apply theme with default fallback
                rendition.themes.default({
                    "body": {
                        "color": "#000 !important",
                        "background": "#fff !important",
                        "font-size": "16px !important"
                    }
                });

                setIsReady(true);

            } catch (e: any) {
                console.error("Error loading book:", e);
                if (active) setError(e.message || String(e));
            }
        };

        loadBook();

        return () => {
            active = false;
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

    return (
        <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "#111827", overflow: "hidden" }}>
            {/* Header - Fixed height */}
            <div style={{ height: "56px", background: "#1f2937", display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid #374151", justifyContent: "space-between", zIndex: 50, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <button onClick={onBack} style={{ color: "#d1d5db", marginRight: "16px", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>
                        <span style={{ fontSize: "20px", marginRight: "4px" }}>‹</span> Back
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
            <div style={{ flex: 1, position: "relative", background: "white", width: "100%", overflow: "hidden" }}>
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
    );
}
