#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { DebArchiver } from "./core/archiver.js";
import type { BuildConfig, PackageJsonCustom } from "./types.js";

async function main() {
  try {
    console.log("Starting DEB package creation...");
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    console.log("Reading package.json from:", packageJsonPath);
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8")) as PackageJsonCustom;

    // Validate required fields
    if (!packageJson.name || !packageJson.version) {
      throw new Error("package.json must contain name, version, and description fields");
    }

    if (!packageJson.snodeb) {
      throw new Error("package.json must contain a snodeb field");
    }

    const sourceDir = process.cwd();
    const outputDir = path.join(sourceDir, "deb");

    // Create build configuration and set defaults
    const buildConfig: BuildConfig = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description || "",
      maintainer: packageJson.snodeb.maintainer || "Unknown",
      architecture: packageJson.snodeb.architecture || "all",
      depends: packageJson.snodeb.depends || ["nodejs"],
      files: {
        include: packageJson.snodeb.files.include || (packageJson.main ? [packageJson.main] : ["index.js"]),
        exclude: packageJson.snodeb.files.exclude || [],
        configInclude: packageJson.snodeb.files.configInclude || [],
        configExclude: packageJson.snodeb.files.configExclude || [],
        installPath: packageJson.snodeb.files.installPath || `/usr/share/${packageJson.name}`,
      },
      systemd: {
        user: packageJson.snodeb.systemd.user || "root",
        group: packageJson.snodeb.systemd.group || "root",
        entryPoint: packageJson.snodeb.systemd.entryPoint || packageJson.main || "index.js",
        restart: packageJson.snodeb.systemd.restart || "always",
        restartSec: packageJson.snodeb.systemd.restartSec || 10,
        enableService: packageJson.snodeb.systemd.enableService ?? true,
        startService: packageJson.snodeb.systemd.startService ?? true,
        useNodeExecutor: packageJson.snodeb.systemd.useNodeExecutor ?? true,
      },
      customScripts: packageJson.snodeb?.customScripts,
    };

    const archiver = new DebArchiver({
      sourceDir,
      outputDir,
      config: buildConfig,
    });

    const outputFile = await archiver.build();
    console.log(`Successfully created DEB package: ${outputFile}`);
    process.exit(0);
  } catch (error) {
    console.error("Error creating DEB package:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
