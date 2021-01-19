export interface ModcoreProfile {
  _id: ID;
  uuid: string;
  online: boolean;
  status: string;
  purchase_profile?: { [key: string]: boolean };
  purchase_settings?: PurchaseSettings;
  cosmetic_settings?: CosmeticSettings;
  _class?: string;
  sideways?: boolean;
  instance: string;
}

export interface ID {
  $oid: string;
}

export interface CosmeticSettings {
  CUSTOM_CAPE_STATIC?: CustomCape;
  CUSTOM_CAPE_DYNAMIC?: CustomCape;
  JETPACK?: Jetpack;
  FEZ_HAT?: DefaultCosmetic;
  TOP_HAT?: DogFilter;
  AIRPODS?: DefaultCosmetic;
  LEGO_HAT?: DogFilter;
  DOG_BACKPACK?: DefaultCosmetic;
  ELEPHANT_BACKPACK?: DefaultCosmetic;
  GENERIC_BACKPACK?: DefaultCosmetic;
  DOG_FILTER?: DogFilter;
  TAN_BACKPACK?: DogFilter;
  COLONIST_HAT?: DefaultCosmetic;
  NITRO_CAPE?: NitroCape;
  CUSTOM_SKIN_STATIC?: CustomCape;
  WINGS?: Wings;
  SIDEWAYS?: DefaultCosmetic;
  ANGEL_WINGS?: DefaultCosmetic;
}

export interface DefaultCosmetic {
  enabled: boolean;
}

export interface CustomCape {
  id: string;
  enabled: boolean;
}

export interface DogFilter {
  xOffset: number;
  yOffset: number;
  zOffset: number;
  enabled: boolean;
}

export interface Jetpack {}

export interface NitroCape {
  dark: boolean;
  enabled: boolean;
}

export interface Wings {
  scale: number;
  red: number;
  green: number;
  blue: number;
  enabled: boolean;
}

export interface PurchaseSettings {
  CUSTOM_CAPE_STATIC: CustomCape;
}
