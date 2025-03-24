import path from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory path for the templates, accounting for both development and production paths
const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const templateDir = path.join(currentDir, currentDir.endsWith("src") ? "../public/templates" : "./templates");
