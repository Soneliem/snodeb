import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { create } from "tar";
import { glob } from "glob";
import type { BuildConfig, BuildOptions } from "./types.js";

// Get the directory path for the templates
const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "templates");

export class DebArchiver {
  private config: BuildConfig;
  private sourceDir: string;
  private outputDir: string;
  private tempDir: string;

  constructor(options: BuildOptions) {
    this.config = options.config;
    this.sourceDir = options.sourceDir;
    this.outputDir = options.outputDir;
    this.tempDir = path.join(this.outputDir, ".temp");
  }

  private async createControlFile(): Promise<void> {
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

    await writeFile(path.join(this.tempDir, "control"), `${control.join("\n")}\n\n`);
  }

  private async createDataArchive(): Promise<Buffer> {
    const dataPath = path.join(this.tempDir, "data.tar.gz");
    const installDir = path.join(this.tempDir, "install");

    // Create temporary installation directory structure
    await mkdir(path.join(installDir, this.config.files.installPath), { recursive: true });

    // Expand glob patterns and copy files
    for (const pattern of this.config.files.include) {
      const matches = await glob(pattern, {
        cwd: this.sourceDir,
        dot: true,
        nodir: true,
        ignore: this.config.files.exclude,
      });

      for (const file of matches) {
        const sourcePath = path.join(this.sourceDir, file);
        const targetPath = path.join(installDir, this.config.files.installPath, file);
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, await readFile(sourcePath));
      }
    }

    // Add systemd service if enabled
    const systemdPath = path.join(installDir, "lib/systemd/system");
    await mkdir(systemdPath, { recursive: true });
    await writeFile(
      path.join(systemdPath, `${this.config.name}.service`),
      await readFile(path.join(this.tempDir, `${this.config.name}.service`)),
    );

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

    return await readFile(dataPath);
  }

  private async createControlArchive(): Promise<Buffer> {
    const controlPath = path.join(this.tempDir, "control.tar.gz");

    await create(
      {
        gzip: true,
        file: controlPath,
        cwd: this.tempDir,
        portable: true,
      },
      ["control", "postinst", "prerm"],
    );

    return await readFile(controlPath);
  }

  private async createSystemdService(): Promise<void> {
    console.log(`Creating systemd service for ${this.config.name}...`);
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
    await writeFile(servicePath, serviceTemplate);

    // Create postinst script for enabling and starting the service
    const postinstPath = path.join(this.tempDir, "postinst");
    const postinstTemplatePath = path.join(templateDir, "postinst.sh");
    let postinstTemplate = await readFile(postinstTemplatePath, "utf-8");

    const postInstReplacements = {
      name: this.config.name,
      user: this.config.systemd.user,
      group: this.config.systemd.group,
      enableService: this.config.systemd.enableService.toString(),
      startService: this.config.systemd.startService.toString(),
    };

    for (const [key, value] of Object.entries(postInstReplacements)) {
      postinstTemplate = postinstTemplate.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    await writeFile(postinstPath, postinstTemplate, { mode: 0o755 });

    // Create prerm script for cleanup before package removal
    const prermPath = path.join(this.tempDir, "prerm");
    const prermTemplatePath = path.join(templateDir, "prerm.sh");
    let prermTemplate = await readFile(prermTemplatePath, "utf-8");

    const prermReplacements = {
      name: this.config.name,
    };

    for (const [key, value] of Object.entries(prermReplacements)) {
      prermTemplate = prermTemplate.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    await writeFile(prermPath, prermTemplate, { mode: 0o755 });
  }

  public async build(): Promise<string> {
    console.log(`Starting build for ${this.config.name} v${this.config.version}...`);
    await rm(this.outputDir, { recursive: true, force: true });
    await mkdir(this.tempDir, { recursive: true });
    await mkdir(this.outputDir, { recursive: true });

    // Create debian-binary file
    console.log("Creating debian-binary file...");
    await writeFile(path.join(this.tempDir, "debian-binary"), "2.0\n");

    // Create control file and systemd service if enabled
    console.log("Creating control file...");
    await this.createControlFile();
    await this.createSystemdService();
    console.log("Creating data archives...");

    // Create archives
    const [debianBinary, control, data] = await Promise.all([
      readFile(path.join(this.tempDir, "debian-binary")),
      this.createControlArchive(),
      this.createDataArchive(),
    ]);

    // Create final .deb file
    const outputFile = path.join(this.outputDir, `${this.config.name}_${this.config.version}.deb`);
    console.log("Writing final .deb package");

    // Create ar archive
    const arBuffer = Buffer.concat([
      Buffer.from("!<arch>\n"),
      this.createArEntry("debian-binary", debianBinary),
      this.createArEntry("control.tar.gz", control),
      this.createArEntry("data.tar.gz", data),
    ]);

    await writeFile(outputFile, arBuffer);
    console.log("Build completed successfully!");
    return outputFile;
  }

  private createArEntry(name: string, content: Buffer): Buffer {
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
}
