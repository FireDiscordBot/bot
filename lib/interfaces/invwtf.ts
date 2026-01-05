export interface VanityURL {
  gid: string;
  invite: string;
  code: string;
  clicks?: number;
  links?: number;
}

export interface Redirect {
  url: string;
  uid: string;
  clicks?: number;
  links?: number;
}
