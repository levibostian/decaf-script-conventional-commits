#!/usr/bin/env -S deno run --quiet --allow-all --no-lock

import $ from "jsr:@david/dax@0.43.2";
import { getDeployStepInput } from "@levibostian/decaf-sdk"

const input = getDeployStepInput()

// ---------------------------------------------------------------------------------
// Compile the deno binary for all targets and prepare GitHub release assets
// ---------------------------------------------------------------------------------
// Create dist directory if it doesn't exist
await $`mkdir -p dist`.printCommand()
await $`deno compile --output dist/bin-x86_64-Linux --allow-env --allow-net --allow-run --allow-read --allow-write --target x86_64-unknown-linux-gnu script.ts`.printCommand()
await $`deno compile --output dist/bin-aarch64-Linux --allow-env --allow-net --allow-run --allow-read --allow-write --target aarch64-unknown-linux-gnu script.ts`.printCommand()
await $`deno compile --output dist/bin-x86_64-Darwin --allow-env --allow-net --allow-run --allow-read --allow-write --target x86_64-apple-darwin script.ts`.printCommand()
await $`deno compile --output dist/bin-aarch64-Darwin --allow-env --allow-net --allow-run --allow-read --allow-write --target aarch64-apple-darwin script.ts`.printCommand()

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
    `dist/bin-aarch64-Darwin#bin-aarch64-Darwin`
  ]
]}`.printCommand()

// ---------------------------------------------------------------------------------
// Publish the deno module to jsr
// ---------------------------------------------------------------------------------
const argsToDenoPublish = [
  "publish",
  "--set-version",
  input.nextVersionName,
  "--allow-dirty"
]

if (input.testMode) {
  argsToDenoPublish.push("--dry-run")
}

// https://github.com/dsherret/dax#providing-arguments-to-a-command
await $`deno ${argsToDenoPublish}`.printCommand()

// ---------------------------------------------------------------------------------
// Publish the package to npm
// ---------------------------------------------------------------------------------
// update the package.json version before we build as build will define the package we push. 

console.log(`Updating node package version to ${input.nextVersionName}...`)
await $`npm version ${input.nextVersionName} --no-git-tag-version`.cwd("./node").printCommand() 
// assert the version was updated correctly. grep will exit with code 1 if it doesn't find the string
await $`cat node/package.json | grep '"version": "${input.nextVersionName}"'`

// https://github.com/dsherret/dax#providing-arguments-to-a-command
const argsToPushToNpm = [
  `publish`,
  `node/`
]

if (input.testMode) {
  argsToPushToNpm.push(`--dry-run`)
} 

const nameOfNpmPackage = (await $`npm pkg get name`.cwd("./node").text()).trim().replace(/"/g, "")
const didAlreadyDeployToNpm = (await $`npx is-it-deployed --package-manager npm --package-name ${nameOfNpmPackage} --package-version ${input.nextVersionName}`.cwd("./node").noThrow()).code === 0

if (didAlreadyDeployToNpm) {
  console.log(`npm package ${input.nextVersionName} is already deployed. Skipping pushing to npm`)  
} else {
  await $`npm ${argsToPushToNpm}`.printCommand()
}

// ---------------------------------------------------------------------------------
// Create a GitHub release
// ---------------------------------------------------------------------------------
await $`deno ${[
  `run`,
  `--allow-all`,
  `--quiet`,
  `jsr:@levibostian/decaf-script-github-releases`,
  `set`
]}`.printCommand()