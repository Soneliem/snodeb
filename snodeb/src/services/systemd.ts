import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { templateDir } from "../constants.js";
import { createMaintainerScript } from "./maintainer.js";
import type { BuildConfig } from "../types.js";

export async function createSystemdService(config: BuildConfig, tempDir: string, sourceDir: string): Promise<void> {
  console.log(`Creating systemd service for ${config.name}...`);
  const templatePath = path.join(templateDir, "systemd.service");
  let serviceTemplate = await readFile(templatePath, "utf-8");

  const serviceFileReplacements = {
    description: config.description,
    user: config.systemd.user,
    group: config.systemd.group,
    entryPoint: `${config.systemd.useNodeExecutor ? "/usr/bin/node " : ""}/${path.posix.join(config.files.installPath, config.systemd.entryPoint).replace(/^\//g, "")}`,
    workingDirectory: config.files.installPath,
    restart: config.systemd.restart,
    restartSec: config.systemd.restartSec.toString(),
  };

  for (const [key, value] of Object.entries(serviceFileReplacements)) {
    serviceTemplate = serviceTemplate.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  const servicePath = path.join(tempDir, `${config.name}.service`);
  await writeFile(servicePath, serviceTemplate);

  // Create maintainer scripts
  const { customScripts } = config;

  // Common replacements for systemd-related scripts
  const systemdReplacements = {
    name: config.name,
    user: config.systemd.user,
    group: config.systemd.group,
    enableService: config.systemd.enableService.toString(),
    startService: config.systemd.startService.toString(),
  };

  // Create preinst script
  await createMaintainerScript(tempDir, sourceDir, "preinst", null, {}, customScripts?.preinst);

  // Create postinst script
  await createMaintainerScript(
    tempDir,
    sourceDir,
    "postinst",
    path.join(templateDir, "postinst.sh"),
    systemdReplacements,
    customScripts?.postinst,
  );

  // Create prerm script
  await createMaintainerScript(
    tempDir,
    sourceDir,
    "prerm",
    path.join(templateDir, "prerm.sh"),
    { name: config.name },
    customScripts?.prerm,
  );

  // Create postrm script
  await createMaintainerScript(tempDir, sourceDir, "postrm", null, {}, customScripts?.postrm);
}
