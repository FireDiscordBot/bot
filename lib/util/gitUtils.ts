import { exec } from "child_process";
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

export const getBranch = () =>
  new Promise((resolve, reject) => {
    exec("git rev-parse --abbrev-ref HEAD", {}, (except, out, err) => {
      if (except) reject(except);
      else resolve(out.toString().trim());
    });
  }) as Promise<string>;
