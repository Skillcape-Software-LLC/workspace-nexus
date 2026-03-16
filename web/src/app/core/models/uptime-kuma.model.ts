export type MonitorStatusValue = 'Unknown' | 'Up' | 'Down' | 'Pending' | 'Maintenance';

export interface UptimeKumaTag {
  tagId: number;
  name: string;
  value: string;
}

export interface UptimeKumaMonitor {
  monitorId: number;
  name: string;
  url: string | null;
  type: string;
  active: boolean;
  status: MonitorStatusValue;
  responseTimeMs: number;
  certDaysRemaining: number | null;
  certIsValid: boolean | null;
  tags: UptimeKumaTag[];
  updatedAt: string;
}
