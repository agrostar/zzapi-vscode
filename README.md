# zzAPI Visual Studio Code Extension

zzAPI (prounounced like pizza, the syllables interchanged) is an HTTP (REST) API documentation and testing tool, a very simplified version of Postman. [See zzAPI core](https://github.com/agrostar/zzapi/) to learn about the zzAPI file formats (`.zzb` and `.zzv` files) and philosophy.

This extension makes it easy to create, document and test API requests from within the IDE. Request bundles are YAML files with the `.zzb` extension.

![License](https://img.shields.io/github/license/agrostar/zzapi-vscode?style=for-the-badge&color=green)
![Installs](https://img.shields.io/visual-studio-marketplace/i/AgroStar.zzapi?style=for-the-badge&color=rebeccapurple)
![Version](https://img.shields.io/visual-studio-marketplace/v/AgroStar.zzapi?style=for-the-badge&color=red)
![Stars](https://img.shields.io/visual-studio-marketplace/stars/AgroStar.zzapi?style=for-the-badge&color=blue)

## Features

![screencast](https<video src="./images/screencast.mp4" controls title="zzapi-demo"></video>)

* Provides Code Lenses above requests when a `.zzb` file is opened. These are mini-buttons that execute a request or all requests in a bundle.
* Provides the ability to choose environments (sets of variables) to use when running requests.
* In conjunction with [RedHat YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) provides schema validation for the `.zzb` file extension.
* Request responses are shown in an editor window. Other response elements such as status, headers and test results are shown in the ouptput window.
* Tests can be run against the responses. The test specification is simple and needs no coding.

## Getting Started

1. Install the [RedHat YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) extension. This is not strictly needed, but the formatting and schema validation is really helpful and useful.
1. Install this extension
2. Start creating a request bundle. Here is a very simple example:

```
    requests:
      simple-get:
        method: GET
        url: https://postman-echo.com/get
        params:
          foo1: bar1
```

4. Save the The file with a `.zzb` file extension to activate the extension.
4. Alternatively import a Postman collection:
   * Export the Postman collection as a JSON (v2.0.1) schema
   * Use the command pallete in VS Code (Cmd-Shift-P or Ctrl-Shift-P) and choose `zzAPI: Import Postman collection`
   * In the File Open dialog, choose the Postman collection you exported in the first step
   * The command will open a new editor window and place the converted YAML. Save it to a file with a `.zzb` extension
   * If you have used variables in Postman, you can also import the environments in a similar manner: export them in Postman and import them in VS Code.
5. You will see a CodeLens above each named request for running the request. You will also see a CodeLens above the `requests` node, to run all the requests sequentially. Click on these to execute them and see the response.

## Detailed Usage

The extension works with `.zzb` files, which are YAML request bundles as [described here](https://github.com/agrostar/zzapi/blob/main/zzapi-bundle-description.md).

You can use variables within the bundle, and also common variable set files and environments as [described here](https://github.com/agrostar/zzapi/blob/main/zzapi-varset-description.md).

You can best learn about the `.zzb` file format by just browsing the bundle used for comprehensively testing zzAPI itself: [tests-bundle.zzb](https://github.com/agrostar/zzapi/blob/main/tests-bundle.zzb).

## Tips and Tricks

* Use OUTLINE in the VS Code Explorer sidebar to show a list of requests within the `.zzb` file: Collapse the entire tree and open only the first level of the `requests` node. Now you can easily navigate to each request for editing/running.

* Instead of the raw body, the request body can be a YAML/JSON object. This is a great convenience compared to other API tools, that need you to create valid JSONs with quotes around every key and string. YAML is much easier to hand-create.

* Save the bundles along with your code and commit them to your repo. This is how you share them with your team. Also keep the tests right next to the code.

* Multiple variable set files are merged. Keep one set as your *secrets* or *personal* set where you specify your passwords etc. needed for the requests. Do not commit this to your repo.

* Create multiple bundles (eg, some for documentation and some for tests) within the same directory and share the variable sets among them. Or, if you prefer, declare variable sets within the bundle itself for easy visibility.
