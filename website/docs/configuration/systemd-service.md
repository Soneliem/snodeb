---
sidebar_position: 2
---

# Systemd Service

snodeb automatically generates a systemd service file with the following configuration:

- **Service User and Group**: Defaults to root, but should be configured for security
- **Working Directory**: Set to the installPath
- **Entry Point**: Uses package.json's main or index.js by default
- **Restart Policy**: Three options available:
  - `"always"`: Always restart the service (default)
  - `"on-failure"`: Only restart on failure
  - `"no"`: Never automatically restart
- **Restart Delay**: Time to wait before restarting (default: 10 seconds)

## Service Management

The systemd service behavior during installation and updates is controlled by:

- `enableService`: Controls automatic service enabling (default: true)
- `startService`: Controls automatic service starting (default: true)

### Package Updates

When updating an existing installation:

1. The current service state (enabled/active) is preserved
2. The service is automatically stopped during the update if running
3. After the update:
   - The service remains enabled if previously enabled or if `enableService=true`
   - The service is restarted if previously running or if `startService=true`

This ensures safe updates while respecting both the package configuration and the system's current service state.
