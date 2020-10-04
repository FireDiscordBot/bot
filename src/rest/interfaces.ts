export interface ErrorResponse {
  success: boolean;
  error: string;
  code: number;
}

export interface HtmlErrorResponse {
  title: string;
  text: string;
  button?: string;
  referral?: string;
  headers?: object;
  code: number;
}
