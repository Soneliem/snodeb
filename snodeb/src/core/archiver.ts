import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MultiBar } from "cli-progress";
import { glob } from "glob";
import { create } from "tar";
import { createMaintainerScript } from "../services/maintainer.js";
import type { ResolvedBuildConfig } from "../types.js";
import { templateDir } from "../types.js";
import { createArEntry, hasScript } from "../utils.js";

export class DebArchiver {
  private config: ResolvedBuildConfig;
  private sourceDir: string;
  private outputDir: string;
  private tempDir: string;
  private multibar: MultiBar;

  constructor(sourceDir: string, outputDir: string, config: ResolvedBuildConfig, multibar: MultiBar) {
    this.config = config;
    this.sourceDir = sourceDir;
    this.outputDir = outputDir;
    this.tempDir = path.join(this.outputDir, ".temp");
    this.multibar = multibar;
  }

  private async createConffilesFile() {
    const conffilesBar = this.multibar.create(2, 0, { filename: "Conffiles" });
    const installDir = path.join(this.tempDir, "install");
    const configFiles = [];

    // Expand glob patterns for config files
    const configPatternsBar = this.multibar.create(this.config.files.configInclude.length, 0, {
      filename: "Config Patterns",
    });
    for (const pattern of this.config.files.configInclude) {
      const matches = await glob(pattern, {
        cwd: this.sourceDir,
        dot: true,
        nodir: true,
        ignore: this.config.files.configExclude,
        posix: true,
      });

      const configFilesBar = this.multibar.create(matches.length, 0, { filename: "Config Files" });
      for (const file of matches) {
        const sourcePath = path.join(this.sourceDir, file);
        const targetPath = path.join(installDir, this.config.files.installPath, file);

        configFiles.push(path.posix.join(this.config.files.installPath, file));
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, await readFile(sourcePath));
        configFilesBar.increment(1, { status: `Processing ${file}` });
      }
      this.multibar.remove(configFilesBar);
      configPatternsBar.increment(1, { status: `Processed pattern ${pattern}` });
    }
    this.multibar.remove(configPatternsBar);
    conffilesBar.increment(1, { status: "Expanding glob patterns" });

    if (configFiles.length > 0) {
      // Create conffiles with newline-separated paths
      await writeFile(path.join(this.tempDir, "conffiles"), `${configFiles.join("\n")}\n`);
    }

