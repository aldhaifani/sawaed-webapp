import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";
import { type RandomReader, generateRandomString } from "@oslojs/crypto/random";

function getResetEmailHtml(token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sawaed - Reset Code</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f5;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:4px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding:20px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle" style="vertical-align:middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-right:12px;">
                            <img src="https://gpblxmzz9euulggl.public.blob.vercel-storage.com/logo.png" width="40" height="40" alt="Sawaed Logo" style="display:block;width:40px;height:40px;" />
                          </td>
                          <td>
                            <h1 style="margin:0;font-size:24px;font-weight:600;color:#1a1a1a;">Sawaed</h1>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px 12px 24px;text-align:center;">
                <h2 style="margin:0 0 10px 0;font-size:28px;font-weight:700;color:#1a1a1a;line-height:1.3;">Reset your password</h2>
                <p style="margin:0 0 16px 0;font-size:16px;color:#333333;">Hello,</p>
                <p style="margin:0 auto 24px auto;font-size:15px;color:#666666;max-width:480px;">Use the following code to reset your password:</p>
                <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto 0 auto;">
                  <tr>
                    <td style="background:#FEF3C7;border:2px solid #F59E0B;border-radius:12px;padding:20px 24px;">
                      <div style="font-size:32px;font-weight:700;color:#92400E;letter-spacing:4px;margin:0 0 6px 0;font-family:'Courier New',monospace;text-align:center;">${token}</div>
                      <div style="font-size:13px;color:#92400E;text-align:center;margin:0;">Code expires in 15 minutes</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px auto 0 auto;font-size:14px;color:#666666;max-width:450px;">If you did not request a password reset, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export const ResendOTPPasswordReset = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    const length = 6; // keep consistent with login verification UX
    return generateRandomString(random, alphabet, length);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) {
      console.error(
        "ResendOTPPasswordReset: Missing AUTH_RESEND_KEY in Convex environment.",
      );
      throw new Error(
        "Resend API key is not configured. Set AUTH_RESEND_KEY in your Convex environment.",
      );
    }
    try {
      const resend = new ResendAPI(provider.apiKey);
      const subject = "Reset your Sawaed password";
      const html = getResetEmailHtml(token);
      const text = `Your Sawaed password reset code is ${token}. It expires in 15 minutes.`;
      const { error } = await resend.emails.send({
        from: "Sawaed <verify@sawaed.tareq.pro>",
        to: [email],
        subject,
        text,
        html,
      });
      if (error) {
        console.error("ResendOTPPasswordReset: Resend returned an error", {
          code: (error as any).name,
          message: (error as any).message,
        });
        throw new Error(JSON.stringify(error));
      }
    } catch (err) {
      console.error("ResendOTPPasswordReset: Failed to send reset email", {
        to: email,
        err: String(err),
      });
      throw err;
    }
  },
});
