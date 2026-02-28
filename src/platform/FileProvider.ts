export interface FileMeta {
  id: string;
  name: string;
  updatedAt?: string;
}

export interface IFileProvider {
  providerName: string;

  // Authentication (useful for cloud, can be a no-op for local)
  authenticate(): Promise<boolean>;
  isAuthenticated(): boolean;

  // File Operations
  listFiles(): Promise<FileMeta[]>;
  readFile(fileId: string): Promise<string>;
  writeFile(fileId: string, content: string): Promise<boolean>;
}