    conffilesBar.increment(1, { status: "Writing conffiles" });
    conffilesBar.stop();
  }

  private async createControlFile(): Promise<void> {
    const controlFileBar = this.multibar.create(3, 0, { filename: "Control File" });
    controlFileBar.increment(1, { status: "Creating control file..." });
    const control = [
      `Package: ${this.config.name}`,
      `Version: ${this.config.version}`,
      `Architecture: ${this.config.architecture}`,
      `Maintainer: ${this.config.maintainer}`,
      `Description: ${this.config.description}`,
    ];

    if (this.config.depends.length) {
      control.push(`Depends: ${this.config.depends.join(", ")}`);
    }

    controlFileBar.increment(1, { status: "Writing control file" });
    await writeFile(path.join(this.tempDir, "control"), `${control.join("\n")}\n\n`);

    controlFileBar.increment(1, { status: "Wrote control file" });
    controlFileBar.stop();
  }

  private async createDataArchive(): Promise<Buffer> {
    const dataArchiveBar = this.multibar.create(4, 0, { filename: "Data Archive" });
    dataArchiveBar.increment(1, { status: "Creating data archive..." });
    const dataPath = path.join(this.tempDir, "data.tar.gz");
    const installDir = path.join(this.tempDir, "install");

    // Create temporary installation directory structure
    await mkdir(path.join(installDir, this.config.files.installPath), {
      recursive: true,
    });

    // Expand glob patterns and copy files
    const dataPatternsBar = this.multibar.create(this.config.files.include.length, 0, { filename: "Data Patterns" });
    for (const pattern of this.config.files.include) {
      const matches = await glob(pattern, {
        cwd: this.sourceDir,
        dot: true,
        nodir: true,
        ignore: this.config.files.exclude,
        posix: true,
      });

      const dataFilesBar = this.multibar.create(matches.length, 0, { filename: "Data Files" });
      for (const file of matches) {
        const sourcePath = path.join(this.sourceDir, file);
        const targetPath = path.join(installDir, this.config.files.installPath, file);
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, await readFile(sourcePath));
        dataFilesBar.increment(1, { status: `Copying ${file}` });
      }
      this.multibar.remove(dataFilesBar);
      dataPatternsBar.increment(1, { status: `Processed pattern ${pattern}` });
    }
    this.multibar.remove(dataPatternsBar);
    dataArchiveBar.increment(1, { status: "Copying files" });

    // Add systemd service if enabled
    const systemdPath = path.join(installDir, "lib/systemd/system");
    await mkdir(systemdPath, { recursive: true });
    await writeFile(
      path.join(systemdPath, `${this.config.name}.service`),
      await readFile(path.join(this.tempDir, `${this.config.name}.service`)),
    );
    dataArchiveBar.increment(1, { status: "Adding systemd service" });

    // Create tar archive with proper directory structure
    await create(
      {
        gzip: true,
        file: dataPath,
        cwd: installDir,
        portable: true,
        follow: true,
      },
      ["."],
    );
    dataArchiveBar.increment(1, { status: "Created data archive" });
    dataArchiveBar.stop();

    return await readFile(dataPath);
  }

  private async createControlArchive(): Promise<Buffer> {
    const controlArchiveBar = this.multibar.create(2, 0, { filename: "Control Archive" });
    controlArchiveBar.increment(1, { status: "Creating control archive" });
    const controlPath = path.join(this.tempDir, "control.tar.gz");

    // Start with control file
    const files = ["control"];

    // Add maintainer scripts if they exist
    const scriptFiles = ["preinst", "postinst", "prerm", "postrm"];
    const scriptsBar = this.multibar.create(scriptFiles.length, 0, { filename: "Scripts Check" });
    for (const script of scriptFiles) {
      if (await hasScript(this.tempDir, script)) {
        files.push(script);
      }
      scriptsBar.increment(1, { status: `Checking ${script}` });
    }
    this.multibar.remove(scriptsBar);

    if (this.config.files.configInclude.length > 0) files.push("conffiles");

    await create(
      {
        gzip: true,
        file: controlPath,
        cwd: this.tempDir,
        portable: true,
      },
      files,
    );
    controlArchiveBar.increment(1, { status: "Created control archive" });
    controlArchiveBar.stop();

    return await readFile(controlPath);
  }

  private async createSystemdService(): Promise<void> {
    const systemdBar = this.multibar.create(7, 0, { filename: "Systemd Service" });
    systemdBar.increment(1, { status: "Creating systemd service" });
    const templatePath = path.join(templateDir, "systemd.service");
    let serviceTemplate = await readFile(templatePath, "utf-8");

    const serviceFileReplacements = {
      description: this.config.description,
      user: this.config.systemd.user,
      group: this.config.systemd.group,
      entryPoint: `${this.config.systemd.useNodeExecutor ? "/usr/bin/node " : ""}/${path.posix.join(this.config.files.installPath, this.config.systemd.entryPoint).replace(/^\//g, "")}`,
      workingDirectory: this.config.files.installPath,
      restart: this.config.systemd.restart,
      restartSec: this.config.systemd.restartSec.toString(),
    };

    for (const [key, value] of Object.entries(serviceFileReplacements)) {
      serviceTemplate = serviceTemplate.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    const servicePath = path.join(this.tempDir, `${this.config.name}.service`);

    systemdBar.increment(1, { status: "Writing systemd service file" });
    await writeFile(servicePath, serviceTemplate);

    systemdBar.increment(1, { status: "Creating preinst script" });

    // Create maintainer scripts
    const { customScripts } = this.config;

    // Common replacements for systemd-related scripts
    const systemdReplacements = {
      name: this.config.name,
      user: this.config.systemd.user,
      group: this.config.systemd.group,
      enableService: this.config.systemd.enableService.toString(),
      startService: this.config.systemd.startService.toString(),
    };

    // Create preinst script
    await createMaintainerScript(this.tempDir, this.sourceDir, "preinst", null, {}, customScripts?.preinst);

    systemdBar.increment(1, { status: "Creating postinst script" });

    // Create postinst script
    await createMaintainerScript(
      this.tempDir,
      this.sourceDir,
      "postinst",
      path.join(templateDir, "postinst.sh"),
      systemdReplacements,
      customScripts?.postinst,
    );

    systemdBar.increment(1, { status: "Creating prerm script" });
    // Create prerm script
    await createMaintainerScript(
      this.tempDir,
      this.sourceDir,
      "prerm",
      path.join(templateDir, "prerm.sh"),
      { name: this.config.name },
      customScripts?.prerm,
    );

    systemdBar.increment(1, { status: "Creating postrm script" });

    // Create postrm script
    await createMaintainerScript(this.tempDir, this.sourceDir, "postrm", null, {}, customScripts?.postrm);

    systemdBar.increment(1, { status: "Created Systemd service files" });
    systemdBar.stop();
  }

  private async createDebianBinaryFile(): Promise<Buffer> {
    const debianBinaryBar = this.multibar.create(2, 0, { filename: "Debian-binary" });
    debianBinaryBar.increment(1, { status: "Writing debian-binary file" });
    const debianBinaryPath = path.join(this.tempDir, "debian-binary");
    await writeFile(debianBinaryPath, "2.0\n");
    debianBinaryBar.increment(1, { status: "Wrote debian-binary file" });
    debianBinaryBar.stop();
    return readFile(debianBinaryPath);
  }

  public async build(): Promise<string> {
    const prepFilesBar = this.multibar.create(3, 0, { filename: "File Preparation" });
    this.multibar.log("Preparing files...");
    await rm(this.outputDir, { recursive: true, force: true });
    prepFilesBar.increment(1, { status: "Cleaning output directory" });
    await mkdir(this.tempDir, { recursive: true });
    prepFilesBar.increment(1, { status: "Creating temp directory" });
    await mkdir(this.outputDir, { recursive: true });
    prepFilesBar.increment(1, { status: "Creating output directory" });
    prepFilesBar.stop();

    // Create control file and systemd service if enabled
    await this.createControlFile();
    await this.createConffilesFile();
    await this.createSystemdService();

    // Create archives
    const [debianBinary, control, data] = await Promise.all([
      this.createDebianBinaryFile(),
      this.createControlArchive(),
      this.createDataArchive(),
    ]);

    // Create final .deb file
    const arFileBar = this.multibar.create(1, 0, { filename: "Debian File" });
    arFileBar.increment(1, { status: "Writing .deb package" });
    const outputFile = path.join(
      this.outputDir,
      `${this.config.name}_${this.config.version}_${this.config.architecture}.deb`,
    );

    // Create ar archive
    const arBuffer = Buffer.concat([
      Buffer.from("!<arch>\n"),
      createArEntry("debian-binary", debianBinary),
      createArEntry("control.tar.gz", control),
      createArEntry("data.tar.gz", data),
    ]);

    await writeFile(outputFile, arBuffer);
    arFileBar.increment(1, { status: "Wrote .deb package" });
    arFileBar.stop();

    return outputFile;
  }
}
