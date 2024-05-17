import { Fire } from "@fire/lib/Fire";
import { AkairoHandler, AkairoModule } from "discord-akairo";

export class Module extends AkairoModule {
  declare client: Fire;
  // This'll be somewhat of a replacement for cogs
  // but without the commands
  constructor(id: string) {
    super(id, {});
  }

  async init(): Promise<any> {}

  async unload(): Promise<any> {}
}

export class ModuleHandler extends AkairoHandler {
  constructor(
    client: Fire,
    {
      directory = "./src/modules",
      classToHandle = Module,
      extensions = [".js", ".ts"],
      automateCategories = false,
      loadFilter = () => true,
    }
  ) {
    super(client, {
      directory,
      classToHandle,
      extensions,
      automateCategories,
      loadFilter,
    });
  }
}
