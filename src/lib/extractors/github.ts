import { extractMarkdown } from './markdown';
import type { ExtractionResult } from './types';

/**
 * Fetches a GitHub file or repo README as raw text.
 * Supports:
 *   - Blob URLs: github.com/owner/repo/blob/branch/path/to/file.md
 *   - Root repo: github.com/owner/repo  →  fetches README.md
 */
export async function extractGithub(url: string): Promise<ExtractionResult> {
  const rawUrl = githubUrlToRaw(url);

  const response = await fetch(rawUrl, {
    headers: { 'User-Agent': 'Ridecast/1.0 (+https://ridecast.app)' },
  });

  if (response.status === 404) {
    throw new Error(
      `GitHub file not found. If this is a repo URL, make sure it has a README.md on the main branch.`,
    );
  }
  if (!response.ok) {
    throw new Error(`GitHub fetch failed (status ${response.status}).`);
  }

  const content = await response.text();
  return extractMarkdown(content);
}

function githubUrlToRaw(url: string): string {
  // Blob URL: github.com/owner/repo/blob/branch/path → raw.githubusercontent.com/owner/repo/branch/path
  const blobMatch = url.match(
    /github\.com\/([\w-]+\/[\w.-]+)\/blob\/([\w.-]+)\/(.+)/,
  );
  if (blobMatch) {
    const [, repo, branch, path] = blobMatch;
    return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
  }

  // Root repo URL: github.com/owner/repo — fetch main README
  const repoMatch = url.match(/github\.com\/([\w-]+\/[\w.-]+)\/?$/);
  if (repoMatch) {
    const [, repo] = repoMatch;
    // Try main branch
    return `https://raw.githubusercontent.com/${repo}/main/README.md`;
  }

  throw new Error(
    `Unrecognized GitHub URL format. Try: github.com/owner/repo or github.com/owner/repo/blob/main/README.md`,
  );
}
