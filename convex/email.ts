import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";
import { ActionCtx } from "./_generated/server";
import { render } from "@react-email/render";
import { ResetPasswordEmail } from "./emails/resetPassword";
import { InvitationEmail } from "./emails/invitation";

export const resend = new Resend(components.resend, {
  testMode: false,
});

const emailFrom = process.env.EMAIL_FROM || "noreply@example.com";

/**
 * Wysyła email z linkiem do resetu hasła.
 */
export async function sendResetPassword(
  ctx: ActionCtx,
  { to, url }: { to: string; url: string }
) {
  const html = await render(ResetPasswordEmail({ resetUrl: url }));

  await resend.sendEmail(ctx, {
    from: emailFrom,
    to,
    subject: "Zresetuj swoje hasło",
    html,
  });
}

/**
 * Wysyła email z zaproszeniem do systemu.
 */
export async function sendInvitationEmail(
  ctx: ActionCtx,
  { to, url }: { to: string; url: string }
) {
  const html = await render(InvitationEmail({ resetUrl: url }));

  await resend.sendEmail(ctx, {
    from: emailFrom,
    to,
    subject: "Zaproszenie do systemu",
    html,
  });
}

/**
 * Usuwa wszystkie sesje użytkownika (dla bezpieczeństwa po resecie hasła).
 */
export async function revokeUserSessions(
  ctx: ActionCtx,
  { authUserId }: { authUserId: string }
) {
  await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
    input: {
      model: "session",
      where: [{ field: "userId", value: authUserId }],
    },
    paginationOpts: { cursor: null, numItems: 1000 },
  });
}
