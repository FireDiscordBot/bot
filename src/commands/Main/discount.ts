import { fire } from "@fire/config/fire";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";

export default class Discount extends Command {
  constructor() {
    super("discount", {
      description: (language: Language) =>
        language.get("DISCOUNT_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      slashOnly: true,
      ephemeral: true,
      guilds: [fire.fireGuildId],
    });
  }

  async exec(message: FireMessage) {
    if (message.author.settings.has("premium.coupon"))
      return await message.error("DISCOUNT_ALREADY_CLAIMED");
    const coupon = this.client.util.getSpecialCouponEligibility(message.member);
    if (!coupon) return await message.error("DISCOUNT_INELIGIBLE");

    const created = await this.client.util
      .createSpecialCoupon(message.member)
      .catch(() => {});
    if (!created || !created.success) {
      return await message.error(
        created && created.success == false && created.reason
          ? created.reason
          : "COMMAND_ERROR_500",
        {
          status: constants.url.fireStatus,
        }
      );
    } else return await message.success("DISCOUNT_CREATED", created);
  }
}
