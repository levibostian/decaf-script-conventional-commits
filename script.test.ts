import { assertEquals } from "@std/assert"

// Mock the DATA_FILE_PATH environment variable for tests
function setupTestEnv(inputData: unknown) {
  const tempFile = Deno.makeTempFileSync()
  Deno.writeTextFileSync(tempFile, JSON.stringify(inputData))
  return tempFile
}

function getOutputFromFile(filePath: string) {
  const content = Deno.readTextFileSync(filePath)
  return JSON.parse(content)
}

async function runScript(dataFilePath: string) {
  // Run the script as a subprocess to properly handle Deno.exit()
  const command = new Deno.Command("deno", {
    args: ["run", "--quiet", "--allow-all", "--no-lock", "script.ts"],
    env: {
      DATA_FILE_PATH: dataFilePath
    },
    stdout: "piped",
    stderr: "piped"
  })
  
  const { code, stdout, stderr } = await command.output()
  
  return {
    exitCode: code,
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr)
  }
}

Deno.test("returns first release version when no last release exists", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    gitCommitsSinceLastRelease: []
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "0.1.0")
})

Deno.test("bumps patch version for fix commits", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "fix: resolve bug in parser",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "1.2.4")
})

Deno.test("bumps minor version for feat commits", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat: add new feature",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "1.3.0")
})

Deno.test("bumps major version for breaking change commits", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat!: breaking change in API",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)   

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "2.0.0")
})

Deno.test("prioritizes major over minor and patch", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "fix: small bug fix",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "feat: new feature",
        date: "2024-01-02T00:00:00Z"
      },
      {
        sha: "jkl012",
        title: "feat!: breaking change",
        date: "2024-01-03T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "2.0.0")

})

Deno.test("prioritizes minor over patch when no major changes", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "fix: bug fix 1",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "fix: bug fix 2",
        date: "2024-01-02T00:00:00Z"
      },
      {
        sha: "jkl012",
        title: "feat: new feature",
        date: "2024-01-03T00:00:00Z"
      },
      {
        sha: "mno345",
        title: "fix: bug fix 3",
        date: "2024-01-04T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "1.3.0")

})

Deno.test("prioritizes major even when it appears first in commit history", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat!: breaking change comes first",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "feat: new feature after breaking",
        date: "2024-01-02T00:00:00Z"
      },
      {
        sha: "jkl012",
        title: "fix: bug fix after both",
        date: "2024-01-03T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "2.0.0")

})

Deno.test("prioritizes major even when it appears last in commit history", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "fix: bug fix comes first",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "feat: new feature in middle",
        date: "2024-01-02T00:00:00Z"
      },
      {
        sha: "jkl012",
        title: "fix!: breaking change at the end",
        date: "2024-01-03T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "2.0.0")

})

Deno.test("handles multiple major changes (should not compound)", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat!: first breaking change",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "fix!: second breaking change",
        date: "2024-01-02T00:00:00Z"
      },
      {
        sha: "jkl012",
        title: "chore!: third breaking change",
        date: "2024-01-03T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  // Should be 2.0.0, not 4.0.0 - multiple majors don't compound
  assertEquals(output.version, "2.0.0")

})

Deno.test("handles many minor changes with major (major wins)", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat: feature 1",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "feat: feature 2",
        date: "2024-01-02T00:00:00Z"
      },
      {
        sha: "jkl012",
        title: "feat: feature 3",
        date: "2024-01-03T00:00:00Z"
      },
      {
        sha: "mno345",
        title: "feat!: breaking change among many features",
        date: "2024-01-04T00:00:00Z"
      },
      {
        sha: "pqr678",
        title: "feat: feature 4",
        date: "2024-01-05T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "2.0.0")

})

Deno.test("complex mix prioritizes correctly: major > minor > patch", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "2.5.7",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "docs: update documentation",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "fix: resolve parser bug",
        date: "2024-01-02T00:00:00Z"
      },
      {
        sha: "jkl012",
        title: "chore: update dependencies",
        date: "2024-01-03T00:00:00Z"
      },
      {
        sha: "mno345",
        title: "feat: add validation feature",
        date: "2024-01-04T00:00:00Z"
      },
      {
        sha: "pqr678",
        title: "fix: fix memory leak",
        date: "2024-01-05T00:00:00Z"
      },
      {
        sha: "stu901",
        title: "test: add more tests",
        date: "2024-01-06T00:00:00Z"
      },
      {
        sha: "vwx234",
        title: "refactor!: completely rewrite core engine",
        date: "2024-01-07T00:00:00Z"
      },
      {
        sha: "yzab567",
        title: "feat: add another feature after breaking change",
        date: "2024-01-08T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  // Should be major release (3.0.0) despite having minor and patch commits too
  assertEquals(output.version, "3.0.0")

})

