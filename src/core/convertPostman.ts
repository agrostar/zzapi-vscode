import * as fs from 'fs';
import * as YAML from 'yaml';

const re = /\{\{(\w+)\}\}/g;

function reformatVariables(text: string): string {
  return text.replace(re, "\$\($1\)");
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

  request.method = r.method;

  if (r.url) {
    request.url = reformatVariables([ ...r.url.host, ...r.url.path ].join('/'));
  }

  if (r.header) {
    request.headers = r.header.map((h: any) => {
      return {
        name: h.key,
        value: reformatVariables(h.value)
      }
    });
  }

  if (r.url && r.url.query) {
    request.params = r.url.query.map((q: any) => {
      return {
        name: q.key,
        value: reformatVariables(q.value)
      }
    });
  }

  if (r.body && r.body.mode == 'raw') {
    if (r.body?.options?.raw?.language == 'json') {
      request.body = JSON.parse(r.body.raw);
      reformatVariablesInObject(request.body);
    } else {
      request.body = reformatVariables(r.body.raw);
    }
  } else if (r.body) {
    request.body = `UNSUPPORTED body type ${r.body.mode}, could not convert.`
  }
}

function addRequestsFromFolder(prefix: string, item: any, requests: any) {
  item.forEach((element: any) => {
    if (element.item) {
      const subPrefix = prefix ? `${prefix}${element.name}/` : `${element.name}/`;
      addRequestsFromFolder(subPrefix, element.item, requests)
    } else if (element.request) {
      addRequest(prefix, element, requests);
    }
  });
}

export default function convertPostman(filePath: string): string {
  const contents = fs.readFileSync(filePath, "utf-8");
  const collection = JSON.parse(contents);
  if (collection?.info?.schema != "https://schema.getpostman.com/json/collection/v2.1.0/collection.json") {
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
        node.value.items.forEach((i:any) => {i.key.spaceBefore = true});
      }
      if (node?.key?.value == "headers" || node?.key?.value == "params") {
        node.value.items.forEach((i:any) => {i.flow = true});
      }
    }
  });
  return YAML.stringify(yamlDoc);
}