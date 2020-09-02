import { Command as AkairoCommand, CommandOptions } from "discord-akairo";
import { Fire } from "../Fire";

export class Command extends AkairoCommand {
    client: Fire
    constructor(id: string, options?: CommandOptions) {
        super(id, options)
    }

    async init() {
        
    }
}