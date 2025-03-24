import { readFile } from "node:fs/promises";
import path from "node:path";

export async function hasScript(tempDir: string, scriptName: string): Promise<boolean> {
  try {
    await readFile(path.join(tempDir, scriptName));
    return true;
  } catch {
    return false;
  }
}

export async function readCustomScript(sourceDir: string, scriptPath: string | undefined): Promise<string> {
  if (!scriptPath) return "";
  try {
    const absolutePath = path.isAbsolute(scriptPath) ? scriptPath : path.join(sourceDir, scriptPath);
    return await readFile(absolutePath, "utf-8");
  } catch (error) {
    console.warn(`Warning: Could not read custom script at ${scriptPath}: ${error}`);
    return "";
  }
}

export function createArEntry(name: string, content: Buffer): Buffer {
  const header = Buffer.alloc(60);
  const timestamp = Math.floor(Date.now() / 1000);

  header.write(name.padEnd(16, " ")); // File name
  header.write(timestamp.toString().padEnd(12, " "), 16); // Timestamp
  header.write("0".padEnd(6, " "), 28); // Owner ID
  header.write("0".padEnd(6, " "), 34); // Group ID
  header.write("100644".padEnd(8, " "), 40); // File mode
  header.write(content.length.toString().padEnd(10, " "), 48); // File size
  header.write("`\n", 58, "ascii"); // End of header marker (grave accent + newline) in ASCII

  return Buffer.concat([header, content, content.length % 2 ? Buffer.from("\n") : Buffer.alloc(0)]);
}
