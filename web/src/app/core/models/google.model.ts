export interface EmailSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string;
  isUnread: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  attendees: string[];
  meetUrl: string | null;
  isAllDay: boolean;
}

export interface ChatSpace {
  name: string;
  displayName: string;
  type: string;
  unreadCount: number;
}

export interface ChatMessage {
  name: string;
  senderName: string;
  text: string;
  createdAt: string;
}
