export interface Note {
  id: string;
  quickLinkId: string | null;
  title: string | null;
  body: string;
  authorName: string;
  tags: string | null;
  category: string | null;
  clientName: string | null;
  createdAt: string;
  updatedAt: string | null;
  isArchived: boolean;
}

export interface CreateNoteRequest {
  quickLinkId?: string | null;
  title?: string | null;
  body: string;
  authorName: string;
  tags?: string | null;
  category?: string | null;
  clientName?: string | null;
}

export interface UpdateNoteRequest {
  title?: string | null;
  body: string;
  tags?: string | null;
  category?: string | null;
  clientName?: string | null;
}

export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags.split(',').map(t => t.trim()).filter(Boolean);
}

export interface HealthStatus {
  googleConnected: boolean;
  githubConnected: boolean;
  githubWebhookSecret: boolean;
  claudeApiKey: boolean;
  apiKeyEnabled: boolean;
}
