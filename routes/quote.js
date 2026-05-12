const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../data/db');
const emailService = require('../services/email');
const notionService = require('../services/notion');
const slackService = require('../services/slack');
const lineService = require('../services/lineoa');
const gsService = require('../services/googlesheet');

// Pricing matrix (USD per kg base, then convert to THB ~36)
const RATES = {
  sea:   { base: 0.8,  min: 500,  transit: '15-30 วัน' },
  air:   { base: 6.5,  min: 1500, transit: '3-7 วัน' },
  express: { base: 12, min: 2500, transit: '1-3 วัน' },
  road:  { base: 1.2,  min: 800,  transit: '5-14 วัน' },
};

const ZONE_MULTIPLIER = {
  'ASEAN':  1.0, 'China': 1.1, 'Japan': 1.2, 'Korea': 1.2,
  'Europe': 1.8, 'USA':   2.0, 'Australia': 1.9, 'Middle East': 1.6,
  'India':  1.3, 'Africa': 2.2, 'Other': 1.5,
};

function getZone(destination) {
  const d = destination.toLowerCase();
  if (['vietnam','myanmar','laos','cambodia','malaysia','singapore','indonesia','philippines','brunei'].some(c => d.includes(c))) return 'ASEAN';
  if (d.includes('china') || d.includes('hong kong') || d.includes('taiwan')) return 'China';
  if (d.includes('japan')) return 'Japan';
  if (d.includes('korea')) return 'Korea';
  if (d.includes('india')) return 'India';
  if (['germany','france','uk','italy','spain','netherlands','switzerland'].some(c => d.includes(c))) return 'Europe';
  if (['usa','united states','america','canada'].some(c => d.includes(c))) return 'USA';
  if (d.includes('australia') || d.includes('new zealand')) return 'Australia';
  if (['uae','dubai','saudi','qatar','kuwait'].some(c => d.includes(c))) return 'Middle East';
  return 'Other';
}

function calculateCost(weight, method, destination) {
  const rate = RATES[method] || RATES.sea;
  const zone = getZone(destination);
  const multiplier = ZONE_MULTIPLIER[zone] || 1.5;
  const rawCost = weight * rate.base * multiplier * 36; // THB
  return Math.max(Math.round(rawCost / 100) * 100, rate.min);
}

router.post('/calculate', async (req, res) => {
  try {
    const { origin, destination, weight, cargoType, shippingMethod, dimensions } = req.body;
    if (!origin || !destination || !weight || !shippingMethod) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const cost = calculateCost(parseFloat(weight), shippingMethod, destination);
    const rate = RATES[shippingMethod] || RATES.sea;

    res.json({
      success: true,
      quote: {
        origin, destination, weight: parseFloat(weight),
        cargoType, shippingMethod, dimensions,
        totalCost: cost,
        transitTime: rate.transit,
        zone: getZone(destination),
        breakdown: {
          baseRate: `${(cost * 0.7).toFixed(0)} THB`,
          fuel: `${(cost * 0.15).toFixed(0)} THB`,
          handling: `${(cost * 0.10).toFixed(0)} THB`,
          insurance: `${(cost * 0.05).toFixed(0)} THB`,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/request', async (req, res) => {
  try {
    const { name, email, phone, origin, destination, weight, cargoType, shippingMethod, dimensions, notes } = req.body;
    if (!name || !email || !origin || !destination || !weight) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const totalCost = calculateCost(parseFloat(weight), shippingMethod || 'sea', destination);
    const rate = RATES[shippingMethod] || RATES.sea;
    const quote = {
      id: uuidv4(), name, email, phone, origin, destination,
      weight: parseFloat(weight), cargoType, shippingMethod, dimensions,
      notes, totalCost, transitTime: rate.transit,
      createdAt: new Date().toISOString(), status: 'new',
    };

    db.addQuote(quote);

    await Promise.allSettled([
      emailService.sendQuoteEmail(quote),
      notionService.addQuoteToNotion(quote),
      slackService.newQuoteAlert(quote),
      lineService.notifyQuote(quote),
      gsService.logQuote(quote),
    ]);

    res.json({ success: true, message: 'ส่งใบเสนอราคาทางอีเมลแล้ว', quote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
