import * as centra from "centra";
import { randomInt } from "crypto";
import { RedditPost } from "../interfaces/reddit";

/* API */

/**
 * Returns a random post/meme from a subreddit.
 * @param subreddit Optional The subreddit string, defaults to a random english meme subreddit.
 * @returns {RedditPost}
 */
export async function getRandomPost(
  subreddit?: string
): Promise<RedditPost | undefined> {
  const url = `https://www.reddit.com/r/${
    subreddit ? subreddit : randomSubreddit()
  }/hot/.json?count=100`;

  return await buildPost(url);
}

export async function getRandomPostLanguage(
  lang: "en" | "es" | "de" | "fr" | "it" | "ru" | "tr" | "br" | "it"
): Promise<RedditPost | undefined> {
  const url = `https://www.reddit.com/r/${randomSubreddit(
    lang
  )}/hot/.json?count=100`;

  return await buildPost(url);
}

/* Utils */

// more languages coming soontm
const randomSubreddits = {
  br: ["MemesBrasil", "eu_nvr", "DiretoDoZapZap"],
  de: ["GermanMemes"],
  en: ["memes", "dankmemes", "meirl"],
  es: ["memesesp", "memesenespanol", "spanishmeme"],
  fr: ["FrenchMemes"],
  in: ["IndianDankMemes", "IndianMeyMeys", "desimemes"],
  it: ["italianmemes"],
  ru: ["CommunismMemes", "YouSeeComrade"],
  tr: ["burdurland", "TurkeyJerky", "TurkishMemeCommunity"],
};

/**
 * Gets a random subreddit from the list of available meme subreddits.
 * @returns {string} The random subreddit string.
 */
function randomSubreddit(lang?: string | string[]): string {
  lang &&= lang.toString().toLowerCase();
  if (!randomSubreddits.hasOwnProperty(lang)) lang = "en";
  return randomSubreddits[lang][randomInt(randomSubreddits[lang].length)];
}

export function checkURL(url: string): boolean {
  return /\.(jpeg|jpg|gif|png)$/.test(url);
}

export async function buildPost(url: string): Promise<RedditPost | undefined> {
  try {
    const response = await (
      await centra(url, "GET")
        .header("User-Agent", this.client.manager.ua)
        .send()
    ).json();

    const children = response.data.children;
    let post = children[randomInt(children.length)].data;
    let trys = 0;

    let validPost = false;

    while (!validPost) {
      post = children[randomInt(children.length)].data;
      if (trys >= 50) {
        console.error(`Could not find an image post from ${url}`);
        throw new Error(`Could not find an image post from ${url}`);
      }
      trys++;
      validPost = checkURL(post.url);
    }

    return new RedditPost(post);
  } catch (err) {
    console.error(`Could not find a post from ${url}`, err);
    throw new Error(`Could not find a post from ${url}: ${err}`);
  }
}
