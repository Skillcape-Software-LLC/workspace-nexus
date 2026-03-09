export type CiStatusValue = 'Unknown' | 'Passing' | 'Failing' | 'Running';
export type GitHubAccountType = 'user' | 'org';

export interface CiStatus {
  repoFullName: string;
  status: CiStatusValue;
  branch: string | null;
  runUrl: string | null;
  updatedAt: string;
  sourceAccount: string | null;
}

export interface WatchedAccount {
  accountName: string;
  accountType: GitHubAccountType;
  addedAt: string;
}

export interface AddWatchedAccountRequest {
  accountName: string;
  accountType: GitHubAccountType;
}
