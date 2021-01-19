import { readFileSync } from "fs";

let currentHash: string;

export const getCommitHash = () => {
  if (currentHash) return currentHash;
  const rev = readFileSync(".git/HEAD")
    .toString()
    .trim()
    .split(/.*[: ]/)
    .slice(-1)[0];
  if (rev.indexOf("/") == -1) {
    currentHash = rev;
    return currentHash;
  } else {
    currentHash = readFileSync(".git/" + rev)
      .toString()
      .trim();
    return currentHash;
  }
};
