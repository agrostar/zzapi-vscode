import { Uri, window, workspace } from "vscode";
import convertPostman from "./core/convertPostman";

export async function importPostmanCommand(): Promise<void> {
  const file = await window.showOpenDialog({
    filters: { JSON: ["json", "JSON"] },
    title: "Import Postman Collection",
  });

  if (!file || file.length < 1) {
    window.showInformationMessage("No file selected");
    return;
  }

  const path = file[0].path;
  const pathParsed = path.split('\\').join('/');
  const pathUri = Uri.file(pathParsed);
  const pathStr = pathUri.fsPath;

  try {
    const content = convertPostman(pathStr);
    const doc = await workspace.openTextDocument({ content, language: "yaml" });
    window.showTextDocument(doc);
  } catch (e: any) {
    console.log(e);
    console.log(e.message);
    window.showErrorMessage(e.message, { modal: true });
    return;
  }
}