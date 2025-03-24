import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readCustomScript } from "../utils.js";

export async function createMaintainerScript(
  tempDir: string,
  sourceDir: string,
  scriptName: string,
  templatePath: string | null,
  replacements: Record<string, string> = {},
  customScriptPath?: string,
): Promise<void> {
  let scriptContent = "";

  if (templatePath) {
    scriptContent = await readFile(templatePath, "utf-8");
    for (const [key, value] of Object.entries(replacements)) {
      scriptContent = scriptContent.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
  }

  if (customScriptPath) {
    const customScript = await readCustomScript(sourceDir, customScriptPath);

    if (customScript) {
      if (!scriptContent) {
        // For scripts without template (preinst, postrm)
        scriptContent = `#!/bin/sh\nset -e\n\n# Custom ${scriptName} script\n${customScript}\n\nexit 0\n`;
      } else {
        // For scripts with template (postinst, prerm), insert before exit 0
        const exitMatch = scriptContent.match(/\nexit 0\n/);
        if (exitMatch) {
          const insertPos = exitMatch.index;
          scriptContent = `${scriptContent.slice(0, insertPos)}\n# Custom ${scriptName} script\n${customScript}\n${scriptContent.slice(insertPos)}`;
        } else {
          scriptContent += `\n# Custom ${scriptName} script\n${customScript}\n\nexit 0\n`;
        }
      }
    }
  }

  if (scriptContent) {
    const scriptPath = path.join(tempDir, scriptName);
    await writeFile(scriptPath, scriptContent, { mode: 0o755 });
  }
}