Deno.test("handles only patch commits correctly", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "fix: resolve parser bug",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "fix: fix memory leak",
        date: "2024-01-02T00:00:00Z"
      },
      {
        sha: "jkl012",
        title: "fix: handle edge case",
        date: "2024-01-03T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "1.2.4")

})

Deno.test("exits early when no release-worthy commits exist", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "docs: update README",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "chore: update dependencies",
        date: "2024-01-02T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  // When exiting early, the output file should not contain a version field
  // The script exits before writing new output
  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, undefined)

})

Deno.test("detects breaking changes with exclamation in middle of commit", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "refactor!: completely rewrite the core module",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "2.0.0")

})

Deno.test("handles commits with scopes correctly", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat(parser): add new parsing feature",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "1.3.0")

})

Deno.test("handles scoped fix commits correctly", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "fix(api): resolve authentication bug",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "1.2.4")

})

Deno.test("handles scoped breaking changes correctly", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat(core)!: redesign API interface",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "2.0.0")

})

Deno.test("detects breaking change with BREAKING CHANGE in commit body", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat: add new feature\n\nThis is a description.\n\nBREAKING CHANGE: This breaks the API",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "2.0.0")

})

Deno.test("detects breaking change with exclamation point only", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "fix!: remove deprecated method",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "2.0.0")

})

Deno.test("handles commit with both exclamation point and BREAKING CHANGE (should not double bump)", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat!: redesign API\n\nThis completely changes how the API works.\n\nBREAKING CHANGE: All previous API calls will fail",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  // Should still be 2.0.0, not double-bumped to 3.0.0 or anything
  assertEquals(output.version, "2.0.0")

})

Deno.test("detects breaking change in any commit type with exclamation", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        // chore commits usually don't trigger releases, but with ! they should
        title: "chore!: update build system with breaking changes",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "2.0.0")

})

Deno.test("does not detect false positive with exclamation in description", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat: add exciting new feature! This is amazing!",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  // Should be minor (1.3.0), not major, because exclamation is not in the right format
  assertEquals(output.version, "1.3.0")

})

Deno.test("detects breaking change with exclamation even when title is abbreviated", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat!: this is a very long commit message that exceeds fifty characters and should be abbreviated but still detected as breaking",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  // Should detect breaking change even though title will be abbreviated for display
  assertEquals(output.version, "2.0.0")

})

// Tests for pre-release versioning behavior (0.x.x)
Deno.test("pre-release: feat commits bump minor version from 0.1.0", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "0.1.0",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat: add new feature in pre-release",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "0.2.0")

})

Deno.test("pre-release: fix commits bump minor version from 0.1.0", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "0.1.0",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "fix: resolve bug in pre-release",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "0.1.1")

})

Deno.test("pre-release: multiple feat and fix commits only bump minor once", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "0.3.0",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat: add feature 1",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "fix: fix bug 1",
        date: "2024-01-02T00:00:00Z"
      },
      {
        sha: "jkl012",
        title: "feat: add feature 2",
        date: "2024-01-03T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "0.4.0")

})

Deno.test("pre-release: breaking change transitions to 1.0.0 from any 0.x.x version", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "0.5.0",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "feat!: breaking change transitions to stable",
        date: "2024-01-01T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, "1.0.0")

})

Deno.test("pre-release: non-release commits don't affect pre-release versioning", async () => {
  const tempFile = setupTestEnv({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "0.4.0",
      commitSha: "abc123"
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title: "docs: update documentation",
        date: "2024-01-01T00:00:00Z"
      },
      {
        sha: "ghi789",
        title: "chore: update dependencies",
        date: "2024-01-02T00:00:00Z"
      }
    ]
  })

  await runScript(tempFile)

  const output = getOutputFromFile(tempFile)
  assertEquals(output.version, undefined)

})


