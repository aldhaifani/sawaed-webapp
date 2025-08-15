import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";
import { type RandomReader, generateRandomString } from "@oslojs/crypto/random";

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
      const { error } = await resend.emails.send({
        from: "Sawaed <verify@sawaed.tareq.pro>",
        to: [email],
        subject: `Sign in to Sawaed:  ` + token,
        text: "Your code is " + token,
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
