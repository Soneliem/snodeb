#!/usr/bin/env node

import path from "node:path";
import { loadConfig } from "c12";
import cliProgress from "cli-progress";
import { createDefu } from "defu";
import { readPackageJSON } from "pkg-types";
import { DebArchiver } from "./core/archiver.js";
import type { BuildConfig, ResolvedBuildConfig } from "./types.js";

async function main() {
  try {
    const multibar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format:
          " {bar} | {filename}: {status} | {value}/{total} | Duration: {duration_formatted} | ETA: {eta_formatted}",
      },
      cliProgress.Presets.shades_grey,
    );

    const configBar = multibar.create(3, 0, {
      filename: "Configuration",
      status: "Starting...",
    });

    const packageJson = await readPackageJSON();
    configBar.increment(1, { status: "Read package.json" });

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
        prune: false,
        unPrune: true,
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
        // biome-ignore lint/suspicious/noExplicitAny: custom merger
        (obj as any)[key] = value;
        return true;
      }
    });

    const { config } = await loadConfig({
      name: "snodeb",
      packageJson: true,
      defaults: defaultConfig,
      // Wrap the customDefu to handle multiple sources as expected by c12, filtering out null/undefined
      merger: (...sources) =>
        sources
          .filter((s): s is Partial<BuildConfig> => s != null)
          .reduce((acc, source) => customDefu(acc, source), {} as Partial<BuildConfig>),
    });
    configBar.increment(1, { status: "Loaded configuration" });

    // Validate required fields
    if (!config.name || !config.version) {
      throw new Error("Config must contain name and version fields");
    }
    configBar.increment(1, { status: "Validated configuration" });
    configBar.stop();

    const sourceDir = process.cwd();
    const outputDir = path.join(sourceDir, "deb");

    const archiver = new DebArchiver(sourceDir, outputDir, config as ResolvedBuildConfig, multibar);

    const outputFile = await archiver.build();

    multibar.stop();

    console.log(`Successfully created DEB package: ${outputFile}`);
    process.exit(0);
  } catch (error) {
    console.error("Error creating .deb package:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
