---
sidebar_position: 1
---

# Introduction

snodeb (Sonel's Node Debian Builder) is a simple Node.js package for creating Debian packages (.deb) from Node.js applications.

## Features

- Pure JavaScript implementation (no host system dependencies)
- Configurable file inclusion/exclusion
- Systemd service generation
- Build optimization with automatic dependency management

## Overview

snodeb simplifies the process of packaging Node.js applications into Debian packages. With its pure JavaScript implementation, it eliminates the need for system-level dependencies, making it easier to integrate into your development and CI/CD workflows.

The tool provides comprehensive configuration options for:

- Package metadata (name, version, maintainer, etc.)
- File management (inclusion/exclusion patterns)
- Systemd service configuration (including auto-start and auto-enable)
- Installation paths and dependencies
- Build optimization (automatic dependency purging and restoration)
- Safe upgrading and uninstalling

Whether you're deploying a simple Node.js application or a complex service that needs system integration, snodeb provides the tools and flexibility you need for Debian package creation.

## Next Steps

- [Get Started!](./getting-started)
