const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const init = { bookings: [], quotes: [], shipments: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
    return init;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  getAll: load,
  getBookings: () => load().bookings,
  getQuotes: () => load().quotes,

  addBooking(booking) {
    const db = load();
    db.bookings.unshift(booking);
    save(db);
    return booking;
  },

  addQuote(quote) {
    const db = load();
    db.quotes.unshift(quote);
    save(db);
    return quote;
  },

  findByTracking(trackingNumber) {
    const db = load();
    return db.bookings.find(b => b.trackingNumber === trackingNumber) || null;
  },

  updateStatus(trackingNumber, status, message) {
    const db = load();
    const idx = db.bookings.findIndex(b => b.trackingNumber === trackingNumber);
    if (idx === -1) return null;
    db.bookings[idx].status = status;
    db.bookings[idx].statusMessage = message || '';
    db.bookings[idx].updatedAt = new Date().toISOString();
    if (!db.bookings[idx].timeline) db.bookings[idx].timeline = [];
    db.bookings[idx].timeline.push({ status, message: message || '', timestamp: new Date().toISOString() });
    save(db);
    return db.bookings[idx];
  },
};
