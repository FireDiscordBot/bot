import { ArgumentTypeCaster } from "discord-akairo";

const codeblockRegex =
  /(?:```(?<language>[A-Za-z0-9\\-\\.]*)\n)(?<content>[\s\S]+)(?:```)/im;

export interface Codeblock {
  language?: string;
  content: string;
}

export const getCodeblockMatch = (argument: string): Codeblock => {
  const match = codeblockRegex.exec(argument);
  const groups = match?.groups;
  if (groups) {
    const { language, content } = groups;
    if (content && language) return { language, content };
    else if (content) return { content };
  } else return { content: argument };
};

export const codeblockTypeCaster: ArgumentTypeCaster = (
  message,
  phrase
): Codeblock => {
  const match = getCodeblockMatch(phrase);
  if (match) return match;
  else return null;
};
