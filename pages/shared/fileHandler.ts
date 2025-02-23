
import { readableStreamFromIterable } from "https://deno.land/std@0.200.0/streams/readable_stream_from_iterable.ts";

export interface FileEntry {
    path: string;
    file: File;
}

//should be fixed in next TS version
declare global {
    interface FileSystemDirectoryHandle {
        values: () => ReadableStream<FileSystemDirectoryHandle | FileSystemFileHandle>;
    }
}

async function* walkFileTree(handle: FileSystemHandle, path?: string): AsyncGenerator<FileEntry> {
    const realpath = path ?? `${handle.name}`;
    if (handle.kind === 'file') {
        const file = await (<FileSystemFileHandle>handle).getFile();
        yield { path: realpath, file };
    } else if (handle.kind === 'directory') {
        const entries = (<FileSystemDirectoryHandle>handle).values();
        for await (const entry of entries) {
            const entryPath = `${realpath}/${entry.name}`;

            if (entry.kind == "file") {
                const file = await entry.getFile();
                yield { path: entryPath, file };
            } else if (entry.kind == "directory") {
                yield* walkFileTree(entry, entryPath);
            }
        }
    }
}

export async function countFileTree(handle: FileSystemHandle) {
    let count = 0;
    if (handle.kind === 'file') {
        count++;
    } else if (handle.kind === 'directory') {
        const entries = (<FileSystemDirectoryHandle>handle).values();

        for await (const entry of entries) {
            if (entry.kind == "file") {
                count++;
            } else if (entry.kind == "directory") {
                count += await countFileTree(entry);
            }
        }
    }
    return count;
}

export const getFileStream = (handle: FileSystemHandle) => 'from' in ReadableStream && ReadableStream.from instanceof Function ? ReadableStream.from(walkFileTree(handle)) : readableStreamFromIterable(walkFileTree(handle));