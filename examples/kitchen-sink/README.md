# SNODEB Example Service

This is a kitchen sink example that demonstrates SNODEB's packaging capabilities.

## Building the Package

1. Install dependencies:

```bash
npm install
```

1. Build the Debian package:

```bash
npm run build:deb
```

The package will be created in the `deb` directory.

## Testing the Package

Install the package:

```bash
sudo dpkg -i deb/snodeb-example_1.0.0.deb
```

The service will automatically:

1. Install files to /usr/share/snodeb-example
2. Create systemd service unit
3. Enable and start the service

Check service status:

```bash
systemctl status snodeb-example
```

View service logs:

```bash
journalctl -u snodeb-example -f
```
