import { config } from "../config.js";

export function isSmsConfigured() {
  return Boolean(config.textbeeApiKey);
}

async function sendSmsBatch(recipients, message) {
  if (!isSmsConfigured()) {
    return { sent: false, reason: "SMS provider is not configured." };
  }

  let response;
  try {
    response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
      method: "POST",
      headers: {
        "x-api-key": config.textbeeApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        recipients,
        ...(config.textbeeDeviceId ? { deviceId: config.textbeeDeviceId } : {})
      })
    });
  } catch (error) {
    console.error("Unable to reach the SMS provider:", error.message);
    return { sent: false, reason: "Unable to reach the SMS provider." };
  }

  if (!response.ok) {
    console.error(`TextBee returned HTTP ${response.status}.`);
    return { sent: false, reason: `TextBee rejected the message (HTTP ${response.status}).` };
  }

  return { sent: true };
}

export async function sendSms(to, message) {
  return sendSmsBatch([to], message);
}

export async function broadcastSms(recipients, message) {
  if (!recipients.length) {
    return { sent: false, queued: 0, reason: "There are no resident phone numbers to notify." };
  }

  const result = await sendSmsBatch(recipients, message);
  return {
    ...result,
    queued: result.sent ? recipients.length : 0
  };
}
