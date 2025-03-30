import { window } from "vscode";
import { convertCurl } from "zzapi";

import { openDocument } from "./showInEditor";

export default async function importCurl(): Promise<void> {
 const curlString = await window.showInputBox({ title: "Enter cURL" });

 if (!curlString || curlString.length < 1) return;

 try {
   const content = convertCurl(curlString);
   await openDocument(content, "yaml");
 } catch (e: any) {
   console.log(e);
   console.log(e.message);
   window.showErrorMessage(e.message, { modal: true });
   return;
 }
}
