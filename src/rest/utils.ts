import { ErrorResponse, HtmlErrorResponse } from "./interfaces";
import { errorHtml } from "./static/error";
import * as express from "express";
import { Command } from "../../lib/util/command";

export function sendError(res: express.Response, error: ErrorResponse): void {
  res.status(error.code).json(error);
}

export function sendErrorHTML(
  res: express.Response,
  error: HtmlErrorResponse
): void {
  res.header("Content-Type", "text/html");
  let body = errorHtml;
  Object.entries(error.headers || {}).forEach((entry) => {
    res.header(entry[0], entry[1]);
  });
  const replacements = {
    "{API_PAGE_TITLE}": "Fire",
    "{API_TITLE}": "Fire",
    "{API_ERROR_TITLE}": error.title || "Internal Server Error",
    "{API_ERROR_TEXT}":
      error.text || "Something went wrong and an error wasn't provided.",
    "{API_REFERRAL}": error.referral || "https://fire.gaminggeek.dev/",
    "{API_BUTTON}": error.button || "Go back",
  };
  Object.entries(replacements).forEach((entry) => {
    body = body.replace(entry[0], entry[1]);
  });
  res.status(error.code).send(body);
}

export function getCommandArguments(command: Command): string[] {
  return typeof command.args !== "undefined" && Array.isArray(command.args)
    ? command.args
        .filter((argument) => argument.type !== "function")
        .map((argument) =>
          argument.required ? `[<${argument.type}>]` : `<${argument.type}>`
        )
    : [];
}
