# SNODEB

Sonel's Node Debian Builder

A pure JavaScript/TypeScript tool for creating Debian packages (.deb) from Node.js applications.

## Features

- Pure JavaScript implementation (no system dependencies)
- Configurable file inclusion/exclusion
- Systemd service generation

## Installation

```bash
npm install -D snodeb
```

## Usage

1. Configure your Node.js application's package.json:

```json
{
  "name": "your-app",
  "version": "1.0.0",
  "description": "Your application",
  "main": "dist/index.js",
  "debConfig": { 
    "maintainer": "Your Name <email@example.com>",
    "architecture": "all",
    "depends": ["nodejs", "mosquitto"],
    "files": {
      "include": ["dist/index.js", ".env", "config/**/*"],
      "exclude": ["**/*.test.js"],
      "installPath": "/opt/your-app"
    },
    "systemd": {
      "enable": true,
      "user": "nodeapp",
      "restart": "always"
    }
  }
}
```

2. Run the packaging tool:

```bash
snodeb
```

The tool will create a .deb package in the `deb` directory.

## Configuration

The following are all configuration options available

| Option                            | Required | Type     | Description                       | Default                                      |
| --------------------------------- | -------- | -------- | --------------------------------- | -------------------------------------------- |
| `name`                            | Yes      | string   | Package Name                      |                                              |
| `version`                         | Yes      | string   | Package Version                   |                                              |
| `debConfig.maintainer`            | No       | string   | Package maintainer                | "Unknown"                                    |
| `debConfig.architecture`          | No       | string   | Target architecture               | "all"                                        |
| `debConfig.depends`               | No       | string[] | Package dependencies              | ["nodejs"]                                   |
| `debConfig.files.include`         | No       | string[] | Files to include                  | [value of package.json "main" or "index.js"] |
| `debConfig.files.exclude`         | No       | string[] | Files to exclude                  | []                                           |
| `debConfig.files.installPath`     | No       | string   | Installation directory            | "/usr/share/${name}"                         |
| `debConfig.systemd.enable`        | No       | boolean  | Enable systemd service generation | true                                         |
| `debConfig.systemd.user`          | No       | string   | Service user                      | "root"                                       |
| `debConfig.systemd.group`         | No       | string   | Service group                     | "root"                                       |
| `debConfig.systemd.mainEntry`     | No       | string   | Main Entry Point                  | value of package.json "main" or "index.js"   |
| `debConfig.systemd.restart`       | No       | string   | Restart policy                    | "always"                                     |
| `debConfig.systemd.enableService` | No       | boolean  | Enable service after install      | true                                         |
| `debConfig.systemd.startService`  | No       | boolean  | Start service after install       | true                                         |

### File Patterns

- Supports glob patterns for include/exclude
- Examples:
  - `"dist/**/*.js"`: All JavaScript files in dist
  - `"config/**/*"`: All files in config directory
  - `"**/*.test.js"`: Exclude all test files

### Systemd Service

When systemd integration is enabled (default: true), a systemd service file is created with the following configuration:

- Service user (default: root)
- Service group (default: root)
- Working directory set to installPath
- Main entry point (default: package.json main or index.js)
- Restart policy (default: always)
  - Supported values: "always", "on-failure", "no"

The service is configured to automatically run your Node.js application with appropriate permissions and restart behavior. After package installation:

- enableService (default: true): Controls whether the systemd service is automatically enabled
- startService (default: true): Controls whether the systemd service is automatically started

### Package Updates

When updating an existing installation:

1. The current service state (enabled/active) is preserved
2. The service is automatically stopped during the update if it was running
3. After the update:
   - The service remains enabled if it was previously enabled or if enableService=true
   - The service is restarted if it was previously running or if startService=true

This ensures safe updates while respecting both the package configuration and the system's current service state.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
