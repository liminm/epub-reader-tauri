export interface Book {
    title: string;
    author?: string;
    path: string;
    cover?: string;
    coverUrl?: string;
    lastRead?: string;
    lastLocation?: string; // CFI string
    progress?: number; // 0-100 percentage
    hash: string;
    addedAt?: number;
}
