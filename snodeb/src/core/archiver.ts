import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import { create } from "tar";
import type { BuildConfig, BuildOptions } from "../types.js";
import { createArEntry, hasScript } from "../utils.js";
import { createSystemdService } from "../services/systemd.js";

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

  private async createConffilesFile() {
    const installDir = path.join(this.tempDir, "install");
    const configFiles = [];

    // Expand glob patterns for config files
    for (const pattern of this.config.files.configInclude) {
      const matches = await glob(pattern, {
        cwd: this.sourceDir,
        dot: true,
        nodir: true,
        ignore: this.config.files.configExclude,
        posix: true,
      });

      for (const file of matches) {
        const sourcePath = path.join(this.sourceDir, file);
        const targetPath = path.join(installDir, this.config.files.installPath, file);

        configFiles.push(path.posix.join(this.config.files.installPath, file));
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, await readFile(sourcePath));
      }
    }

    if (configFiles.length > 0) {
      // Create conffiles with newline-separated paths
      await writeFile(path.join(this.tempDir, "conffiles"), `${configFiles.join("\n")}\n`);
    }
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
    await mkdir(path.join(installDir, this.config.files.installPath), {
      recursive: true,
    });

    // Expand glob patterns and copy files
    for (const pattern of this.config.files.include) {
      const matches = await glob(pattern, {
        cwd: this.sourceDir,
        dot: true,
        nodir: true,
        ignore: this.config.files.exclude,
        posix: true,
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

    // Start with control file
    const files = ["control"];

    // Add maintainer scripts if they exist
    const scriptFiles = ["preinst", "postinst", "prerm", "postrm"];
    for (const script of scriptFiles) {
      if (await hasScript(this.tempDir, script)) {
        files.push(script);
      }
    }

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

    return await readFile(controlPath);
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
    await this.createConffilesFile();
    await createSystemdService(this.config, this.tempDir, this.sourceDir);
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
      createArEntry("debian-binary", debianBinary),
      createArEntry("control.tar.gz", control),
      createArEntry("data.tar.gz", data),
    ]);

    await writeFile(outputFile, arBuffer);
    console.log("Build completed successfully!");
    return outputFile;
  }
}
