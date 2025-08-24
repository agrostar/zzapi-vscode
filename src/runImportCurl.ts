import { env, window } from "vscode";

import convertCurl from "./convertCurl";
import { insertContent } from "./addSamples";

export default async function importCurl(): Promise<void> {
  try {
    const clipboardText = await env.clipboard.readText();

    if (!clipboardText || clipboardText.length < 1) {
      throw new Error("cURL not copied.");
    }
    if (!clipboardText?.toLowerCase()?.trimStart()?.startsWith("curl ")) {
      throw new Error("Invalid cURL.");
    }

    const content = convertCurl(clipboardText);
    await insertContent(content);
  } catch (e: any) {
    console.log(e);
    console.log(e.message);
    window.showErrorMessage(e.message, { modal: true });
    return;
  }
}
