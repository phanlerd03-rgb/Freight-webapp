require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

const quoteRoutes = require('./routes/quote');
const bookingRoutes = require('./routes/booking');
const trackingRoutes = require('./routes/tracking');
const webhookRoutes = require('./routes/webhook');
const chatRoutes = require('./routes/chat');
const blogRoutes = require('./routes/blog');
const cronRoutes = require('./routes/cron');
const productsRoutes = require('./routes/products');

app.use('/api/quote', quoteRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/products', productsRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚢 Freight Webapp running at http://localhost:${PORT}\n`);
});
