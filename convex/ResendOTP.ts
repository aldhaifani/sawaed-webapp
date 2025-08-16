import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";
import { type RandomReader, generateRandomString } from "@oslojs/crypto/random";

function getOtpEmailHtml(token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sawaed - Confirmation Code</title>
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
                <h2 style="margin:0 0 10px 0;font-size:28px;font-weight:700;color:#1a1a1a;line-height:1.3;">Verify your email.</h2>
                <p style="margin:0 0 16px 0;font-size:16px;color:#333333;">Hello Dear,</p>
                <p style="margin:0 auto 24px auto;font-size:15px;color:#666666;max-width:480px;">Use the following code to sign in to your account:</p>
                <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto 0 auto;">
                  <tr>
                    <td style="background:#E0F2FE;background-image:linear-gradient(135deg,#E0F2FE 0%,#BAE6FD 100%);border:2px solid #0EA5E9;border-radius:12px;padding:20px 24px;">
                      <div style="font-size:32px;font-weight:700;color:#0369A1;letter-spacing:4px;margin:0 0 6px 0;font-family:'Courier New',monospace;text-align:center;">${token}</div>
                      <div style="font-size:13px;color:#0369A1;text-align:center;margin:0;">Code expires in 15 minutes</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px auto 0 auto;font-size:14px;color:#666666;max-width:450px;">Please enter this code in the login prompt to access your account. If you did not request this code or if you are not trying to access your account, please contact us immediately for support.</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#1a1a2e;padding:24px;text-align:center;border-bottom-left-radius:4px;border-bottom-right-radius:4px;">
                <table role="presentation" align="center" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;">
                      <img src="https://gpblxmzz9euulggl.public.blob.vercel-storage.com/logo.png" width="32" height="32" alt="Sawaed Logo" style="display:block;width:32px;height:32px;" />
                    </td>
                    <td>
                      <h3 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Sawaed</h3>
                    </td>
                  </tr>
                </table>
                <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:16px auto 0 auto;">
                  <tr>
                    <td><a href="#" style="display:inline-block;width:40px;height:40px;line-height:40px;background-color:rgba(255,255,255,0.1);border-radius:50%;text-decoration:none;color:#ffffff;font-size:18px;text-align:center;">f</a></td>
                    <td width="12"></td>
                    <td><a href="#" style="display:inline-block;width:40px;height:40px;line-height:40px;background-color:rgba(255,255,255,0.1);border-radius:50%;text-decoration:none;color:#ffffff;font-size:18px;text-align:center;">t</a></td>
                    <td width="12"></td>
                    <td><a href="#" style="display:inline-block;width:40px;height:40px;line-height:40px;background-color:rgba(255,255,255,0.1);border-radius:50%;text-decoration:none;color:#ffffff;font-size:18px;text-align:center;">in</a></td>
                    <td width="12"></td>
                    <td><a href="#" style="display:inline-block;width:40px;height:40px;line-height:40px;background-color:rgba(255,255,255,0.1);border-radius:50%;text-decoration:none;color:#ffffff;font-size:18px;text-align:center;">@</a></td>
                  </tr>
                </table>
                <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:16px auto 0 auto;">
                  <tr>
                    <td><a href="#" style="color:#cccccc;text-decoration:none;font-size:14px;">Privacy Policy</a></td>
                    <td width="16"></td>
                    <td><a href="#" style="color:#cccccc;text-decoration:none;font-size:14px;">Contact Us</a></td>
                    <td width="16"></td>
                    <td><a href="#" style="color:#cccccc;text-decoration:none;font-size:14px;">Unsubscribe</a></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export const ResendOTP = Email({
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
    const length = 6;
    return generateRandomString(random, alphabet, length);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) {
      // Avoid logging the actual key; only note that it's missing
      console.error(
        "ResendOTP: Missing AUTH_RESEND_KEY environment variable in Convex deployment.",
      );
      throw new Error(
        "Resend API key is not configured. Set AUTH_RESEND_KEY in your Convex deployment environment.",
      );
    }
    try {
      console.log("ResendOTP: Sending verification email", { to: email });
      const resend = new ResendAPI(provider.apiKey);
      const subject = "Verification Code " + token;
      const html = getOtpEmailHtml(token);
      const text = `Your Sawaed confirmation code is ${token}. It expires in 15 minutes.`;
      const { error } = await resend.emails.send({
        from: "Sawaed <verify@sawaed.tareq.pro>",
        to: [email],
        subject,
        text,
        html,
      });
      if (error) {
        console.error("ResendOTP: Resend returned an error", {
          code: (error as any).name,
          message: (error as any).message,
        });
        throw new Error(JSON.stringify(error));
      }
      console.log("ResendOTP: Email sent via Resend", { to: email });
    } catch (err) {
      console.error("ResendOTP: Failed to send verification email", {
        to: email,
        err: String(err),
      });
      throw err;
    }
  },
});
