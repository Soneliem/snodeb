import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tar from "tar";
import type { BuildConfig } from "./types.js";

// Get the directory path for the templates
const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "templates");

interface BuildOptions {
  sourceDir: string;
  outputDir: string;
  config: BuildConfig;
}

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

    await writeFile(path.join(this.tempDir, "control"), `${control.join("\n")}\n`);
  }

  private async createDataArchive(): Promise<Buffer> {
    const dataPath = path.join(this.tempDir, "data.tar.gz");

    // Create tar archive with all matched files
    await tar.create(
      {
        gzip: true,
        file: dataPath,
        cwd: this.sourceDir,
        filter: (filePath) => {
          // Skip excluded files
          return !this.config.files.exclude.some((pattern) => {
            try {
              const regex = new RegExp(pattern.replace(/\*/g, ".*"));
              return regex.test(filePath);
            } catch {
              return filePath.includes(pattern);
            }
          });
        },
        portable: true,
        prefix: this.config.files.installPath,
      },
      this.config.files.include,
    );

    return await readFile(dataPath);
  }

  private async createControlArchive(): Promise<Buffer> {
    const controlPath = path.join(this.tempDir, "control.tar.gz");

    await tar.create(
      {
        gzip: true,
        file: controlPath,
        cwd: path.join(this.tempDir),
        prefix: ".",
      },
      ["control"],
    );

    return await readFile(controlPath);
  }

  private async createSystemdService(): Promise<void> {
    if (!this.config.systemd.enable) return;

    const templatePath = path.join(templateDir, "systemd.service");
    let serviceTemplate = await readFile(templatePath, "utf-8");

    const replacements = {
      description: this.config.description,
      user: this.config.systemd.user,
      main: path.join(this.config.files.installPath, this.config.main),
      workingDirectory: this.config.files.installPath,
      restart: this.config.systemd.restart,
      name: this.config.name,
    };

    for (const [key, value] of Object.entries(replacements)) {
      serviceTemplate = serviceTemplate.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    const servicePath = path.join(this.tempDir, `${this.config.name}.service`);
    await writeFile(servicePath, serviceTemplate);
  }

  public async build(): Promise<string> {
    await mkdir(this.tempDir, { recursive: true });
    await mkdir(this.outputDir, { recursive: true });

    // Create debian-binary file
    await writeFile(path.join(this.tempDir, "debian-binary"), "2.0\n");

    // Create control file and systemd service if enabled
    await this.createControlFile();
    await this.createSystemdService();

    // Create archives
    const [debianBinary, control, data] = await Promise.all([
      readFile(path.join(this.tempDir, "debian-binary")),
      this.createControlArchive(),
      this.createDataArchive(),
    ]);

    // Create final .deb file
    const outputFile = path.join(this.outputDir, `${this.config.name}_${this.config.version}.deb`);

    // Create ar archive
    const arBuffer = Buffer.concat([
      Buffer.from("!<arch>\n"),
      this.createArEntry("debian-binary", debianBinary),
      this.createArEntry("control.tar.gz", control),
      this.createArEntry("data.tar.gz", data),
    ]);

    await writeFile(outputFile, arBuffer);
    return outputFile;
  }

  private createArEntry(name: string, content: Buffer): Buffer {
    const header = Buffer.alloc(60);
    const timestamp = Math.floor(Date.now() / 1000);

    header.write(name.padEnd(16, " ")); // File name
    header.write(timestamp.toString(), 16); // Timestamp
    header.write("0     ", 28); // Owner ID
    header.write("0     ", 34); // Group ID
    header.write("100644  ", 40); // File mode
    header.write(content.length.toString(), 48); // File size
    header.write("`\n", 58); // End of header

    return Buffer.concat([header, content, content.length % 2 ? Buffer.from("\n") : Buffer.alloc(0)]);
  }
}
