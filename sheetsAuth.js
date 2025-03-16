require('dotenv').config();
const { google } = require('googleapis');

// Authenticate with Google
const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_CLIENT_SECRET.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets.readonly']
);

const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = '1_ze9la_uzzaK4nWhTuGsm7LMQM4pVjEVu3wB_6njuyw';  // Replace with your actual Google Sheets ID
const SHEET_NAME = 'Sheet1'; // Replace with the correct sheet name

async function getFileLink(itemNumber) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:B`, // Assuming column A = Item Number, column B = File Link
    });

    const rows = res.data.values;
    if (!rows) {
      throw new Error("No data found in the sheet.");
    }

    for (let row of rows) {
      if (row[0] === itemNumber) {
        console.log("File found:", row[1]);
        return row[1]; // Google Drive link
      }
    }
    throw new Error("Item not found in the sheet.");
  } catch (error) {
    console.error("Error fetching file:", error);
  }
}

// Test with a sample item number
getFileLink("ITEM_1234");
