// Calendar interop: build .ics files (Apple Calendar, Outlook, etc.) and a
// Google Calendar "add event" link. No OAuth needed — works everywhere.

function pad(n) { return String(n).padStart(2, '0'); }

// Format a Date as UTC iCal stamp: 20260618T143000Z
function toICSDate(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeText(s = '') {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function eventTimes(event) {
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60 * 1000); // default 1h
  return { start, end };
}

export function toICS(event) {
  const { start, end } = eventTimes(event);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spark//Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@spark`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : '',
    event.notes ? `DESCRIPTION:${escapeText(event.notes)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

// Download an .ics file (Apple Calendar / Outlook import it directly).
export function downloadICS(event) {
  const blob = new Blob([toICS(event)], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(event.title || 'event').replace(/[^a-z0-9]+/gi, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// One-click "Add to Google Calendar" link.
export function googleCalUrl(event) {
  const { start, end } = eventTimes(event);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Event',
    dates: `${toICSDate(start)}/${toICSDate(end)}`,
    details: event.notes || '',
    location: event.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
