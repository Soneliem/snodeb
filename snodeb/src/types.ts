import type { PackageJson } from "type-fest";

export interface BuildConfig {
  name: string;
  version: string;
  description: string;
  maintainer: string;
  architecture: string;
  depends: string[];
  systemd: {
    user: string;
    group: string;
    entryPoint: string;
    restart: "always" | "on-failure" | "no";
    restartSec: number;
    enableService: boolean;
    startService: boolean;
    useNodeExecutor: boolean;
  };
  files: {
    include: string[];
    exclude: string[];
    installPath: string;
    configInclude: string[];
    configExclude: string[];
  };
  customScripts?: {
    preinst?: string;
    postinst?: string;
    prerm?: string;
    postrm?: string;
    executeInOrder?: boolean;
  };
}

export type PackageJsonCustom = PackageJson & {
  snodeb: BuildConfig;
};

export interface BuildOptions {
  sourceDir: string;
  outputDir: string;
  config: BuildConfig;
}
