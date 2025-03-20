#!/bin/sh
set -e

# Function to check if service is enabled
is_enabled() {
    systemctl is-enabled {{name}}.service >/dev/null 2>&1 || false
}

# Function to check if service is active
is_active() {
    systemctl is-active {{name}}.service >/dev/null 2>&1 || false
}

case "$1" in
configure)
    # Store initial state for upgrades
    if [ -n "$2" ]; then
        # This is an upgrade
        WAS_ENABLED=$(is_enabled && echo "true" || echo "false")
        WAS_ACTIVE=$(is_active && echo "true" || echo "false")

        # Stop service during upgrade if it's running
        if [ "$WAS_ACTIVE" = "true" ]; then
            systemctl stop {{name}}.service || true
        fi
    fi

    # Enable service if configured or if it was previously enabled
    if [ "{{enableService}}" = "true" ] || [ "$WAS_ENABLED" = "true" ]; then
        systemctl enable {{name}}.service || true
    fi

    # Start service if configured or if it was previously running
    if [ "{{startService}}" = "true" ] || [ "$WAS_ACTIVE" = "true" ]; then
        systemctl restart {{name}}.service || true
    fi
    ;;
esac

exit 0
