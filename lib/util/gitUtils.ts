// import { promises as fs } from 'fs';

// export const getCommitHash = async () => {
//   const gitId = await fs.readFile('.git/HEAD', 'utf8');
//   if (gitId.indexOf(':') === -1) {
//     return gitId;
//   }
//   const refPath = '.git/' + gitId.substring(5).trim();
//   return await fs.readFile(refPath, 'utf8');
// };

import { readFileSync } from "fs";

let currentHash: string;

export const getCommitHash = () => {
  if (currentHash) return currentHash;
  const rev = readFileSync(".git/HEAD")
    .toString()
    .trim()
    .split(/.*[: ]/)
    .slice(-1)[0];
  if (rev.indexOf("/") === -1) {
    currentHash = rev;
    return currentHash;
  } else {
    currentHash = readFileSync(".git/" + rev)
      .toString()
      .trim();
    return currentHash;
  }
};
