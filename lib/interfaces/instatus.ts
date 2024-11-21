export interface Summary {
  page: Page;
  activeIncidents: ActiveIncident[];
  activeMaintenances: ActiveMaintenance[];
}

export interface ActiveIncident {
  name: string;
  started: string;
  status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
  impact: "OPERATIONAL" | "PARTIALOUTAGE" | "MINOROUTAGE" | "MAJOROUTAGE";
  url: string;
}

export interface ActiveMaintenance {
  name: string;
  start: string;
  status: "NOTSTARTEDYET" | "INPROGRESS" | "COMPLETED";
  duration: string;
  url: string;
}

export interface Page {
  name: string;
  url: string;
  status: "UP" | "HASISSUES" | "UNDERMAINTENANCE";
}

export interface Components {
  components: Component[];
}

export interface Component {
  id: string;
  name: string;
  description: null | string;
  status: "OPERATIONAL" | "PARTIALOUTAGE" | "MINOROUTAGE" | "MAJOROUTAGE";
  group: Group | null;
}

export interface Group {
  id: string;
  name: string;
  description: string;
}
