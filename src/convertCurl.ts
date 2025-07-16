import * as YAML from "yaml";

const REGEX = { dataBody: /(?:-d|--data|--data-raw)\s+(['"]?)([\s\S]*?)\1(?=\s+-|$)/ };

function determineMethod(curlCommand: string): string {
  const methodMatch = curlCommand.match(/(?:-X|--request)\s+['"]?(\w+(-\w+)?)['"]?/);
  if (methodMatch) {
    return methodMatch[1].toUpperCase(); // Explicit method
  }

  // Check for method override
  const overrideMatch = curlCommand.match(/X-HTTP-Method-Override:\s*(PATCH|DELETE)/i);
  if (overrideMatch) {
    return overrideMatch[1].toUpperCase();
  }

  // Check for POST conditions
  if (curlCommand.match(REGEX.dataBody)) {
    return "POST"; // Default to POST if request body exists
  }

  return "GET"; // Default to GET if nothing else matches
}

function extractUrlAndParams(curlCommand: string): {
  url: string;
  pathname: string;
  params: Record<string, string>;
} {
  const urlMatch = curlCommand.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/);

  if (!urlMatch) {
    throw new Error("Invalid URL.");
  }

  const { origin, pathname, searchParams } = new URL(urlMatch[1]);
  return {
    url: origin + pathname,
    pathname,
    params: Object.fromEntries(searchParams),
  };
}

function parseBody(curlCommand: string, contentType: string | null) {
  const dataMatch = curlCommand.match(REGEX.dataBody);
  const rawData = dataMatch?.[2];
  if (!rawData) return;

  if (contentType?.includes("application/json")) {
    try {
      return JSON.parse(rawData);
    } catch (error) {
      throw new Error("Invalid JSON format in request body.");
    }
  }

  return rawData;
}

function parseCurl(curlCommand: string): any {
  const method = determineMethod(curlCommand);
  const { url, pathname, params } = extractUrlAndParams(curlCommand);

  const headerMatches = [...curlCommand.matchAll(/(?:-H|--header)\s+['"]([^:]+):\s*([^'"]+)['"]/g)];
  const headers = headerMatches.reduce((acc: any, [_, key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

  const contentType = headers["Content-Type"] || headers["content-type"] || null;
  const data = parseBody(curlCommand, contentType) || {};

  return { method, url, pathname, headers, params, data };
}

export default function convertCurl(curlCommand: string): string {
  const { method, url, headers, params, data } = parseCurl(curlCommand);

  const request = {
    [url]: {
      url,
      method: method.toUpperCase(),
      headers: Object.keys(headers).length ? headers : undefined,
      params: Object.keys(params).length ? params : undefined,
      body: Object.keys(data).length ? data : undefined,
    },
  };

  const yamlString = YAML.stringify(request);
  const tabbedYamlString = yamlString.replace(/^/gm, "  "); // add two spaces at the start of each line

  return tabbedYamlString;
}
