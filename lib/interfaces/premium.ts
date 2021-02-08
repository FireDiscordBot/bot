export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export interface PremiumData {
  user: string;
  status: SubscriptionStatus;
  limit: 1 | 3 | 5;
  periodEnd: number;
}
