# snodeb Example Service

This is a kitchen sink example that demonstrates snodeb's packaging capabilities.

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

Check service status:

```bash
systemctl status snodeb-example
```

View service logs:

```bash
journalctl -u snodeb-example -f
```
