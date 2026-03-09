export interface QuickLink {
  id: string;
  name: string;
  url: string;
  category: string;
  description?: string;
  sortOrder: number;
  isRepo: boolean;
  repoOwner?: string;
  repoName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuickLinkRequest {
  name: string;
  url: string;
  category: string;
  description?: string;
  isRepo: boolean;
  repoOwner?: string;
  repoName?: string;
}

export interface UpdateQuickLinkRequest {
  name: string;
  url: string;
  category: string;
  description?: string;
  isRepo: boolean;
  repoOwner?: string;
  repoName?: string;
}
