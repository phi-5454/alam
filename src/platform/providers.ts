import type { IFileProvider, FileMeta } from "./FileProvider";

export class LocalStorageProvider implements IFileProvider {
  providerName = "Local Hard Drive";
  private directoryHandle: any = null; // Using 'any' to bypass strict TS DOM limits for this API
  private fileHandles: Map<string, any> = new Map(); // Maps fileId (name) to its FileHandle

  async authenticate(): Promise<boolean> {
    try {
      // ⚠️ This opens the native OS folder picker. It MUST be triggered by a button click!
      this.directoryHandle = await (window as any).showDirectoryPicker({
        mode: "readwrite", // Request permission to save changes back to the files
      });
      return true;
    } catch (error) {
      console.warn(
        "User cancelled the folder picker or it's unsupported.",
        error,
      );
      return false;
    }
  }

  isAuthenticated(): boolean {
    return this.directoryHandle !== null;
  }

  async listFiles(): Promise<FileMeta[]> {
    if (!this.directoryHandle) throw new Error("Not connected to a folder.");

    const files: FileMeta[] = [];
    this.fileHandles.clear();

    // Loop through the selected folder
    for await (const entry of this.directoryHandle.values()) {
      // Only grab actual files that end in .toml
      if (entry.kind === "file" && entry.name.endsWith(".toml")) {
        this.fileHandles.set(entry.name, entry);
        files.push({ id: entry.name, name: entry.name });
      }
    }
    return files;
  }

  async readFile(fileId: string): Promise<string> {
    const handle = this.fileHandles.get(fileId);
    if (!handle) throw new Error(`File ${fileId} not found in memory.`);

    const file = await handle.getFile();
    return await file.text();
  }

  async writeFile(fileId: string, content: string): Promise<boolean> {
    const handle = this.fileHandles.get(fileId);
    if (!handle) throw new Error("File handle missing.");

    // Create a writable stream, write the new TOML, and safely close it
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();

    return true;
  }
}

// --- CLOUD SKELETON (Google Drive / Dropbox) ---
export class CloudFileProvider implements IFileProvider {
  providerName = "Cloud Storage";
  private token: string | null = null;

  async authenticate() {
    // TODO: Trigger OAuth popup, get token
    this.token = "dummy_oauth_token";
    return true;
  }

  isAuthenticated() {
    return this.token !== null;
  }

  async listFiles(): Promise<FileMeta[]> {
    // TODO: Fetch files from Cloud API using this.token
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async readFile(fileId: string): Promise<string> {
    // TODO: Fetch file content from Cloud API
    return "";
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async writeFile(fileId: string, content: string): Promise<boolean> {
    // TODO: PUT/PATCH request to Cloud API
    return true;
  }
}
