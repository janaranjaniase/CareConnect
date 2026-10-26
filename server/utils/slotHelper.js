function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(mins) {
  const hours = Math.floor(mins / 60).toString().padStart(2, '0');
  const minutes = (mins % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function generateSlots(startTime, endTime, slotDurationMinutes) {
  const slots = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  while (current + slotDurationMinutes <= end) {
    slots.push(minutesToTime(current));
    current += slotDurationMinutes;
  }

  return slots;
}

module.exports = { generateSlots, timeToMinutes, minutesToTime };