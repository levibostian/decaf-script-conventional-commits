# AGENT.md

This file provides context for AI coding assistants working on this project.

## Project Overview

**decaf-script-conventional-commits** is a [decaf](https://github.com/levibostian/decaf) script that implements the **"get next release version"** step of the decaf deployment workflow. 

### Purpose
Automatically determines the next semantic version for a project by parsing git commit messages using the [conventional commits specification](https://www.conventionalcommits.org).

### Key Behavior
- **Major bump (X.0.0)**: Breaking changes (commits with `!:` or `BREAKING CHANGE:` footer)
- **Minor bump (0.X.0)**: New features (commits starting with `feat:`)
- **Patch bump (0.0.X)**: Bug fixes (commits starting with `fix:`)
- **No release**: Other commit types (docs, chore, refactor, etc.)
- **First release**: Returns `0.1.0` when no previous release exists
- **Priority**: When multiple bump types exist, highest priority wins (major > minor > patch)

## Architecture

### Core Files

1. **`script.ts`** - Main entry point
   - Uses the decaf SDK for input/output handling via `DATA_FILE_PATH` environment variable
   - Uses `denosaurs/commit` library for parsing conventional commits
   - Uses `@std/semver` for semantic version manipulation
   - Provides human-readable console output for each commit parsed

2. **`script.test.ts`** - Test suite
   - Runs script as subprocess to properly handle `Deno.exit()` calls
   - Tests all version bump scenarios and edge cases
   - Uses temporary files to simulate the decaf SDK's file-based I/O

3. **`deno.json`** - Configuration
   - Package metadata for JSR publishing
   - Import map for dependencies
   - Tasks for testing and compiling

4. **`node/`** - Node.js compatibility
   - `package.json` - NPM package configuration
   - `script.js` - Node.js version with manual semver parsing (no external semver lib)

5. **`install`** - Binary installation script
   - Downloads compiled binary from GitHub releases

6. **`.github/workflows/`** - CI/CD
   - `test.yml` - Runs tests on PR and push
   - `publish.yml` - Publishes to JSR and creates GitHub releases with binaries

## Dependencies

**Important**: Only add dependencies to `deno.json` imports that are used in `script.ts` itself. Test-only dependencies should use inline imports (e.g., `import { assertSnapshot } from "jsr:@std/testing@1.0.16/snapshot"`) to avoid forcing users to download unnecessary dependencies when they only want to run the script.

### Production Dependencies (in deno.json)

- **`@levibostian/decaf-sdk`** (^0.2.1) - Handles input/output contract with decaf tool
  - `getNextReleaseVersionStepInput()` - Reads JSON from `DATA_FILE_PATH` env var
  - `setNextReleaseVersionStepOutput()` - Writes JSON output to same file
  
- **`commit`** (https://deno.land/x/commit@0.1.2) - Parses conventional commit messages
  - Provides `parse()` function that returns structured commit data
  - Handles type, scope, subject, breaking changes, notes, etc.
  
- **`@std/semver`** (^1.0.3) - Semantic version parsing and manipulation
  - `tryParse()` - Parses version strings
  - `increment()` - Bumps versions (major/minor/patch)
  - `format()` - Converts version objects back to strings

- **`@std/assert`** (^1.0.11) - Test assertions (in deno.json for convenience in test files)

### Test-only Dependencies (inline imports)

- **`@std/testing/snapshot`** - Used in `script.logs.test.ts` for snapshot testing console output
  - Imported as `import { assertSnapshot } from "jsr:@std/testing@1.0.16/snapshot"`
  - Not in deno.json to avoid unnecessary downloads for script users

## Input/Output Contract

### Input (from `DATA_FILE_PATH` environment variable)
```json
{
  "gitCurrentBranch": "main",
  "gitRepoOwner": "username",
  "gitRepoName": "repo-name",
  "testMode": false,
  "lastRelease": {
    "versionName": "1.2.3",
    "commitSha": "abc123..."
  },
  "gitCommitsSinceLastRelease": [
    {
      "sha": "def456...",
      "title": "feat: add new feature",
      "date": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Output (written to same file)
```json
{
  "version": "1.3.0"
}
```

**Important**: If no release should be made, the script calls `Deno.exit(0)` without writing output.

## Development Workflow

### Running Tests
```bash
deno task test
```
Tests run the script as a subprocess to properly handle `Deno.exit()` calls.

### Compiling Binary
```bash
deno task compile
```
Creates `./decaf-script-conventional-commits` binary.

### Caching Dependencies
```bash
deno cache --frozen=false script.ts script.test.ts
```
Updates `deno.lock` file.

### Manual Testing
```bash
# Create test input
export DATA_FILE_PATH="./test-input.json"
cat > test-input.json << 'EOF'
{
  "gitCurrentBranch": "main",
  "gitRepoOwner": "test",
  "gitRepoName": "test",
  "testMode": false,
  "lastRelease": {"versionName": "1.0.0", "commitSha": "abc"},
  "gitCommitsSinceLastRelease": [
    {"sha": "def", "title": "feat: new feature", "date": "2024-01-01T00:00:00Z"}
  ]
}
EOF

# Run script
deno run -A script.ts

# Check output
cat test-input.json
```

## Distribution Methods

This script supports 4 distribution methods (all must be maintained):

1. **Deno/JSR** - `deno run jsr:@levibostian/decaf-script-conventional-commits`
2. **Binary** - Compiled with `deno compile`, distributed via GitHub releases
3. **Node.js** - `node/script.js` for NPM users (uses Node.js imports, no external deps)
4. **Direct URL** - Can import from `deno.land/x` or GitHub raw URLs

## Testing Strategy

### Test Structure
- Each test creates a temporary input file
- Runs script as subprocess with `DATA_FILE_PATH` pointing to temp file
- Reads output from same file
- Cleans up temp file

### Test Coverage
- ✅ First release (no previous version)
- ✅ Patch bumps (fix commits)
- ✅ Minor bumps (feat commits)
- ✅ Major bumps (breaking changes with `!:`)
- ✅ Priority handling (multiple bump types)
- ✅ Early exit (no release-worthy commits)
- ✅ Long commit titles (abbreviated output)
- ✅ Various breaking change patterns

### Why Subprocess Approach?
The script calls `Deno.exit(0)` in certain conditions. Direct imports would crash the test runner, so we run the script as a subprocess instead.

## Common Tasks

### Adding Support for New Commit Types

If you need to recognize new commit types (e.g., `perf:` for performance improvements):

1. Update the parsing logic in `script.ts`:
```typescript
} else if (parsed.type === "perf") {
  console.log(`${abbreviatedCommitTitle} => indicates a patch release.`)
  return "patch"
}
```

2. Add corresponding test in `script.test.ts`

3. Update README.md documentation

### Changing Version Bump Rules

To modify which commit types trigger which bumps:
- Edit the `map()` function in `script.ts`
- The `parse()` function from the commit library provides: `type`, `scope`, `subject`, `notes`, etc.
- Breaking changes are detected via `parsed.notes` or `!:` pattern

### Updating Dependencies

1. Edit `deno.json` imports
2. Run `deno cache --frozen=false script.ts script.test.ts`
3. Run `deno task test` to verify
4. For Node.js: Update `node/package.json` and `node/script.js` if needed

## Important Conventions

### Logging
- Every commit should produce a console.log showing how it was parsed
- Format: `<commit-title> => <interpretation>`
- Abbreviated to 50 chars for readability
- This is a key feature - users rely on this feedback

### Error Handling
- Script exits early (with `Deno.exit(0)`) when no release is needed
- First release returns `0.1.0` by default
- Invalid versions are not explicitly handled (relies on semver library)

### Breaking Changes
Two patterns are recognized:
1. `!:` anywhere in commit title (e.g., `feat!:`, `fix!:`, `refactor!:`)
2. `BREAKING CHANGE:` in commit notes/footer (parsed by commit library)

### Node.js Compatibility
- `node/script.js` must stay in sync with `script.ts` logic
- Uses manual semver parsing (simple regex) instead of external library
- Uses `process.exit()` instead of `Deno.exit()`
- Cannot use Deno-specific APIs

## Gotchas

1. **Tests must run as subprocess** - Don't import script.ts directly in tests
2. **Early exits don't write output** - By design, no version means no release
3. **Commit library is cached** - Changes to import URL require re-caching
4. **Binary compilation** - Requires all permissions (`--allow-all`)
5. **Multiple distributions** - Changes to logic must be reflected in Node.js version
6. **JSR publishing** - Only includes files listed in `deno.json` publish.include

## Related Documentation

- [decaf tool](https://github.com/levibostian/decaf) - Parent project
- [decaf SDK](https://github.com/levibostian/decaf-sdk-deno) - SDK documentation
- [Conventional Commits](https://www.conventionalcommits.org) - Commit message spec
- [denosaurs/commit](https://github.com/denosaurs/commit) - Parser library

