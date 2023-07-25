import { getDirPath, getEnvDetails } from "./extension";
import * as fs from "fs";
import * as YAML from "yaml";

let variables: any = {};

/**
 * Stores the variables loaded from the files in the selected environment, if any
 */
export function loadVariables() {
    variables = {};

    const dirPath = getDirPath();
    const [currentEnvironment, allEnvironments] = getEnvDetails();

    const filesToLoad: Array<string> = allEnvironments[currentEnvironment];

    if (filesToLoad !== undefined) {
        const numFiles = filesToLoad.length;
        for (let i = 0; i < numFiles; i++) {
            let filePath = dirPath + filesToLoad[i];
            if (fs.existsSync(filePath)) {
                let fileData = fs.readFileSync(filePath, "utf-8");
                let parsedVariables = YAML.parse(fileData);

                for (const key in parsedVariables) {
                    if (parsedVariables.hasOwnProperty(key)) {
                        variables[key] = parsedVariables[key];
                        replaceVariablesInSelf();
                    }
                }
            }
        }
    }
}

const varRegexWithBraces = /(?<!\\)\$\(([_a-zA-Z]\w*)\)/g;
const varRegexWithoutBraces = /(?<!\\)\$(?:(?![0-9])[_a-zA-Z]\w*(?=\W|$))/g;

/**
 * @param objectData The object that may have variables that need to be replaced
 *
 * @returns the object after replacing the variables wherever required
 */
export function replaceVariablesInObject(
    objectData: object
): object | undefined {
    if (objectData === undefined) {
        return undefined;
    }
    return JSON.parse(replaceVariables(JSON.stringify(objectData)));
}

/**
 * Replaces variables in the variables object, with variables that are already
 *  stored in it. This is required because a value in one file may act as a variable
 *  in another.
 */
function replaceVariablesInSelf() {
    variables = JSON.parse(replaceVariables(JSON.stringify(variables)));
}

/**
 * @param arr The array that may have variables that need to be replaced
 *
 * @returns The array after replacing the variables wherever required
 */
export function replaceVariablesInArray(arr: Array<object>): Array<object> {
    let newArr: Array<object> = [];
    arr.forEach((element) => {
        newArr.push(JSON.parse(replaceVariables(JSON.stringify(element))));
    });

    return newArr;
}

/**
 * @param text Some string content that may or may not have variable names
 *
 * @returns The same text, after replacing the required variable names with
 *  their respective values from @var variables
 */
function replaceVariables(text: string): string {
    const outputTextWithBraces = text.replace(
        varRegexWithBraces,
        (match, variable) => {
            const varVal = variables[variable];
            if (varVal !== undefined) {
                return varVal;
            }
            return match;
        }
    );

    const outputTextWithoutBraces = outputTextWithBraces.replace(
        varRegexWithoutBraces,
        (match) => {
            const variable = match.slice(1);
            if (variable === undefined) {
                return match;
            }
            const varVal = variables[variable];
            if (varVal !== undefined) {
                return varVal;
            }
            return match;
        }
    );

    return outputTextWithoutBraces;
}
