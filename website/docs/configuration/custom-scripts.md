---
sidebar_position: 2
---

# Custom Scripts

snodeb allows you to extend or override the default maintainer scripts (preinst, postinst, prerm, postrm) by providing your own custom scripts:

```json
{
  "snodeb": {
    "customScripts": {
      "preinst": "debian/preinst.sh",    // Executed before installation
      "postinst": "debian/postinst.sh",  // Executed after installation
      "prerm": "debian/prerm.sh",        // Executed before removal
      "postrm": "debian/postrm.sh"       // Executed after removal
    }
  }
}
```

## How Custom Scripts Work

- For `postinst` and `prerm`, your custom scripts are inserted into the default templates that handle systemd service management. The custom script content is inserted just before the `exit 0` statement to ensure it runs as part of the script execution.
- For `preinst` and `postrm`, your scripts are used as-is since there are no default templates. They are wrapped with the necessary shell script header and exit statement.
- Script paths can be absolute or relative to your project directory.
- If a custom script is specified but not found, a warning will be logged and the build will continue.

### Example Script Integration

For example, if you provide a custom prerm script with the following content:

```bash
echo "Performing custom cleanup"
rm -rf /var/cache/myapp
```

When integrated with the default prerm template, the final script will look like this:

```bash
#!/bin/sh
set -e

# Function to check if service is enabled
is_enabled() {
    systemctl is-enabled myapp.service >/dev/null 2>&1 || false
}

# Function to check if service is active
is_active() {
    systemctl is-active myapp.service >/dev/null 2>&1 || false
}

case "$1" in
remove)
    # Stop and disable service on package removal
    if is_active; then
        systemctl stop myapp.service || true
    fi
    if is_enabled; then
        systemctl disable myapp.service || true
    fi
    ;;
esac

# Custom script
echo "Performing custom cleanup"
rm -rf /var/cache/myapp

exit 0
```

This ensures that both your custom logic and the necessary systemd service management are executed properly.
