import { exec as execCallback } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { MultiBar } from "cli-progress";
import { glob } from "glob";
import { create } from "tar";
import { createSystemdService } from "../services/systemd.js";
import type { ResolvedBuildConfig } from "../types.js";
import { createArEntry, hasScript } from "../utils.js";

const exec = promisify(execCallback);

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
    const conffilesBar = this.multibar.create(this.config.files.configInclude.length + 1, 0, {
      filename: "Conffiles",
      status: "Starting...",
    });
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
      conffilesBar.increment(1, { status: `Processed pattern: ${pattern}` });
    }

    if (configFiles.length > 0) {
      await writeFile(path.join(this.tempDir, "conffiles"), `${configFiles.join("\n")}\n`);
    }

    conffilesBar.increment(1, { status: "Created conffiles" });
    conffilesBar.stop();
  }

  private async createControlFile(): Promise<void> {
    const controlFileBar = this.multibar.create(3, 0, {
      filename: "Control File",
      status: "Starting...",
    });
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

    controlFileBar.increment(1, { status: "Created control file" });
    controlFileBar.stop();
  }

  private async createDataArchive(): Promise<Buffer> {
    const dataArchiveBar = this.multibar.create(5, 0, {
      filename: "Data Archive",
      status: "Starting...",
    });
    dataArchiveBar.increment(1, { status: "Creating install directories" });
    const dataPath = path.join(this.tempDir, "data.tar.gz");
    const installDir = path.join(this.tempDir, "install");

    // Create temporary installation directory structure
    await mkdir(path.join(installDir, this.config.files.installPath), {
      recursive: true,
    });

    // Copy node_modules
    if (this.config.files.prune) {
      dataArchiveBar.setTotal(5);
      dataArchiveBar.increment(1, { status: "Running npm prune" });

      const { stderr } = await exec("npm prune --omit=dev");
      if (stderr) {
        console.error(stderr);
      }
    }

    // Expand glob patterns and copy files
    dataArchiveBar.increment(1, { status: "Copying files" });
    const dataPatternsBar = this.multibar.create(this.config.files.include.length, 0, {
      filename: "Data Patterns",
      status: "Starting...",
    });
    for (const pattern of this.config.files.include) {
      const matches = await glob(pattern, {
        cwd: this.sourceDir,
        dot: true,
        nodir: true,
        ignore: this.config.files.exclude,
        posix: true,
      });

      const dataFilesBar = this.multibar.create(matches.length, 0, {
        filename: "Data Files",
        status: "Starting...",
      });
      for (const file of matches) {
        dataFilesBar.increment(1, { status: `Copying ${file}` });
        const sourcePath = path.join(this.sourceDir, file);
        const targetPath = path.join(installDir, this.config.files.installPath, file);
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, await readFile(sourcePath));
      }
      this.multibar.remove(dataFilesBar);
      dataPatternsBar.increment(1, { status: `Processed pattern ${pattern}` });
    }
    this.multibar.remove(dataPatternsBar);

    // Add systemd service
    dataArchiveBar.increment(1, { status: "Adding systemd service" });
    const systemdPath = path.join(installDir, "lib/systemd/system");
    await mkdir(systemdPath, { recursive: true });
    await writeFile(
      path.join(systemdPath, `${this.config.name}.service`),
      await readFile(path.join(this.tempDir, `${this.config.name}.service`)),
    );

    dataArchiveBar.increment(1, { status: "Creating data archive tar" });

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

    // undo npm prune if requested
    if (this.config.files.prune && this.config.files.unPrune) {
      dataArchiveBar.setTotal(7);
      dataArchiveBar.increment(1, { status: "Running npm ci" });

      const { stderr } = await exec("npm ci");
      if (stderr) {
        console.error(stderr);
      }
    }

    dataArchiveBar.increment(1, { status: "Created data archive" });

    dataArchiveBar.stop();

    return await readFile(dataPath);
  }

  private async createControlArchive(): Promise<Buffer> {
    const controlArchiveBar = this.multibar.create(1, 0, {
      filename: "Control Archive",
      status: "Starting...",
    });
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
    controlArchiveBar.increment(1, { status: "Created control archive" });
    controlArchiveBar.stop();

    return await readFile(controlPath);
  }

  private async createDebianBinaryFile(): Promise<Buffer> {
    const debianBinaryBar = this.multibar.create(1, 0, {
      filename: "Debian-binary",
      status: "Starting...",
    });
    const debianBinaryPath = path.join(this.tempDir, "debian-binary");
    await writeFile(debianBinaryPath, "2.0\n");
    debianBinaryBar.increment(1, { status: "Created debian-binary file" });
    debianBinaryBar.stop();
    return readFile(debianBinaryPath);
  }

  public async build(): Promise<string> {
    const buildBar = this.multibar.create(6, 0, {
      filename: "Building Package",
      status: "Starting...",
    });

    // Prepare directories
    this.multibar.log("Preparing files...");
    await rm(this.outputDir, { recursive: true, force: true });
    await mkdir(this.tempDir, { recursive: true });
    await mkdir(this.outputDir, { recursive: true });
    buildBar.increment(1, { status: "Prepared directories" });

    // Create control file and systemd service
    await this.createControlFile();
    buildBar.increment(1, { status: "Created control files" });

    await this.createConffilesFile();
    buildBar.increment(1, { status: "Created config files" });

    await createSystemdService(this.config, this.multibar, this.tempDir, this.sourceDir);
    buildBar.increment(1, { status: "Created systemd service" });

    // Create archives
    const [debianBinary, control, data] = await Promise.all([
      this.createDebianBinaryFile(),
      this.createControlArchive(),
      this.createDataArchive(),
    ]);
    buildBar.increment(1, { status: "Created archives" });

    // Create final .deb file
    const outputFile = path.join(
      this.outputDir,
      `${this.config.name}_${this.config.version}_${this.config.architecture}.deb`,
    );

    const arBuffer = Buffer.concat([
      Buffer.from("!<arch>\n"),
      createArEntry("debian-binary", debianBinary),
      createArEntry("control.tar.gz", control),
      createArEntry("data.tar.gz", data),
    ]);

    await writeFile(outputFile, arBuffer);
    buildBar.increment(1, { status: "Created .deb package" });
    buildBar.stop();

    return outputFile;
  }
}
