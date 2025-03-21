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
remove)
    # Stop and disable service on package removal
    if is_active; then
        systemctl stop {{name}}.service || true
    fi
    if is_enabled; then
        systemctl disable {{name}}.service || true
    fi
    ;;
esac

exit 0
