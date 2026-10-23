import { config } from "../config.js";

export function isSmsConfigured() {
  return Boolean(config.twilioAccountSid && config.twilioAuthToken && config.twilioFromNumber);
}

export async function sendSms(to, body) {
  if (!isSmsConfigured()) {
    return { sent: false, reason: "SMS provider is not configured." };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.twilioAccountSid)}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: config.twilioFromNumber, Body: body });
  const authorization = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64");
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form
    });
  } catch (error) {
    console.error("Unable to reach the SMS provider:", error.message);
    return { sent: false, reason: "Unable to reach the SMS provider." };
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error(`SMS provider returned ${response.status}: ${detail}`);
    return { sent: false, reason: "SMS provider rejected the message." };
  }
  return { sent: true };
}

export async function broadcastSms(recipients, message) {
  if (!isSmsConfigured()) {
    return { sent: false, delivered: 0, reason: "SMS provider is not configured." };
  }
  const results = await Promise.allSettled(recipients.map((recipient) => sendSms(recipient, message)));
  const delivered = results.filter((result) => result.status === "fulfilled" && result.value.sent).length;
  const failed = results.length - delivered;
  return {
    sent: failed === 0 && delivered > 0,
    delivered,
    reason: failed ? `${failed} of ${results.length} SMS message(s) could not be delivered.` : delivered ? undefined : "There are no resident phone numbers to notify."
  };
}
