#!/usr/bin/env node

import path from "node:path";
import { DebArchiver } from "./core/archiver.js";
import type { BuildConfig } from "./types.js";
import { loadConfig } from "c12";
import { readPackageJSON } from "pkg-types";
import { createDefu } from "defu";

async function main() {
  try {
    console.log("Starting DEB package creation...");

    console.log("Reading package.json for defaults");
    const packageJson = await readPackageJSON();

    const defaultConfig: Partial<BuildConfig> = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description || "",
      maintainer: "Unknown",
      architecture: "all",
      depends: ["nodejs"],
      files: {
        include: packageJson.main ? [packageJson.main] : ["index.js"],
        exclude: [],
        configInclude: [],
        configExclude: [],
        installPath: `/usr/share/${packageJson.name}`,
      },
      systemd: {
        user: "root",
        group: "root",
        entryPoint: packageJson.main || "index.js",
        restart: "always",
        restartSec: 10,
        enableService: true,
        startService: true,
        useNodeExecutor: true,
      },
    };

    // Create a custom merger using defu that overrides arrays
    const customDefu = createDefu((obj, key, value) => {
      if (Array.isArray(obj[key]) && Array.isArray(value)) {
        (obj as any)[key] = value;
        return true;
      }
    });

    const { config, configFile } = await loadConfig({
      name: "snodeb",
      packageJson: true,
      defaults: defaultConfig,
      // Wrap the customDefu to handle multiple sources as expected by c12, filtering out null/undefined
      merger: (...sources) =>
        sources
          .filter((s): s is Partial<BuildConfig> => s != null)
          .reduce((acc, source) => customDefu(acc, source), {} as Partial<BuildConfig>),
    });

    console.log("Read config from:", configFile);

    // Validate required fields
    if (!config.name || !config.version) {
      throw new Error("Config must contain name and version fields");
    }

    const sourceDir = process.cwd();
    const outputDir = path.join(sourceDir, "deb");

    const archiver = new DebArchiver({
      sourceDir,
      outputDir,
      config: config as BuildConfig,
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
