import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MultiBar } from "cli-progress";
import { createMaintainerScript } from "../services/maintainer.js";
import type { ResolvedBuildConfig } from "../types.js";
import { templateDir } from "../types.js";

export async function createSystemdService(
  config: ResolvedBuildConfig,
  multibar: MultiBar,
  tempDir: string,
  sourceDir: string,
): Promise<void> {
  const systemdBar = multibar.create(7, 0, { filename: "Systemd Service" });

  const templatePath = path.join(templateDir, "systemd.service");
  let serviceTemplate = await readFile(templatePath, "utf-8");

  systemdBar.increment(1, { status: "Creating systemd service" });

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

  systemdBar.increment(1, { status: "Writing systemd service file" });
  await writeFile(servicePath, serviceTemplate);

  systemdBar.increment(1, { status: "Creating preinst script" });

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

  systemdBar.increment(1, { status: "Creating postinst script" });

  // Create postinst script
  await createMaintainerScript(
    tempDir,
    sourceDir,
    "postinst",
    path.join(templateDir, "postinst.sh"),
    systemdReplacements,
    customScripts?.postinst,
  );

  systemdBar.increment(1, { status: "Creating prerm script" });
  // Create prerm script
  await createMaintainerScript(
    tempDir,
    sourceDir,
    "prerm",
    path.join(templateDir, "prerm.sh"),
    { name: config.name },
    customScripts?.prerm,
  );

  systemdBar.increment(1, { status: "Creating postrm script" });

  // Create postrm script
  await createMaintainerScript(tempDir, sourceDir, "postrm", null, {}, customScripts?.postrm);

  systemdBar.increment(1, { status: "Created Systemd service files" });
  systemdBar.stop();
}
