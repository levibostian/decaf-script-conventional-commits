#!/usr/bin/env -S deno run --quiet --allow-all --no-lock

import { getNextReleaseVersionStepInput, setNextReleaseVersionStepOutput } from "@levibostian/decaf-sdk"
import * as semver from "@std/semver"
import { parse } from "conventional-commits-parser"

const input = getNextReleaseVersionStepInput()

// Exit early if there are no commits since the last release.
if (input.gitCommitsSinceLastRelease.length === 0) {
  console.log("No commits since the last release. There are no commits to analyze and no new version will be released. Exiting...")
  Deno.exit(0)
}

console.log("I'm going to look at each commit and figure out if any of them are important enough to trigger a new release.")
console.log("Commits must be formatted according to the Conventional Commits specification: https://www.conventionalcommits.org/")
console.log("")

// Parse all commits to determine the version bump for each commit.
const versionBumpsForEachCommit: ("major" | "minor" | "patch")[] = input.gitCommitsSinceLastRelease.map((commit) => {
  const abbreviatedCommitTitle = commit.title.length > 50
    ? commit.title.substring(0, 47) + "..."
    : commit.title.padEnd(50, " ");
  
  // Parse the commit message using the conventional commits library
  const parsed = parse(commit.title)

  // Check if it's a breaking change (has notes with breaking change)
  const isBreakingChange = parsed.notes.some((note: { title: string }) => note.title === "BREAKING CHANGE") || /.*!:.*/.test(commit.title)
  
  if (isBreakingChange) {
    console.log(`${abbreviatedCommitTitle} => indicates a major release.`)
    return "major"
  } else if (parsed.type === "feat") {
    console.log(`${abbreviatedCommitTitle} => indicates a minor release.`)
    return "minor"
  } else if (parsed.type === "fix") {
    console.log(`${abbreviatedCommitTitle} => indicates a patch release.`)
    return "patch"
  } else {
    console.log(`${abbreviatedCommitTitle} => does not indicate a release.`)
    return undefined
  }
})
  .filter((versionBump) => versionBump !== undefined)
  // Sort the version bumps by priority: major > minor > patch
  .sort((a, b) => {
    const priority = { "major": 0, "minor": 1, "patch": 2 }
    return priority[a] - priority[b]
  })

console.log("")

const nextReleaseBump = versionBumpsForEachCommit[0] // highest priority bump, since the list is sorted

// Exit early if there are no commits that indicate a release.
if (versionBumpsForEachCommit.length === 0) {
  console.log(`None of these commits are important enough to trigger a release. I only look for commits that begin with:`)
  console.log(`1. "feat:" - indicates a new or modified feature`)
  console.log(`2. "fix:" - indicating a bug fix`)
  console.log(`3. "feat!:" (the ! character before colon) - indicating a breaking change`)
  console.log(`No new version will be released.`)
  Deno.exit(0)
}

// Exit early if there is no previous release. this is the first release.
const lastReleaseVersion = input.lastRelease?.versionName
if (!lastReleaseVersion) {
  console.log("This looks like your first release! There wasn't a previous release found.")
  console.log("Going to set the next release version to 0.1.0 because it's the first release.")

  setNextReleaseVersionStepOutput({
    version: "0.1.0"
  })
  Deno.exit(0)
}

// Parse the last release version so we can increment it.
// Exit early if the last release version is not a valid semantic version.
const lastReleaseSemanticVersion = semver.tryParse(lastReleaseVersion) 
if (!lastReleaseSemanticVersion) {
  console.error(`Last release version "${lastReleaseVersion}" is not a valid semantic version. It cannot be parsed. Therefore, the next release version cannot be determined.`)
  console.log(`Learn more about semantic versioning: https://semver.org`)
  Deno.exit(1)
}

// Increment the last release version based on the next release bump.
const nextVersion = semver.format(semver.increment(lastReleaseSemanticVersion, nextReleaseBump))

console.log(`Based on your commits, the next version will be ${nextVersion}.`)

setNextReleaseVersionStepOutput({
  version: nextVersion
})
