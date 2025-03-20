# SNODEB

Sonel's Node Debian Builder

A pure JavaScript/TypeScript tool for creating Debian packages (.deb) from Node.js applications.

## Features

- Pure JavaScript implementation (no system dependencies)
- Configurable file inclusion/exclusion
- Systemd service generation

## Installation

```bash
npm install -d snodeb
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
debian
```

The tool will create a .deb package in the `deb` directory.

## Configuration

The following are all configuration options available

| Option                        | Required | Type     | Description            | Default                                      |
| ----------------------------- | -------- | -------- | ---------------------- | -------------------------------------------- |
| `name`                        | Yes      | string   | Package Name           |                                              |
| `version`                     | Yes      | string   | Package Version        |                                              |
| `debConfig.maintainer`        | No       | string   | Package maintainer     | "Unknown"                                    |
| `debConfig.architecture`      | No       | string   | Target architecture    | "all"                                        |
| `debConfig.depends`           | No       | string[] | Package dependencies   | ["nodejs"]                                   |
| `debConfig.files.include`     | No       | string[] | Files to include       | [value of package.json "main" or "index.js"] |
| `debConfig.files.exclude`     | No       | string[] | Files to exclude       | []                                           |
| `debConfig.files.installPath` | No       | string   | Installation directory | "/usr/lib/${name}"                           |
| `debConfig.systemd.enable`    | No       | boolean  | Enable systemd service | true                                         |
| `debConfig.systemd.user`      | No       | string   | Service user           | "root"                                       |
| `debConfig.systemd.restart`   | No       | string   | Restart policy         | "always"                                     |

### File Patterns

- Supports glob patterns for include/exclude
- Examples:
  - `"dist/**/*.js"`: All JavaScript files in dist
  - `"config/**/*"`: All files in config directory
  - `"**/*.test.js"`: Exclude all test files

### Systemd Service

When systemd integration is enabled:

- Creates a service file
- Uses the specified user
- Configures working directory to installPath
- Supports restart policies: "always", "on-failure", "no"

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
