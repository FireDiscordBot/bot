import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { constants, CouponType } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";

export default class Discount extends Command {
  constructor() {
    super("discount", {
      description: (language: Language) =>
        language.get("DISCOUNT_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      slashOnly: true,
      ephemeral: true,
      requiresExperiment: { id: 1684718660, bucket: 1 },
    });
  }

  async exec(message: FireMessage) {
    if (message.author.settings.has("premium.coupon"))
      return await message.error("DISCOUNT_ALREADY_CLAIMED");
    let coupon: CouponType;
    const roles = message.member.roles.cache;
    if (roles.has("620512846232551427") && roles.has("745392985151111338"))
      coupon = CouponType.BOOSTER_AND_SUB;
    else if (roles.has("620512846232551427")) coupon = CouponType.BOOSTER;
    else if (roles.has("745392985151111338")) coupon = CouponType.TWITCHSUB;

    if (!coupon) return await message.error("DISCOUNT_INELIGIBLE");
    const storedCoupon = await message.author.settings.set(
      "premium.coupon",
      coupon
    );
    if (!storedCoupon)
      return await message.error("COMMAND_ERROR_500", {
        status: constants.url.fireStatus,
      });

    const created = await this.client.util
      .createSpecialCoupon(message.member, coupon)
      .catch(() => {});
    if (!created || !created.success) {
      const removedStoredCoupon = await message.author.settings.delete(
        "premium.coupon"
      );
      return await message.error(
        created && created.success == false && removedStoredCoupon
          ? created.reason
          : "COMMAND_ERROR_500",
        {
          status: constants.url.fireStatus,
        }
      );
    } else return await message.success("DISCOUNT_CREATED", created);
  }
}
