---
sidebar_position: 1
---

# Configuration

snodeb uses [c12](https://github.com/unjs/c12) for configuration loading. This means configuration can be defined in multiple ways:

- A `snodeb` property in `package.json`
- A `snodeb.config.js`, `snodeb.config.mjs`, `snodeb.config.cjs`, `snodeb.config.ts`, `snodeb.config.mts`, `snodeb.config.cts`, or `snodeb.config.json` file
- A `.snodebrc`, `.snodebrc.json`, `.snodebrc.yaml`, or `.snodebrc.yml` file

Only the `name` and `version` fields are required from your `package.json`, as all options have sensible defaults. These are typically inferred from your `package.json` or use sensible defaults.

## Configuration Merging and Inheritance

snodeb leverages `c12` for loading configuration, which merges settings from various sources (like `package.json` and `snodeb.config.ts`).

**Array Merging:** By default, tools like `c12` often concatenate arrays when merging configurations. However, **snodeb overrides this behavior**. When you define an array (like `depends` or `files.include`) in your configuration, it will **completely replace** the default array, not add to it. This provides a more predictable way to manage lists of dependencies or files.

**Inheritance with `extends`:** `c12` also supports inheriting configuration from other files using the `extends` property. This is useful for sharing common configurations across multiple projects or environments.

```typescript
// snodeb.config.ts
import { defineSnodebConfig } from 'snodeb';

export default defineSnodebConfig({
  extends: '../../base.snodeb.config', // Path relative to the current config file
  // Override or add specific settings for this project
  maintainer: 'Specific Project Maintainer <specific@example.com>',
});
```

## All Configuration Options

Here is a reference of all available configuration options in JSON format. Note that `name` and `version` are typically read directly from your `package.json` root level and don't need to be specified within the `snodeb` configuration itself unless you need to override them for the package build.

```json
{
  // Package metadata (defaults often inferred from package.json)
  "name": "your-app",        // Default: package.json "name"
  "version": "1.0.0",        // Default: package.json "version"
  "maintainer": "Your Name <email@example.com>",  // Default: "Unknown"
  "architecture": "all",                          // Default: "all"
  "depends": ["nodejs", "mosquitto"],             // Default: ["nodejs"]

  // Build optimization options
  "prune": false,                                 // Default: false - Run npm prune --omit=dev before packaging
  "unPrune": true,                                // Default: true - Run npm ci after packaging to restore dependencies

  // File management configuration
  "files": {
    // Files to include in the package
    "include": [                                  // Default: [package.json "main" or "index.js"]
      "dist/index.js",                            // Supports glob patterns
      ".env",
      "config/**/*"
    ],
    // Files to exclude from the package
    "exclude": ["**/*.test.js"],                  // Default: []
    // Where to install the files on the target system
    "installPath": "/opt/your-app",               // Default: "/usr/share/${name}"
    // Files to mark as configuration files (conffiles)
    "configInclude": [                       // Default: []
      "config/*.json"                             // Supports glob patterns
    ],
    // Files to exclude from configuration files (conffiles)
    "configExclude": [                       // Default: []
      "config/*.json"                             // Supports glob patterns
    ]
  },

  // Systemd service configuration
  "systemd": {
    "enable": true,                               // Enable service generation (Default: true)
    "user": "nodeapp",                            // Service user (Default: "root")
    "group": "nodeapp",                           // Service group (Default: "root")
    "entryPoint": "dist/index.js",                // Main entry point (Default: package.json "main" or "index.js")
    "restart": "always",                          // Restart policy (Default: "always")
    "restartSec": 10,                             // Restart delay in seconds (Default: 10)
    "enableService": true,                        // Enable service after install (Default: true)
    "startService": true,                         // Start service after install (Default: true)
    "useNodeExecutor": true                       // Use node to execute entry point (Default: true)
  },
  // Custom maintainer scripts configuration
  "customScripts": {
    "preinst": "debian/preinst.sh",              // Custom pre-installation script
    "postinst": "debian/postinst.sh",            // Custom post-installation script
    "prerm": "debian/prerm.sh",                  // Custom pre-removal script
    "postrm": "debian/postrm.sh"                 // Custom post-removal script
  }
}
```

### Example: `package.json`

You can place the configuration directly within your `package.json` under the `snodeb` key:

```json
{
  "name": "your-app",
  "version": "1.0.0",
  "description": "My awesome Node.js application",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "snodeb": "snodeb"
  },
  "snodeb": {
    "maintainer": "Your Name <email@example.com>",
    "depends": ["nodejs >= 18"],
    "files": {
      "include": ["dist/**/*", ".env"],
      "exclude": ["**/*.map"],
      "installPath": "/opt/my-app"
    },
    "systemd": {
      "user": "appuser",
      "group": "appgroup"
    }
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### Example: `snodeb.config.ts`

Alternatively, create a dedicated configuration file like `snodeb.config.ts`:

```typescript
// snodeb.config.ts
import { defineSnodebConfig } from 'snodeb';

const config = defineSnodebConfig({
  maintainer: "Your Name <email@example.com>",
  depends: ["nodejs >= 18"],
  files: {
    include: ["dist/**/*", ".env"],
    exclude: ["**/*.map"],
    installPath: "/opt/my-app"
  },
  systemd: {
    user: "appuser",
    group: "appgroup"
  }
});

export default config;
```

Remember that `name` and `version` will still be primarily read from your `package.json`.

## Custom Maintainer Scripts

See [custom scripts](./configuration/custom-scripts)

## Configuration Files (conffiles)

Debian packages can mark certain files as configuration files. These files receive special treatment during package upgrades:

- If a configuration file has been modified by the system administrator, the package manager will ask what to do during an upgrade
- This prevents package updates from overwriting local configuration changes

To mark files as configuration files, use the `configInclude` array within the `files` section of your configuration:

```typescript
// snodeb.config.ts
import type { BuildConfig } from 'snodeb';

const config: Partial<BuildConfig> = {
  // ... other options
  files: {
    // ... other file options
    configInclude: [
      "config/*.json",     // All JSON files in config directory
      "config/*.yaml",     // All YAML files in config directory
      ".env"              // Specific file
    ]
  }
  // ... other options
};

export default config;
```

The `configInclude` and `configExclude` arrays supports glob patterns and follows the same pattern matching rules as `include` and `exclude`. All paths are relative to your project directory and will be automatically adjusted to their final installation paths in the package.

## Build Optimization

snodeb provides options to optimize the build process by managing dependencies during package creation:

### Dependency Purging

The `prune` and `unPrune` options work together to reduce package size by temporarily removing development dependencies:

```typescript
// snodeb.config.ts
import { defineSnodebConfig } from 'snodeb';

export default defineSnodebConfig({
  prune: true,     // Remove dev dependencies before packaging
  unPrune: true,   // Restore dependencies after packaging
  // ... other options
});
```

**How it works:**

1. **`prune: true`** - Before creating the package, snodeb runs `npm prune --omit=dev` to remove all development dependencies from `node_modules`. This significantly reduces the package size since dev dependencies are not needed in production.

2. **`unPrune: true`** - After the package is created, snodeb runs `npm ci` to restore the complete dependency tree including development dependencies. This ensures your local development environment remains intact. NOTE: `prune` will also need to be enabled.

## File Patterns

snodeb uses glob patterns for file inclusion and exclusion within the `files` section. Here are some examples:

```typescript
// snodeb.config.ts
import type { BuildConfig } from 'snodeb';

const config: Partial<BuildConfig> = {
  // ... other options
  files: {
    include: [
      "dist/**/*.js",    // All JavaScript files in dist
      "config/**/*",     // All files in config directory
      ".env"             // Specific file
    ],
    exclude: [
      "**/*.test.js"     // Exclude all test files
    ]
    // ... other file options
  }
  // ... other options
};

export default config;
```
