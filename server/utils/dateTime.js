export function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function currentManilaDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Manila"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatTime24Hour(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)));
}

export function manilaDateTime(dateKey, time) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours - 8, minutes));
}
