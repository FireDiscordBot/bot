import * as express from "express";
import * as centra from "centra";

let avatar: Buffer = undefined;

export async function avatarRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;

  if (!avatar) {
    const avReq = await centra(
      client.user.displayAvatarURL({ size: 4096, format: "png" })
    ).send();
    avatar = avReq.body;
  }

  res.contentType("image/png").status(200).send(avatar);
}
