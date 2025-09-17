import { useEffect, useRef, useState } from "react";
import ePub from "epubjs";
import { readFile } from "@tauri-apps/plugin-fs";
import { join, appDataDir } from "@tauri-apps/api/path";

export function TestReader() {
    const viewerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState("Initializing...");
    const [debugInfo, setDebugInfo] = useState<string[]>([]);

    const addLog = (msg: string) => setDebugInfo(prev => [...prev, msg]);

    useEffect(() => {
        const load = async () => {
            try {
                // Hardcoded path to the file in root
                // Note: In a real app we'd need the absolute path. 
                // Since the user said "on root", I'll assume they mean the project root.
                // However, the app runs in a specific context. 
                // I'll try to use an absolute path that I can construct or just the filename if it's in the CWD of the app (which might be different).
                // Safest is to ask the user for the full path, but I can try to guess it based on the project structure.
                // The project is at /home/liminm/Documents/Programming/epub-reader-tauri
                const path = "/home/liminm/Documents/Programming/epub-reader-tauri/Dr. Marily Nika - Building AI-Powered Products (for True Epub) (2025, O'Reilly Media, Inc.) - libgen.li.epub";

                setStatus(`Loading: ${path}`);

                const fileBytes = await readFile(path);
                setStatus("File read. Size: " + fileBytes.byteLength);

                const bookData = fileBytes.buffer;
                const book = ePub(bookData);

                await book.ready;
                setStatus("Book parsed. Rendering...");

                if (viewerRef.current) {
                    const rendition = book.renderTo(viewerRef.current, {
                        width: "100%",
                        height: "100%",
                        flow: "paginated",
                        manager: "default"
                    });

                    await rendition.display();
                    setStatus("Rendered!");

                    // Debug check function
                    const checkDimensions = () => {
                        if (!viewerRef.current) return;
                        const containerRect = viewerRef.current.getBoundingClientRect();
                        addLog(`Container: ${containerRect.width}x${containerRect.height}`);

                        const iframe = viewerRef.current.querySelector("iframe");
                        if (iframe) {
                            const iframeRect = iframe.getBoundingClientRect();
                            addLog(`Iframe: ${iframeRect.width}x${iframeRect.height}`);
                            addLog(`Iframe display: ${iframe.style.display}`);
                            addLog(`Iframe visibility: ${iframe.style.visibility}`);

                            // Force styles
                            iframe.style.width = "100%";
                            iframe.style.height = "100%";
                            iframe.style.display = "block";
                            iframe.style.border = "2px solid red"; // Visible border
                            iframe.style.backgroundColor = "white";

                            try {
                                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                if (doc) {
                                    addLog(`Iframe body children: ${doc.body.children.length}`);
                                    addLog(`Iframe HTML: ${doc.body.innerHTML.substring(0, 50)}...`);

                                    // Force content visibility
                                    const style = doc.createElement('style');
                                    style.textContent = `
                                        body { background: white !important; color: black !important; display: block !important; height: 100% !important; }
                                        img { border: 5px solid blue !important; display: block !important; }
                                    `;
                                    doc.head.appendChild(style);
                                } else {
                                    addLog("Cannot access iframe document (CORS?)");
                                }
                            } catch (e: any) {
                                addLog(`Access error: ${e.message}`);
                            }
                        } else {
                            addLog("No iframe found!");
                        }
                    };

                    // Check immediately and periodically
                    checkDimensions();
                    setInterval(checkDimensions, 2000);
                }
            } catch (e: any) {
                setStatus(`Error: ${e.message}`);
                console.error(e);
            }
        };
        load();
    }, []);

    return (
        <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "#f3f4f6" }}>
            <div style={{ padding: "1rem", background: "white", borderBottom: "1px solid #e5e7eb", height: "200px", overflow: "auto", fontFamily: "monospace", fontSize: "12px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Status: {status}</div>
                {debugInfo.map((log, i) => <div key={i}>{log}</div>)}
            </div>
            <div style={{ flex: 1, position: "relative", background: "#d1d5db", padding: "1rem" }}>
                <div style={{ position: "absolute", top: "1rem", left: "1rem", right: "1rem", bottom: "1rem", background: "white", border: "4px solid green" }}>
                    <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />
                </div>
            </div>
        </div>
    );
}
