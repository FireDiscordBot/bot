export interface EssentialTransaction {
  _id: string;
  uuid: string;
  uuid_short: string;
  username: string;
  username_lower: string;
  gateway: string;
  status: Status;
  packages: Package[];
}

export interface Package {
  id: number;
  quantity: number;
}

export interface Status {
  complete: number;
  expiration: number;
}
