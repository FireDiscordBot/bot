export interface Reminder {
  user: string;
  text: string;
  link?: string;
  legacy?: boolean;
  timestamp: number;
}
