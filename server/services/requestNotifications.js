import { ServiceRequest } from "../models/ServiceRequest.js";
import { sendSms } from "./sms.js";
import { formatDateKey, formatTime24Hour } from "../utils/dateTime.js";

const pollIntervalMs = 30_000;
const retryDelayMs = 5 * 60_000;
const claimTimeoutMs = 10 * 60_000;

async function sendDueRequestNotifications() {
  const now = new Date();
  const retryExpiredAt = new Date(now.getTime() - claimTimeoutMs);
  let processed = 0;

  while (processed < 50) {
    const serviceRequest = await ServiceRequest.findOneAndUpdate(
      {
        status: "approved",
        scheduledAt: { $lte: now },
        $or: [
          {
            scheduledSmsStatus: "pending",
            $or: [
              { scheduledSmsNextAttemptAt: null },
              { scheduledSmsNextAttemptAt: { $lte: now } }
            ]
          },
          {
            scheduledSmsStatus: "sending",
            scheduledSmsClaimedAt: { $lte: retryExpiredAt }
          }
        ]
      },
      { $set: { scheduledSmsStatus: "sending", scheduledSmsClaimedAt: now } },
      { new: true }
    ).populate("resident", "phone");

    if (!serviceRequest) return;
    processed += 1;

    const retryAt = new Date(Date.now() + retryDelayMs);
    try {
      const notification = await sendSms(
        serviceRequest.resident.phone,
        `GreenLoop reminder: your community collection is scheduled for now. Estimated collection time: ${formatDateKey(serviceRequest.scheduledDate.toISOString().slice(0, 10))} at ${formatTime24Hour(serviceRequest.scheduledTime)} Philippines time.`
      );
      if (!notification.sent) {
        await ServiceRequest.updateOne(
          { _id: serviceRequest._id, scheduledSmsStatus: "sending", scheduledSmsClaimedAt: now },
          {
            $set: {
              scheduledSmsStatus: "pending",
              scheduledSmsClaimedAt: null,
              scheduledSmsNextAttemptAt: retryAt
            }
          }
        );
        console.error(`Unable to queue scheduled request SMS for ${serviceRequest._id}: ${notification.reason}`);
        continue;
      }

      await ServiceRequest.updateOne(
        { _id: serviceRequest._id, scheduledSmsStatus: "sending", scheduledSmsClaimedAt: now },
        {
          $set: {
            scheduledSmsStatus: "sent",
            scheduledSmsClaimedAt: null,
            scheduledSmsNextAttemptAt: null,
            scheduledSmsSentAt: new Date()
          }
        }
      );
      console.log(`Scheduled request SMS queued for ${serviceRequest._id}.`);
    } catch (error) {
      await ServiceRequest.updateOne(
        { _id: serviceRequest._id, scheduledSmsStatus: "sending", scheduledSmsClaimedAt: now },
        {
          $set: {
            scheduledSmsStatus: "pending",
            scheduledSmsClaimedAt: null,
            scheduledSmsNextAttemptAt: retryAt
          }
        }
      );
      console.error(`Unable to send scheduled request SMS for ${serviceRequest._id}:`, error);
    }
  }
}

export function startScheduledRequestNotifications() {
  let running = false;
  const processNotifications = async () => {
    if (running) return;
    running = true;
    try {
      await sendDueRequestNotifications();
    } catch (error) {
      console.error("Unable to process scheduled request SMS notifications:", error);
    } finally {
      running = false;
    }
  };

  void processNotifications();
  const timer = setInterval(processNotifications, pollIntervalMs);
  timer.unref();
}
