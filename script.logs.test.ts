// deno-lint-ignore-file no-import-prefix
import { assertSnapshot } from "jsr:@std/testing@1.0.16/snapshot"

// Helper to run the script and capture stdout
async function runScriptWithLogs(inputData: unknown) {
  const tempFile = Deno.makeTempFileSync()
  Deno.writeTextFileSync(tempFile, JSON.stringify(inputData))

  const command = new Deno.Command("deno", {
    args: ["run", "--allow-all", "--no-lock", "script.ts"],
    env: {
      DATA_FILE_PATH: tempFile,
    },
    stdout: "piped",
    stderr: "piped",
  })

  const { stdout } = await command.output()
  const logs = new TextDecoder().decode(stdout)

  // Cleanup
  try {
    Deno.removeSync(tempFile)
  } catch {
    // Ignore cleanup errors
  }

  return logs
}

Deno.test("console logs: commit with very long title", async (t) => {
  const logs = await runScriptWithLogs({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.0.0",
      commitSha: "abc123",
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "def456",
        title:
          "feat: this is an extremely long commit message title that goes on and on and should probably be truncated or wrapped in some way to make it more readable in the console output when the user is reviewing what commits were parsed",
        date: "2024-01-01T00:00:00Z",
      },
    ],
  })

  await assertSnapshot(t, logs)
})

Deno.test("console logs: multiple commits with different types", async (t) => {
  const logs = await runScriptWithLogs({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.2.3",
      commitSha: "abc123",
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "commit1",
        title: "feat: add new authentication system",
        date: "2024-01-01T00:00:00Z",
      },
      {
        sha: "commit2",
        title: "fix: resolve null pointer exception in parser",
        date: "2024-01-02T00:00:00Z",
      },
      {
        sha: "commit3",
        title: "docs: update README with new examples",
        date: "2024-01-03T00:00:00Z",
      },
      {
        sha: "commit4",
        title: "chore: update dependencies to latest versions",
        date: "2024-01-04T00:00:00Z",
      },
    ],
  })

  await assertSnapshot(t, logs)
})

Deno.test("console logs: breaking change with scope", async (t) => {
  const logs = await runScriptWithLogs({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "2.5.0",
      commitSha: "abc123",
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "commit1",
        title: "feat(api)!: redesign authentication API to use OAuth2",
        date: "2024-01-01T00:00:00Z",
      },
    ],
  })

  await assertSnapshot(t, logs)
})

Deno.test("console logs: pre-release version bump", async (t) => {
  const logs = await runScriptWithLogs({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "0.3.0",
      commitSha: "abc123",
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "commit1",
        title: "feat: add user profile management",
        date: "2024-01-01T00:00:00Z",
      },
      {
        sha: "commit2",
        title: "fix: resolve login redirect issue",
        date: "2024-01-02T00:00:00Z",
      },
    ],
  })

  await assertSnapshot(t, logs)
})

Deno.test("console logs: transition to stable with breaking change", async (t) => {
  const logs = await runScriptWithLogs({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "0.8.5",
      commitSha: "abc123",
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "commit1",
        title: "feat!: production-ready API with backwards-incompatible changes",
        date: "2024-01-01T00:00:00Z",
      },
    ],
  })

  await assertSnapshot(t, logs)
})

Deno.test("console logs: no release-worthy commits", async (t) => {
  const logs = await runScriptWithLogs({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.5.0",
      commitSha: "abc123",
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "commit1",
        title: "docs: fix typo in installation guide",
        date: "2024-01-01T00:00:00Z",
      },
      {
        sha: "commit2",
        title: "chore: update CI configuration",
        date: "2024-01-02T00:00:00Z",
      },
      {
        sha: "commit3",
        title: "refactor: simplify internal helper functions",
        date: "2024-01-03T00:00:00Z",
      },
    ],
  })

  await assertSnapshot(t, logs)
})

Deno.test("console logs: no commits since last release", async (t) => {
  const logs = await runScriptWithLogs({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "1.5.0",
      commitSha: "abc123",
    },
    gitCommitsSinceLastRelease: [],
  })

  await assertSnapshot(t, logs)
})

Deno.test("console logs: first release of project", async (t) => {
  const logs = await runScriptWithLogs({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    gitCommitsSinceLastRelease: [{
      sha: "commit1",
      title: "feat: initial feature",
      date: "2024-01-01T00:00:00Z",
    }],
  })

  await assertSnapshot(t, logs)
})

Deno.test("console logs: complex mix with priority", async (t) => {
  const logs = await runScriptWithLogs({
    gitCurrentBranch: "main",
    gitRepoOwner: "test-owner",
    gitRepoName: "test-repo",
    testMode: false,
    lastRelease: {
      versionName: "3.2.1",
      commitSha: "abc123",
    },
    gitCommitsSinceLastRelease: [
      {
        sha: "commit1",
        title: "feat: add dark mode support",
        date: "2024-01-01T00:00:00Z",
      },
      {
        sha: "commit2",
        title: "fix: correct timezone handling",
        date: "2024-01-02T00:00:00Z",
      },
      {
        sha: "commit3",
        title: "feat!: remove deprecated v2 API endpoints",
        date: "2024-01-03T00:00:00Z",
      },
      {
        sha: "commit4",
        title: "docs: add migration guide",
        date: "2024-01-04T00:00:00Z",
      },
    ],
  })

  await assertSnapshot(t, logs)
})
