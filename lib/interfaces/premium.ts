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
  limit: number;
  periodEnd: number;
}
