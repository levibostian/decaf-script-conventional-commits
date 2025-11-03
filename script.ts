#!/usr/bin/env -S deno run --quiet --allow-all --no-lock

import { getNextReleaseVersionStepInput, setNextReleaseVersionStepOutput } from "@levibostian/decaf-sdk"
import * as semver from "@std/semver"
import { parse } from "conventional-commits-parser"

const input = getNextReleaseVersionStepInput()

const lastReleaseVersion = input.lastRelease?.versionName
if (!lastReleaseVersion) {
  console.log("No last release found, returning first release version.")

  setNextReleaseVersionStepOutput({
    version: "0.1.0"
  })
  Deno.exit(0)
}

const lastReleaseSemanticVersion = semver.tryParse(lastReleaseVersion) 
if (!lastReleaseSemanticVersion) {
  console.error(`Last release version "${lastReleaseVersion}" is not a valid semantic version. It cannot be parsed. Therefore, the next release version cannot be determined.`)
  Deno.exit(1)
}

// Parse all commits to determine the version bump for each commit.
const versionBumpsForEachCommit: ("major" | "minor" | "patch")[] = input.gitCommitsSinceLastRelease.map((commit) => {
  const abbreviatedCommitTitle = commit.title.length > 50 ? commit.title.substring(0, 50) + "..." : commit.title
  
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

const nextReleaseBump = versionBumpsForEachCommit[0] // highest priority bump, since the list is sorted

if (versionBumpsForEachCommit.length === 0) {
  console.log(`No commits indicate a release should be made. Exiting without a new release version.`)
  Deno.exit(0)
}

setNextReleaseVersionStepOutput({
  version: semver.format(semver.increment(lastReleaseSemanticVersion, nextReleaseBump))
})
