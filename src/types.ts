export interface Book {
    title: string;
    author?: string;
    path: string;
    cover?: string;
    coverUrl?: string;
    lastRead?: string;
    progress?: number;
    hash: string;
    addedAt?: number;
}
