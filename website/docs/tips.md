---
sidebar_position: 4
---

# Tips

## Building For Production

The default configuration of having `useNodeExecutor` enabled assumes that your `entryPoint` file is a .js file that can be run with Node.js.

In the case of a pure JavaScript app with no node_module dependencies, this might work fine out of the box. However, in most cases, you'll need to build and bundle TypeScript code and/or include dependencies that live in `node_modules`.

Let's look at how to handle these common scenarios.

### Bundling

When using TypeScript, you'll need to compile and bundle your code before creating the .deb package. We recommend using [tsup](https://tsup.egoist.dev) due to its simplicity and powerful features. For a complete example of an app using tsup, see the `examples/kitchen-sink` directory in the [GitHub repository](https://github.com/Soneliem/snodeb/tree/main/examples/kitchen-sink).

### Managing Dependencies

Understanding how to handle dependencies is crucial for creating efficient .deb packages:

- `devDependencies`: These are packages needed to build your application but not required at runtime. This includes:
  - Build tools (TypeScript, tsup, webpack, etc.)
  - Testing frameworks
  - Development utilities

- `dependencies`: These are packages actually required at runtime on the end user's device. In most cases, this is only really needed for dependencies that:
  - Don't work well cross-platform when compiled (like native modules)
  - Need dynamic loading capabilities
  - Require access to their own assets or resources at runtime

A good bundler like tsup should be able to bundle dev dependencies just fine and tree-shake where possible. Ensure you add `"node_modules/**/*"` to your `files.include` array ensure the dependencies are copied over.

After building your app, you should remove development dependencies to keep the package size minimal. You have two options:

#### Option 1: Use snodeb's built-in prune feature (recommended)

This approach automatically runs `npm prune --omit=dev` before packaging and `npm ci` after packaging, keeping your development environment intact. See [Build Optimization](/docs/configuration#build-optimization) for more details.

#### Option 2: Manual dependency management

Manually remove development dependencies:

```bash
npm prune --omit=dev
```

Note: If you installed snodeb as a devDependency, this command will remove it. However, you can still create the .deb package using npx:

```bash
npx snodeb
```

### CI/CD Integration

Here's an example GitLab CI configuration that automates the build and packaging process:

**Using snodeb's built-in prune feature:**

```yml
snodeb:
  script:
    - npm ci          # Install all dependencies
    - npm run bundle  # Build your application
    - npx snodeb      # Create the .deb package (with prune: true in config)
  artifacts:
    paths:
      - ./deb/*.deb   # Store the resulting .deb file as an artifact
```

**Using manual dependency management:**

```yml
snodeb:
  script:
    - npm ci                # Install all dependencies
    - npm run bundle        # Build your application
    - npm prune --omit=dev  # Remove development dependencies
    - npx snodeb            # Create the .deb package
  artifacts:
    paths:
      - ./deb/*.deb         # Store the resulting .deb file as an artifact
```
