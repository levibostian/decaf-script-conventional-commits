# Agent Guide

## Build/Test Commands
- **Run all tests**: `deno task test`
- **Run single test**: `deno test --allow-all script.test.ts --filter "test name"`
- **Update snapshots**: `deno test --allow-all script.logs.test.ts -- --update`
- **Lint**: `deno task lint`
- **Format**: `deno task format`

## Code Style
- **Imports**: External deps in `deno.json` imports (production) or inline JSR imports (test-only like `@std/testing`)
- **Formatting**: 2-space indentation, double quotes, semicolons required (use `deno fmt` to auto-format)
- **Types**: Use TypeScript types; leverage type inference from imports
- **Naming**: camelCase for variables/functions, PascalCase for types
- **Error handling**: Use early returns with `Deno.exit(0)` for no-release conditions, `Deno.exit(1)` for errors
- **Testing**: Run script as subprocess via `Deno.Command` (never import directly - script uses `Deno.exit()`)
- **Logging**: Every commit must produce `console.log()` showing how it was parsed (50 char limit with padding)
- **Comments**: Prefer descriptive names over comments; use comments for non-obvious business logic only

## Project Context
This is a decaf script that parses conventional commits to determine semantic versions. Main logic in `script.ts`, comprehensive tests in `script.test.ts`. Supports 4 distribution methods: Deno/JSR, binary, Node.js, and direct URL. Node.js version (`node/script.js`) must stay in sync with Deno version.

## Key Behaviors
- **First release**: Version based on commit type - `fix:` → `0.0.1`, `feat:` → `0.1.0`, breaking → `1.0.0`
- **Version bumps**: Priority is major > minor > patch (only highest priority bump applied)
