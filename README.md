# zzAPI Visual Studio Code Extension

zzAPI (prounounced like pizza, the syllables interchanged) is an API documentation and testing tool set, a very simplified version of Postman. [See zzAPI core](https://github.com/agrostar/zzapi/) to learn about the zzAPI file formats (`.zzb` and `.zzv` files) and philosophy.

This Visual Studio Code extension makes it easy to create, document and test API requests from within the IDE. Request bundles are YAML files with the `.zzb` extension.

## Features

* Provides Code Lenses above requests when a `.zzb` file is opened. These are mini-buttons that run a request or all requests in a bundle.
* Provides the ability to choose environments (sets of variables) to use when running requests.
* In conjunction with [RedHat YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) provides schema validation for the .`zzb` file extension.
* Request responses are shown in an editor window. Other output such as status and test results are shown in the ouptput window.

## Basic Usage

1. Install the Redhat YAML extension: this is not strictly needed, but you will formatting and schema validation for the files is really helpful and useful
1. Install the extension from the VS Code market place
2. Start creating a request bundle according to the schema specification in [zzAPI core](https://github.com/agrostar/zzapi/). Here is a very simple example:

```
    requests:
      simple-get:
        method: GET
        url: https://postman-echo.com/get
        params:
          - { name: foo1, value: bar1 }
```

4. Save the The file with a `.zzb` file extension to activate the extension.
4. Alternatively import a Postman collection:
   * Export the Postman collection as a JSON (v2.0.1) schema
   * Use the command pallete in VS Code (Cmd-Shift-P or Ctrl-Shift-P)
   * Run the command `zzAPI: Import Postman collection`
   * In the File Open dialog, choose the Postman collection you exported in the first step
   * The command will open a new editor window and place the converted YAML
   * Save the file with a `.zzb` extension
   * Create variables manually (sorry, we don't have an import for that yet) if you use variables
5. You will see a Code Lense above each request, and one in the top of the file, for running all requests.
6. Clicking on these will execture the API requests and show the response in a new editor window.
7. This window is reused for other request runs
8. Use Save to save the editor window into a file as a sample response. Now the window will not be reused.

## Tips and Tricks

* Use the OUTLINE in the VS Code Explorer sidebar to show a list of requests within the `.zzb` file: Collapse the entire tree and open only the first level of the `requests` node. Now you can easily navigate to each request for editing/running.

* Instead of the raw body, the request body can be a YAML object. This is a great convenience compared to other API tools, that need you to create valid JSONs with quotes around every key and string. YAML is much easier to hand-create.

* Save the bundles along with your code and commit them to youre repo. This is how you share the bundles with your team.

* Create *secrets* or *personal* and *environment* specific (eg, staging, production) variables and mix and match them in inventive ways to share public variables at the same time not expose secrets and personal variable values.

