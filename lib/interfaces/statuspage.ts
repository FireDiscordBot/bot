export interface Summary {
  page: Page;
  status: Status;
  components: Component[];
  incidents: Incident[];
  scheduled_maintenances: Incident[];
}

export interface Incidents {
  page: Page;
  incidents: Incident[];
}

export interface Status {
  description: string;
  indicator: string;
}

export interface Page {
  id: string;
  name: string;
  url: string;
  updated_at: Date;
}

export interface Incident {
  created_at: Date;
  id: string;
  impact: string;
  incident_updates: IncidentUpdate[];
  monitoring_at: null;
  name: string;
  page_id: string;
  resolved_at: Date | null;
  shortlink: string;
  status: string;
  updated_at: Date;
  scheduled_for?: Date;
  scheduled_until?: Date;
}

export interface IncidentUpdate {
  body: string;
  created_at: Date;
  display_at: Date;
  id: string;
  incident_id: string;
  status: string;
  updated_at: Date;
}

export interface Component {
  created_at: Date;
  description: null;
  id: string;
  group_id: string;
  name: string;
  page_id: string;
  position: number;
  status: string;
  updated_at: Date;
}
