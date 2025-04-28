import path from "node:path";

export const templateDir = path.join(__dirname, "../public/templates");

export interface BuildConfig {
  name?: string;
  version?: string;
  description?: string;
  maintainer?: string;
  architecture?: string;
  depends?: string[];
  extends?: string;
  systemd?: {
    user?: string;
    group?: string;
    entryPoint?: string;
    restart?: "always" | "on-failure" | "no";
    restartSec?: number;
    enableService?: boolean;
    startService?: boolean;
    useNodeExecutor?: boolean;
  };
  files?: {
    include?: string[];
    exclude?: string[];
    installPath?: string;
    configInclude?: string[];
    configExclude?: string[];
  };
  customScripts?: {
    preinst?: string;
    postinst?: string;
    prerm?: string;
    postrm?: string;
    executeInOrder?: boolean;
  };
}

export interface BuildOptions {
  sourceDir: string;
  outputDir: string;
  config: BuildConfig;
}

/**
 * Helper function for defining snodeb configuration with type safety.
 * @param config - The snodeb configuration object.
 * @returns The configuration object.
 */
export function defineSnodebConfig(config: Partial<BuildConfig>): Partial<BuildConfig> {
  return config;
}
