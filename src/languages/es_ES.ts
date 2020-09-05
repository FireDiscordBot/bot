import { Language } from "../../lib/util/language";
import { GuildMember } from "discord.js";
import { TextChannel } from "discord.js";

export default class extends Language {
  constructor() {
    super("es-ES", {
      language: {
        DEFAULT: (key: string) =>
          `${key} aún no se ha localizado para es-ES.`,
        USER_NOT_FOUND: "Usuario no encontrado :(",
        UNKNOWN_COMMAND: "Comando no encontrado",
        AT_COMMAND_DESCRIPTION:
          "comando que hace autotip bot pero no rn porque me prohibieron",
        AT_CHANNEL_NOT_FOUND: "INo se pudo encontrar el canal de autotip.",
        AT_NO_RESPONSE: "No obtuve respuesta :(",
        AUTODECANCER_COMMAND_DESCRIPTION: `Alternar cambiar el nombre de aquellos con nombres "cancerosos" (no ASCII)`,
        AUTODECANCER_ENABLED: `Autodecancer habilitado. ** Los nuevos ** usuarios con nombres "cancerosos" (no ASCII) serán renombrados`,
        AUTODECANCER_DISABLED: `Autodecancer desactivado. ** Los nuevos ** usuarios con nombres "cancerosos" (no ASCII) ya no serán renombrados`,
        AUTODEHOIST_COMMAND_DESCRIPTION: `TOggle cambiar el nombre de aquellos con nombres elevados`,
        AUTODEHOIST_ENABLED: `Autodescargador habilitado. Se cambiará el nombre de ** nuevos ** usuarios con nombres elevados`,
        AUTODEHOIST_DISABLED: `Autodescargador desactivado. ** Los nuevos ** usuarios con nombres elevados ya no serán renombrados`,
        AVATAR_COMMAND_DESCRIPTION: "Obtener el avatar de un usuario",
        BADNAME_COMMAND_DESCRIPTION:
          "Cambiar el nombre utilizado para el deshoist / decancer automático",
        BADNAME_NO_CHANGES: `No hice absolutamente nada porque eso ya está establecido como el "mal nombre"`,
        BADNAME_SET: (name: string) =>
        `He configurado el" nombre incorrecto "en ${name}. Esto ** no ** cambiará el nombre de los usuarios existentes`,
        BADNAME_RESET: `He restablecido el "mal nombre" a John Doe 0000 (siendo 0000 su discriminador).
Esto ** no ** cambiará el nombre de los usuarios existentes`,
        DEBUG_NO_COMMAND: "Debes proporcionar un comando válido para depurar",
        DEBUGGING_DEBUG: "El comando de depuración está funcionando",
        DEBUG_OWNER_ONLY: "Solo mi dueño puede usar este comando",
        DEBUG_PERMS_PASS: "No faltan permisos",
        DEBUG_PERMS_CHECKS_FAIL: "¡Falló la verificación de permisos!",
        DEBUG_PERMS_FAIL: (userMissing: string[], clientMissing: string[]) => {
          return {
            user: userMissing.length
              ? `Te falta el permiso${
                  userMissing.length > 1 ? "s" : ""
                } ${userMissing.join(", ")}`
              : null,
            client: clientMissing.length
              ? `Me falta el permiso${
                  clientMissing.length > 1 ? "s" : ""
                } ${clientMissing.join(", ")}`
              : null,
          };
        },
        DEBUG_COMMAND_DISABLE_BYPASS:
          "El comando está deshabilitado pero se le pasa por alto",
        DEBUG_COMMAND_DISABLED: "El comando está deshabilitado.",
        DEBUG_COMMAND_NOT_DISABLED: "El comando no está deshabilitado",
        DEBUG_MUTE_BYPASS: (channel: TextChannel, bypass: string[]) =>
          `Los siguientes usuarios / roles omitirán los silencios en ${channel}\n${bypass.join(
            ", "
          )}`,
        DEBUG_MUTE_NO_BYPASS: (channel: TextChannel) =>
          `Nadie puede omitir los silencios ${channel}`,
        DEBUG_NO_EMBEDS: "No puedo enviar incrustaciones",
        PING_COMMAND_DESCRIPTION: "Te muestra mi ping a los servidores de discord",
        PING_INITIAL_MESSAGE: "Haciendo ping...",
      },
      enabled: true,
    });
  }
}
