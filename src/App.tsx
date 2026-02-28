import React, { useState } from "react";
import { GraphView } from "./components/GraphView";
import { GoogleDriveProvider } from "./platform/GoogleDriveProvider";
import type { FileMeta } from "./platform/FileProvider";

const gDrive = new GoogleDriveProvider();

export default function App() {
  const [fileContent, setFileContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<FileMeta[]>([]);

  // --- LOCAL FILE UPLOAD (Kept from before) ---
  const handleLocalUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") setFileContent(e.target.result);
    };
    reader.readAsText(file);
  };

  // --- GOOGLE DRIVE FLOW ---
  const handleConnectDrive = async () => {
    const success = await gDrive.authenticate();
    if (!success) return alert("Failed to connect to Google Drive.");

    setIsLoading(true);
    const files = await gDrive.listFiles();
    setDriveFiles(files);
    setIsLoading(false);
  };

  const handleSelectDriveFile = async (file: FileMeta) => {
    setIsLoading(true);
    try {
      const content = await gDrive.readFile(file.id);
      setFileName(file.name);
      setFileContent(content);
    } catch (err) {
      alert("Failed to read file.");
    }
    setIsLoading(false);
  };

  // --- RENDERING ---

  // State 1: Disconnected / Picking a file
  if (!fileContent) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 bg-white rounded-xl shadow-lg max-w-md w-full border border-gray-100 flex flex-col gap-6">
          <h2 className="text-2xl font-semibold text-gray-800 text-center">
            Load Knowledge Graph
          </h2>

          {/* GDrive Section */}
          <div className="flex flex-col gap-3">
            {!gDrive.isAuthenticated() ? (
              <button
                onClick={handleConnectDrive}
                className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition"
              >
                Connect Google Drive
              </button>
            ) : driveFiles.length > 0 ? (
              <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                {driveFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleSelectDriveFile(file)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-sm"
                  >
                    📄 {file.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center">
                No .toml files found in Drive.
              </div>
            )}
            {isLoading && (
              <div className="text-sm text-blue-600 text-center animate-pulse">
                Loading...
              </div>
            )}
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Local File Section */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Upload Local TOML
            </label>
            <input
              type="file"
              accept=".toml"
              onChange={handleLocalUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer border border-gray-200 rounded-md"
            />
          </div>
        </div>
      </div>
    );
  }

  // State 2: The Graph
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="px-6 py-3 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center space-x-2 text-gray-700">
          <span className="text-xl">📂</span>
          <span className="font-medium text-sm">{fileName}</span>
        </div>
        <button
          onClick={() => {
            setFileContent("");
            setFileName("");
          }}
          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 transition-colors shadow-sm"
        >
          Close File
        </button>
      </header>
      <main className="flex-1 relative">
        <GraphView tomlString={fileContent} />
      </main>
    </div>
  );
}
