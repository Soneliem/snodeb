#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { DebArchiver } from "./archiver.js";
import type { PackageJsonCustom, BuildConfig } from "./types.js";

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

    if (!packageJson.debConfig) {
      throw new Error("package.json must contain a debConfig field");
    }

    const sourceDir = process.cwd();
    const outputDir = path.join(sourceDir, "deb");

    // Create build configuration
    const buildConfig: BuildConfig = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description || "",
      main: packageJson.main || "",
      maintainer: packageJson.debConfig.maintainer || "Unknown",
      architecture: packageJson.debConfig.architecture || "all",
      depends: packageJson.debConfig.depends || ["nodejs"],
      files: {
        include: packageJson.debConfig.files?.include || (packageJson.main ? [packageJson.main] : ["index.js"]),
        exclude: packageJson.debConfig.files?.exclude || [],
        installPath: packageJson.debConfig.files?.installPath || `/usr/lib/${packageJson.name}`,
      },
      systemd: {
        enable: packageJson.debConfig.systemd?.enable || true,
        user: packageJson.debConfig.systemd?.user || "root",
        restart: packageJson.debConfig.systemd?.restart || "always",
      },
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
