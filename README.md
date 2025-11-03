# decaf Script - Conventional Commits

A script specifically designed for the [decaf](https://github.com/levibostian/decaf) deployment automation tool. This script automatically determines your next semantic version by parsing commit messages using the [conventional commits](https://www.conventionalcommits.org) specification.

**Important**: This is exclusively for use with decaf. You must use decaf to utilize this script - it's not a standalone tool for general use.

## What does this script do?

This is a decaf script to get the next release version based on conventional commits. If your commit messages follow the conventional commits specification, this script will analyze your commit history since the last release and determine the appropriate semantic version bump (major, minor, or patch) based on the types of commits made.

> Tip: See section "Understanding versioning behavior" below for details on how version bumps are determined.

# Getting Started

**No installation required!** We just need to tell decaf how to run this script (via `npx`, `deno`, or a compiled binary).

Here are some simple examples for how to run this script with decaf on GitHub Actions or from the command line.

**GitHub Actions Example**

```yaml
- uses: levibostian/decaf
  with:
    get_next_release_version: npx @levibostian/decaf-script-conventional-commits
    # Other decaf arguments...
```

**Command Line Example**

```bash
decaf \
  --get-next-release-version "npx @levibostian/decaf-script-conventional-commits"
```

> Note: The above examples use `npx` and are arguably the easiest way to run the script. See below for alternative installation methods.

### Alternative Installation Methods

The above examples use `npx` and are arguably the easiest way to run the script. But, you have a few other options too: 

1. **Run with Deno** (requires Deno installed)

```yaml
get_next_release_version: deno run --allow-all --quiet jsr:@levibostian/decaf-script-conventional-commits
```

2. **Run as a compiled binary**

Great option that doesn't depend on node or deno. This just installs a binary from GitHub and runs it for your operating system.

```yaml
get_next_release_version: curl -fsSL https://github.com/levibostian/decaf-script-conventional-commits/blob/HEAD/install?raw=true | bash -s "0.1.0" && ./decaf-script-conventional-commits

# Or, always run the latest version (less stable, but always up-to-date)
get_next_release_version: curl -fsSL https://github.com/levibostian/decaf-script-conventional-commits/blob/HEAD/install?raw=true | bash && ./decaf-script-conventional-commits
```

# Commit message format

This script follows the [conventional commits](https://www.conventionalcommits.org) specification for all of the commit messages in your repository. 

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

**Commit types that trigger releases:**

- `feat:` - A new feature (triggers **minor** version bump. example: 0.1.0 -> 0.2.0)
- `fix:` - A bug fix (triggers **patch** version bump. example: 0.1.0 -> 0.1.1)
- `<type>!:` - Breaking change (triggers **major** version bump. example: 1.2.3 -> 2.0.0 or 0.3.0 -> 1.0.0)
  - Examples: `feat!:`, `fix!:`, `refactor!:`

**Commit types that don't trigger releases:**

- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring without functional changes
- `style:` - Formatting changes
- `perf:` - Performance improvements
- `ci:` - CI/CD configuration changes

# Understanding versioning behavior

This section describes how the script determines version bumps based on your commit history.

### Pre-release versioning (0.x.x)

When your project is in pre-release mode (version is less than version 1.0.0), this script will start at version `0.1.0` and increment the **minor** and **patch** version until you create a commit that indicates a breaking change. At that point, the script transitions you to version `1.0.0`, and from there, standard semantic versioning applies.

**Important**: In pre-release mode, this script do NOT use hyphenated pre-release identifiers like `1.0.0-alpha.1`, `1.0.0-beta.1`. If this is a behavior that you want, consider forking this script and modifying it to suit your needs.
