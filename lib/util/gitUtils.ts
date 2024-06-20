import { exec } from "child_process";
import { readFileSync } from "fs";

export const getCommitHash = () => {
  try {
    return readFileSync(
      __dirname.includes("/dist/") || __dirname.includes("\\dist\\")
        ? "dist/commit.txt"
        : "commit.txt"
    )
      .toString()
      .trim();
  } catch (e) {
    // can be incorrect if we're not on the latest commit
    // (e.g. if a deploy was reverted temporarily)
    // but at least we'll have something
    const rev = readFileSync(".git/HEAD")
      .toString()
      .trim()
      .split(/.*[: ]/)
      .slice(-1)[0];
    if (rev.indexOf("/") == -1) return rev;
    else
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
