---
sidebar_position: 1
---

# Configuration

snodeb configuration is done through the `debConfig` section in your project's `package.json`. Only the `name` and `version` fields are required as all options have sensible defaults.

## All Configuration Options

Here's a complete example of all available configuration options with explanations:

```json
{
  // Required fields at root level
  "name": "your-app",        // Package name
  "version": "1.0.0",        // Package version

  // Main snodeb configuration section
  "debConfig": {
    // Package metadata
    "maintainer": "Your Name <email@example.com>",  // Default: "Unknown"
    "architecture": "all",                          // Default: "all"
    "depends": ["nodejs", "mosquitto"],             // Default: ["nodejs"]

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
      "configIncludeFiles": [                       // Default: []
        "config/*.json"                             // Supports glob patterns
      ],
      // Files to exclude from configuration files (conffiles)
      "configExcludeFiles": [                       // Default: []
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
      "startService": true                          // Start service after install (Default: true)
    }
  }
}
```

## Configuration Files (conffiles)

Debian packages can mark certain files as configuration files. These files receive special treatment during package upgrades:

- If a configuration file has been modified by the system administrator, the package manager will ask what to do during an upgrade
- This prevents package updates from overwriting local configuration changes

To mark files as configuration files, use the `configIncludeFiles` array:

```json
{
  "configIncludeFiles": [
    "config/*.json",     // All JSON files in config directory
    "config/*.yaml",     // All YAML files in config directory
    ".env"              // Specific file
  ]
}
```

The `configIncludeFiles` and `configExcludeFiles` arrays supports glob patterns and follows the same pattern matching rules as `include` and `exclude`. All paths are relative to your project directory and will be automatically adjusted to their final installation paths in the package.

## File Patterns

snodeb uses glob patterns for file inclusion and exclusion. Here are some examples:

```json
{
  "files": {
    "include": [
      "dist/**/*.js",    // All JavaScript files in dist
      "config/**/*",     // All files in config directory
      ".env"             // Specific file
    ],
    "exclude": [
      "**/*.test.js"     // Exclude all test files
    ]
  }
}
```
