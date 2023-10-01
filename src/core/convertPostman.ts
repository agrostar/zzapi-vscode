import * as fs from "fs";
import * as YAML from "yaml";

const re = /\{\{(\w+)\}\}/g;

function reformatVariables(text: string): string {
  return text.replace(re, "$($1)");
}

// Recursive function to replace variables in an object in-situ
function reformatVariablesInObject(object: any) {
  for (const key in object) {
    if (typeof object[key] == "string") {
      object[key] = reformatVariables(object[key]);
    } else if (typeof object[key] == "object") {
      reformatVariablesInObject(object[key]);
    }
    // else: boolean, null etc: these can't hold variable strings
  }
}

function addRequest(prefix: string, element: any, requests: any) {
  const request: any = {};
  const name = `${prefix}${element.name}`;
  requests[name] = request;
  const r = element.request;
  let contentTypeAdded = false;

  request.method = r.method;

  if (r.url) {
    const protocol = r.url.protocol || "";
    const host = (r.url.host || "").join(".");
    const path = (r.url.path || "").join("/");
    request.url = reformatVariables(`${protocol}://${host}/${path}`);
  }

  if (r.header) {
    request.headers = r.header.map((h: any) => {
      return {
        name: h.key,
        value: reformatVariables(h.value),
      };
    });
    const ct = request.headers.find((h: any) => h.name.toLowerCase() == "content-type");
    if (ct) {
      contentTypeAdded = true;
    }
  }

  if (r.url && r.url.query) {
    request.params = r.url.query.map((q: any) => {
      return {
        name: q.key,
        value: reformatVariables(q.value || ""),
      };
    });
  }

  if (r.body && r.body.mode == "raw") {
    if (r.body?.options?.raw?.language == "json") {
      request.body = JSON.parse(r.body.raw);
      reformatVariablesInObject(request.body);
      if (!contentTypeAdded) {
        if (!request.headers) request.headers = [];
        request.headers.push({ name: "Content-Type", value: "application/json" });
      }
    } else {
      request.body = reformatVariables(r.body.raw);
    }
  } else if (r.body) {
    request.body = `UNSUPPORTED body type ${r.body.mode}, could not convert.`;
  }
}

function addRequestsFromFolder(prefix: string, item: any, requests: any) {
  item.forEach((element: any) => {
    if (element.item) {
      const subPrefix = prefix ? `${prefix}${element.name}/` : `${element.name}/`;
      addRequestsFromFolder(subPrefix, element.item, requests);
    } else if (element.request) {
      addRequest(prefix, element, requests);
    }
  });
}

export default function convertPostman(filePath: string): string {
  const contents = fs.readFileSync(filePath, "utf-8");
  const collection = JSON.parse(contents);
  if (
    collection?.info?.schema !=
    "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  ) {
    throw Error("Not a Postman v2.1.0 collection. Cannot import");
  }

  const bundle = {
    requests: {},
  };

  addRequestsFromFolder("", collection.item, bundle.requests);

  // Do some convenient formatting: space before each request, and let headers
  // and params flow (rather than a block)
  const yamlDoc = new YAML.Document(bundle);
  YAML.visit(yamlDoc, {
    Pair(_, node: any) {
      if (node?.key?.value == "requests") {
        node.key.spaceBefore = true;
        node.value.items.forEach((i: any) => {
          i.key.spaceBefore = true;
        });
      }
      if (node?.key?.value == "headers" || node?.key?.value == "params") {
        node.value.items.forEach((i: any) => {
          i.flow = true;
        });
      }
    },
  });
  return YAML.stringify(yamlDoc);
}

export function convertEnvironment(filePath: string): string {
  const contents = fs.readFileSync(filePath, "utf-8");
  const environment = JSON.parse(contents);

  // checking that it is actually an environment, find a better way to do this
  const essentialKeys = ["name", "_postman_variable_scope", "values"] as const;
  essentialKeys.forEach((key) => {
    if (!environment.hasOwnProperty(key)) {
      throw Error(`Did you select an exported postman environment?`);
    }
  });

  const name = environment.name;

  const variables: { [envName: string]: { [varName: string]: any } } = {};
  variables[name] = {};

  const postmanVars: Array<{ [key: string]: any }> = environment.values;
  postmanVars.forEach((item) => {
    variables[name][item.key] = item.value;
  });

  let varset: string = "";
  varset +=
    "# The variable set corresponding to the environment is below.\n" +
    "# Save it as a .zzv file, or copy-paste it into an existing .zzv file,\n" +
    "# or paste it into your bundle under the top level 'variables' object.\n";
  if (environment._postman_variable_scope === "globals") {
    varset +=
      "# If these variables are intended to be global, add them to each varset\n";
  }
  varset += "\n" + YAML.stringify(variables);

  return varset;
}
