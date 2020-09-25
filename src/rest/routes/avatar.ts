import { ErrorResponse, ResponseLocals } from "../interfaces";
import { sendError } from "../utils";
import * as express from "express";
import * as centra from "centra";

let avatar: Buffer;

export async function avatarRoute(req: express.Request, res: express.Response) {
  const locals: ResponseLocals = res.locals as ResponseLocals;
  try {
    if (!avatar) {
      const avReq = await centra(
        locals.client.user.displayAvatarURL({ size: 4096, format: "png" })
      ).send();
      avatar = avReq.body;
    }
    res.contentType("image/png").status(200).send(avatar);
  } catch (e) {
    const response: ErrorResponse = {
      success: false,
      error: e.message,
      code: 500,
    };
    sendError(res, response);
  }
}
