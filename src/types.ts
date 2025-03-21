import type { PackageJson } from "type-fest";

export interface BuildConfig {
  name: string;
  version: string;
  description: string;
  maintainer: string;
  architecture: string;
  depends: string[];
  systemd: {
    enable: boolean;
    user: string;
    group: string;
    entryPoint: string;
    restart: "always" | "on-failure" | "no";
    enableService: boolean;
    startService: boolean;
  };
  files: {
    include: string[];
    exclude: string[];
    installPath: string;
  };
}

export type PackageJsonCustom = PackageJson & {
  debConfig: BuildConfig;
};

export interface BuildOptions {
  sourceDir: string;
  outputDir: string;
  config: BuildConfig;
}
