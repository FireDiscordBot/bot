import { execSync } from "child_process";
import { readFileSync } from "fs";

export const getCommitHash = () => {
  const rev = readFileSync(".git/HEAD")
    .toString()
    .trim()
    .split(/.*[: ]/)
    .slice(-1)[0];
  if (rev.indexOf("/") == -1) {
    return rev;
  } else {
    return readFileSync(".git/" + rev)
      .toString()
      .trim();
  }
};

export const getBranch = () => {
  return execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
};
