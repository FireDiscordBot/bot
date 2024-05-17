import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import * as centra from "centra";
import { ArgumentTypeCaster } from "discord-akairo";

const {
  regexes: { haste },
  url: { supportedHaste },
} = constants;

export const hasteTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<string> => {
  const match = haste.exec(phrase);
  haste.lastIndex = 0;
  const uploader = match?.groups?.uploader;
  const key = match?.groups?.key;
  if (!uploader) {
    await message.error("HASTE_INVALID_DOMAIN", {
      supported: supportedHaste.join(", "),
    });
    return null;
  } else if (!key) {
    await message.error("HASTE_INVALID_URL");
  }

  if (uploader == "h.inv.wtf" && !message.author.isSuperuser()) {
    await message.error("HASTE_INVALID_DOMAIN", {
      supported: supportedHaste.join(", "),
    });
    return null;
  }

  const hasteReq = await centra(`https://${uploader}/raw/${key}`)
    .header("User-Agent", message.client.manager.ua)
    .send()
    .catch(() => {});
  if (!hasteReq || hasteReq.statusCode != 200) {
    await message.error("HASTE_FETCH_FAILED");
    return null;
  } else {
    const content = hasteReq.body?.toString();
    if (!content) {
      await message.error("HASTE_FETCH_FAILED");
      return null;
    } else return content;
  }
};
