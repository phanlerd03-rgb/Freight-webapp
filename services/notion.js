const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function addBookingToNotion(booking) {
  if (!process.env.NOTION_BOOKINGS_DB) return null;
  try {
    return await notion.pages.create({
      parent: { database_id: process.env.NOTION_BOOKINGS_DB },
      properties: {
        'Tracking Number': { title: [{ text: { content: booking.trackingNumber } }] },
        'Customer Name':   { rich_text: [{ text: { content: booking.senderName } }] },
        'Email':           { email: booking.senderEmail },
        'Phone':           { phone_number: booking.senderPhone || '' },
        'Origin':          { rich_text: [{ text: { content: booking.origin } }] },
        'Destination':     { rich_text: [{ text: { content: booking.destination } }] },
        'Cargo Type':      { select: { name: booking.cargoType } },
        'Weight (kg)':     { number: parseFloat(booking.weight) || 0 },
        'Shipping Method': { select: { name: booking.shippingMethod } },
        'Est. Cost (THB)': { number: booking.estimatedCost || 0 },
        'Status':          { status: { name: 'รอดำเนินการ' } },
        'Created At':      { date: { start: new Date().toISOString() } },
        'Notes':           { rich_text: [{ text: { content: booking.notes || '' } }] },
      },
    });
  } catch (err) {
    console.error('Notion booking error:', err.message);
    return null;
  }
}

async function addQuoteToNotion(quote) {
  if (!process.env.NOTION_QUOTES_DB) return null;
  try {
    return await notion.pages.create({
      parent: { database_id: process.env.NOTION_QUOTES_DB },
      properties: {
        'Name':            { title: [{ text: { content: quote.name } }] },
        'Email':           { email: quote.email },
        'Phone':           { phone_number: quote.phone || '' },
        'Origin':          { rich_text: [{ text: { content: quote.origin } }] },
        'Destination':     { rich_text: [{ text: { content: quote.destination } }] },
        'Cargo Type':      { select: { name: quote.cargoType } },
        'Weight (kg)':     { number: parseFloat(quote.weight) || 0 },
        'Shipping Method': { select: { name: quote.shippingMethod } },
        'Quoted Price':    { number: quote.totalCost || 0 },
        'Status':          { select: { name: 'ใหม่' } },
        'Created At':      { date: { start: new Date().toISOString() } },
      },
    });
  } catch (err) {
    console.error('Notion quote error:', err.message);
    return null;
  }
}

async function updateBookingStatus(trackingNumber, status) {
  if (!process.env.NOTION_BOOKINGS_DB) return null;
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_BOOKINGS_DB,
      filter: { property: 'Tracking Number', title: { equals: trackingNumber } },
    });
    if (!response.results.length) return null;
    const pageId = response.results[0].id;
    return await notion.pages.update({
      page_id: pageId,
      properties: {
        'Status': { status: { name: status } },
        'Updated At': { date: { start: new Date().toISOString() } },
      },
    });
  } catch (err) {
    console.error('Notion update error:', err.message);
    return null;
  }
}

module.exports = { addBookingToNotion, addQuoteToNotion, updateBookingStatus };
