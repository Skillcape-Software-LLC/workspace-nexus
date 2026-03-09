export type CiStatusValue = 'Unknown' | 'Passing' | 'Failing' | 'Running';

export interface GitHubOAuthStatus {
  connected: boolean;
  login: string | null;
}

export interface CiStatus {
  repoFullName: string;
  status: CiStatusValue;
  branch: string | null;
  runUrl: string | null;
  updatedAt: string;
  openPrCount: number | null;
  lastPushedAt: string | null;
  defaultBranch: string | null;
  lastCommitMessage: string | null;
}

export interface WatchedRepo {
  repoFullName: string;
  addedAt: string;
}

export interface AddWatchedRepoRequest {
  repoUrl: string;
}
