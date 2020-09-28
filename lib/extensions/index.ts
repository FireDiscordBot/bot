import { readdirSync } from "fs";

for (const file of readdirSync(__dirname)) require(`./${file}`);
