import path from "node:path";

export const templateDir = path.join(__dirname, "../public/templates");

interface SystemD {
  user?: string;
  group?: string;
  entryPoint?: string;
  restart?: "always" | "on-failure" | "no";
  restartSec?: number;
  enableService?: boolean;
  startService?: boolean;
  useNodeExecutor?: boolean;
}

interface Files {
  include?: string[];
  exclude?: string[];
  installPath?: string;
  configInclude?: string[];
  configExclude?: string[];
  prune?: boolean;
  unPrune?: boolean;
}

interface CustomScripts {
  preinst?: string;
  postinst?: string;
  prerm?: string;
  postrm?: string;
  executeInOrder?: boolean;
}

export interface BuildConfig {
  name?: string;
  version?: string;
  description?: string;
  maintainer?: string;
  architecture?: string;
  depends?: string[];
  extends?: string;
  systemd?: SystemD;
  files?: Files;
  customScripts?: CustomScripts;
}

export type ResolvedBuildConfig = Required<Omit<BuildConfig, "systemd" | "files">> & {
  systemd: Required<SystemD>;
  files: Required<Files>;
};

/**
 * Helper function for defining snodeb configuration with type safety.
 * @param config - The snodeb configuration object.
 * @returns The configuration object.
 */
export function defineSnodebConfig(config: Partial<BuildConfig>): Partial<BuildConfig> {
  return config;
}
