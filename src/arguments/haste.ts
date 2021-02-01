import { FireMessage } from "../../lib/extensions/message";
import { constants } from "../../lib/util/constants";
import { ArgumentTypeCaster } from "discord-akairo";
import * as centra from "centra";

const {
  regexes: { haste },
  url: { supportedHaste },
} = constants;

export const hasteTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<string> => {
  const match = phrase.match(haste);
  const domain = match.groups?.domain;
  const key = match.groups?.key;
  if (!domain) {
    await message.error("HASTE_INVALID_DOMAIN", supportedHaste.join(", "));
    return null;
  } else if (!key) {
    await message.error("HASTE_INVALID_URL");
  }

  if (domain == "h.inv.wtf" && !message.author.isSuperuser()) {
    await message.error("HASTE_INVALID_DOMAIN", supportedHaste.join(", "));
    return null;
  }

  const hasteReq = await centra(`https://${domain}/raw/${key}`)
    .header("User-Agent", "Fire Discord Bot")
    .send()
    .catch(() => {});
  if (!hasteReq || hasteReq.statusCode != 200) {
    await message.error("HASTE_FETCH_FAILED");
    return null;
  } else return hasteReq.body.toString();
};
