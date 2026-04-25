// All dates stored in UTC in database
// Display format: DD-MM-YYYY HH:mm:ss (24hr) - converted to IST

const formatDateForDisplay = (date) => {
  if (!date) return null;
  const d = new Date(date);
  
  // Convert UTC to IST (UTC + 5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istDate = new Date(d.getTime() + istOffset);
  
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = istDate.getFullYear();
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  const seconds = String(istDate.getSeconds()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};

const getCurrentUTC = () => {
  return new Date().toISOString();
};

const parseDisplayDate = (dateStr) => {
  // Parse DD-MM-YYYY HH:mm:ss (IST) to UTC Date
  if (!dateStr) return null;
  const [datePart, timePart] = dateStr.split(' ');
  const [day, month, year] = datePart.split('-');
  const [hours, minutes, seconds] = (timePart || '00:00:00').split(':');
  
  // Create date in IST then convert to UTC
  const istDate = new Date(year, month - 1, day, hours, minutes, seconds);
  return new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
};

module.exports = {
  formatDateForDisplay,
  getCurrentUTC,
  parseDisplayDate
};
