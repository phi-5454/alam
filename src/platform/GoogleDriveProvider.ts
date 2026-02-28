import type { IFileProvider, FileMeta } from "./FileProvider";

// Note: You will need to create a project in the Google Cloud Console,
// enable the Google Drive API, and generate an OAuth Client ID.
const CLIENT_ID =
  "629490166774-c08isl5810k3magrcbv18t6092age7ss.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

export class GoogleDriveProvider implements IFileProvider {
  providerName = "Google Drive";
  private accessToken: string | null = null;

  async authenticate(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // @ts-ignore - 'google' is injected globally by the index.html script
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error !== undefined) {
              console.error("Google Auth Error:", response.error);
              resolve(false);
            }
            this.accessToken = response.access_token;
            resolve(true);
          },
        });

        // Trigger the popup
        tokenClient.requestAccessToken({ prompt: "consent" });
      } catch (err) {
        console.error("Ensure the Google Identity script is loaded.", err);
        resolve(false);
      }
    });
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  async listFiles(): Promise<FileMeta[]> {
    if (!this.accessToken) throw new Error("Not authenticated");

    // Search for any file containing .toml in the name that isn't in the trash
    const query = encodeURIComponent("name contains '.toml' and trashed=false");

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=10`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
    );

    const data = await response.json();
    return data.files || [];
  }

  async readFile(fileId: string): Promise<string> {
    if (!this.accessToken) throw new Error("Not authenticated");

    // Adding alt=media tells Google Drive to return the file contents, not metadata
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
    );

    if (!response.ok) throw new Error("Failed to read file from Google Drive");
    return await response.text();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async writeFile(fileId: string, content: string): Promise<boolean> {
    // We are skipping this for now, as requested!
    throw new Error("Save functionality not yet implemented for Google Drive.");
  }
}
