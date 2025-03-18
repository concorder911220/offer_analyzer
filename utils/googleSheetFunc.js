import { google } from "googleapis";
import { config } from "dotenv";
config();

const serviceAccountKeyFile = "./config/google_sheets_api_key.json";
const sheetId = process.env.SHEET_ID;
const tabName = process.env.SHEET_NAME;
const range = "A:V";

export async function saveToGoogleSheet(notices) {
  const googleSheetClient = await _getGoogleSheetClient();
  console.log(notices.length);

  await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, notices);
}

async function _getGoogleSheetClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountKeyFile,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const authClient = await auth.getClient();
  return google.sheets({
    version: "v4",
    auth: authClient,
  });
}

async function _writeGoogleSheet(
  googleSheetClient,
  sheetId,
  tabName,
  range,
  data
) {
  try {
    // Ensure all rows have exactly 9 columns
    const formattedData = data.map((row) => {
      while (row.length < 22) row.push(""); // Fill missing columns
      return row.slice(0, 22); // Trim excess columns
    });

    await googleSheetClient.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tabName}!A1`, // Start from column A
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      resource: { values: formattedData },
    });

    console.log("✅ Google Sheet updated successfully!");
  } catch (error) {
    console.error("❌ Error updating Google Sheet:", error.message);
  }
}
