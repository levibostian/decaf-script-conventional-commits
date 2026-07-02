# decaf Script - Conventional Commits

A script specifically designed for the [decaf](https://github.com/levibostian/decaf) deployment automation tool. This script automatically determines your next semantic version by parsing commit messages using the [conventional commits](https://www.conventionalcommits.org) specification.

## What does this script do?

This is a decaf script to get the next release version based on conventional commits. If your commit messages follow the conventional commits specification, this script will analyze your commit history since the last release and determine the appropriate semantic version bump (major, minor, or patch) based on the types of commits made.

> Tip: See section "Understanding versioning behavior" below for details on how version bumps are determined.

# Getting Started

Run using decaf's `shebang` command in your deployment workflow.

**GitHub Actions Example**

```yaml
- uses: levibostian/decaf
  with:
    get_next_release_version: decaf shebang git@github.com:levibostian/decaf-script-conventional-commits.git/shebang.sh@<version-here>
    # Other decaf arguments...
```

Replace `<version-here>` with a [release](https://github.com/levibostian/decaf-script-conventional-commits/releases). Latest: ![GitHub Release](https://img.shields.io/github/v/release/levibostian/decaf-script-conventional-commits)

**Command Line Example**

```bash
decaf \
  --get-next-release-version "decaf shebang git@github.com:levibostian/decaf-script-conventional-commits.git/shebang.sh@<version-here>"
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
