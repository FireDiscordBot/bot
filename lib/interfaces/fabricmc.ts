export interface FabricLoaderVersion {
  loader: Loader;
  mappings: Mappings;
}

export interface Loader {
  separator: string;
  build: number;
  maven: `net.fabricmc.loader:fabric-loader:${Loader["version"]}`;
  version: string;
  stable: boolean;
}

export interface Mappings {
  gameVersion: `${number}.${number}` | `${number}.${number}.${number}`;
  separator: string;
  build: number;
  maven: `net.fabricmc.loader:yarn:${Mappings["separator"]}${Mappings["build"]}`;
  version: `${Mappings["gameVersion"]}${Mappings["separator"]}${Mappings["build"]}`;
}
