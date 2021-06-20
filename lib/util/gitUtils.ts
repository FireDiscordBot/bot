import { execSync } from "child_process";
import { readFileSync } from "fs";

let currentHash: string, currentBranch: string;

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

export const getBranch = () => {
  if (currentBranch) return currentBranch;
  currentBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
  return currentBranch;
};
