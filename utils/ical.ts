export const generateICS = (
  events: { title: string; date: string; subject: string; id: string }[],
  calendarName: string
): string => {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GradeTracker Pro//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Zurich',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
  ];

  events.forEach(event => {
    // Format date: YYYYMMDD
    const dateStr = event.date.replace(/-/g, '');
    
    // Create all-day event
    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:${event.id}@gradetracker`);
    icsContent.push(`DTSTAMP:${now}`);
    icsContent.push(`DTSTART;VALUE=DATE:${dateStr}`);
    icsContent.push(`SUMMARY:${event.subject}: ${event.title}`);
    icsContent.push(`DESCRIPTION:Prüfung in ${event.subject}`);
    icsContent.push('TRANSP:TRANSPARENT'); // Show as free, not busy (usually better for all day reminders)
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');

  return icsContent.join('\r\n');
};