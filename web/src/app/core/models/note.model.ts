export interface Note {
  id: string;
  quickLinkId: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface CreateNoteRequest {
  quickLinkId: string;
  body: string;
  authorName: string;
}

export interface HealthStatus {
  googleCredentials: boolean;
  githubPat: boolean;
  githubWebhookSecret: boolean;
  claudeApiKey: boolean;
  apiKeyEnabled: boolean;
}
