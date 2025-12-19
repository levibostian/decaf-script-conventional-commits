#!/usr/bin/env -S deno run --quiet --allow-all --no-lock

// deno-lint-ignore-file no-import-prefix
import $ from "jsr:@david/dax@0.43.2"
import { getDeployStepInput } from "@levibostian/decaf-sdk"

const _input = getDeployStepInput()

// ---------------------------------------------------------------------------------
// Compile the deno binary for all targets and prepare GitHub release assets
// ---------------------------------------------------------------------------------
// Create dist directory if it doesn't exist
await $`mkdir -p dist`.printCommand()
await $`deno compile --output dist/bin-x86_64-Linux --allow-env --allow-net --allow-run --allow-read --allow-write --target x86_64-unknown-linux-gnu script.ts`
  .printCommand()
await $`deno compile --output dist/bin-aarch64-Linux --allow-env --allow-net --allow-run --allow-read --allow-write --target aarch64-unknown-linux-gnu script.ts`
  .printCommand()
await $`deno compile --output dist/bin-x86_64-Darwin --allow-env --allow-net --allow-run --allow-read --allow-write --target x86_64-apple-darwin script.ts`
  .printCommand()
await $`deno compile --output dist/bin-aarch64-Darwin --allow-env --allow-net --allow-run --allow-read --allow-write --target aarch64-apple-darwin script.ts`
  .printCommand()

await $`deno ${[
  `run`,
  `--quiet`,
  `--allow-all`,
  `jsr:@levibostian/decaf-script-github-releases`,
  `set-github-release-assets`,
  ...[
    `dist/bin-x86_64-Linux#bin-x86_64-Linux`,
    `dist/bin-aarch64-Linux#bin-aarch64-Linux`,
    `dist/bin-x86_64-Darwin#bin-x86_64-Darwin`,
    `dist/bin-aarch64-Darwin#bin-aarch64-Darwin`,
  ],
]}`.printCommand()
