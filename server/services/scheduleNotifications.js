import { Schedule } from "../models/Schedule.js";
import { User } from "../models/User.js";
import { broadcastSms } from "./sms.js";
import { formatDateKey, formatTime24Hour } from "../utils/dateTime.js";

const pollIntervalMs = 30_000;
const retryDelayMs = 5 * 60_000;
const claimTimeoutMs = 10 * 60_000;

async function sendDueScheduleNotifications() {
  const now = new Date();
  const retryExpiredAt = new Date(now.getTime() - claimTimeoutMs);
  let processed = 0;

  while (processed < 50) {
    const schedule = await Schedule.findOneAndUpdate(
      {
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
    );

    if (!schedule) return;
    processed += 1;

    const recipientFilter = {
      role: { $in: ["user", "resident"] },
      residencyId: schedule.residencyId
    };
    if (schedule.subdivisionId) recipientFilter.subdivisionId = schedule.subdivisionId;
    const retryAt = new Date(Date.now() + retryDelayMs);

    try {
      const residents = await User.find(recipientFilter).select("phone").lean();
      const notification = await broadcastSms(
        residents.map((resident) => resident.phone),
        `GreenLoop reminder: ${schedule.wasteType} collection in ${schedule.area} is scheduled for now. Estimated arrival time: ${formatDateKey(schedule.date.toISOString().slice(0, 10))} at ${formatTime24Hour(schedule.estimatedArrivalTime)} Philippines time.`
      );
      if (!notification.sent) {
        await Schedule.updateOne(
          { _id: schedule._id, scheduledSmsStatus: "sending", scheduledSmsClaimedAt: now },
          {
            $set: {
              scheduledSmsStatus: "pending",
              scheduledSmsClaimedAt: null,
              scheduledSmsNextAttemptAt: retryAt
            }
          }
        );
        console.error(`Unable to queue scheduled collection SMS for ${schedule._id}: ${notification.reason}`);
        continue;
      }

      await Schedule.updateOne(
        { _id: schedule._id, scheduledSmsStatus: "sending", scheduledSmsClaimedAt: now },
        {
          $set: {
            scheduledSmsStatus: "sent",
            scheduledSmsClaimedAt: null,
            scheduledSmsNextAttemptAt: null,
            scheduledSmsSentAt: new Date()
          }
        }
      );
      console.log(`Scheduled collection SMS queued for ${schedule._id}.`);
    } catch (error) {
      await Schedule.updateOne(
        { _id: schedule._id, scheduledSmsStatus: "sending", scheduledSmsClaimedAt: now },
        {
          $set: {
            scheduledSmsStatus: "pending",
            scheduledSmsClaimedAt: null,
            scheduledSmsNextAttemptAt: retryAt
          }
        }
      );
      console.error(`Unable to send scheduled collection SMS for ${schedule._id}:`, error);
    }
  }
}

export function startScheduledCollectionNotifications() {
  let running = false;
  const processNotifications = async () => {
    if (running) return;
    running = true;
    try {
      await sendDueScheduleNotifications();
    } catch (error) {
      console.error("Unable to process scheduled collection SMS notifications:", error);
    } finally {
      running = false;
    }
  };

  void processNotifications();
  const timer = setInterval(processNotifications, pollIntervalMs);
  timer.unref();
}
