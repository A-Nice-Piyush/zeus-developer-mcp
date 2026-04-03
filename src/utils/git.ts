import { execSync } from "child_process";

/**
 * Detects the current Git branch from the repository at GIT_REPO_PATH.
 * Returns null if GIT_REPO_PATH is not set or git command fails.
 */
export function getCurrentBranch(): string | null {
  const repoPath = process.env.GIT_REPO_PATH;
  if (!repoPath) {
    return null;
  }
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return branch && branch !== "HEAD" ? branch : null;
  } catch {
    return null;
  }
}
