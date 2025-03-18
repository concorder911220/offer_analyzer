import axios from "axios";
import { cpvCodeValues } from "./constant/cpvcode_values.js";
import cron from "node-cron";
import fs from "fs";
import { DateTime } from "luxon";
import { cleanHtml } from "./utils/cleanHtml.js";
import { saveToGoogleSheet } from "./utils/googleSheetFunc.js";

const API_URL = "https://ezamowienia.gov.pl/mo-board/api/v1/notice";
const LAST_CHECKED_FILE = "last_checked.txt";

const CPV_CODES = cpvCodeValues;

function getPolandTime(date) {
  return DateTime.fromISO(date, { zone: "Europe/Warsaw" }).toISO();
}

function getLastCheckedTime() {
  if (fs.existsSync(LAST_CHECKED_FILE)) {
    return fs.readFileSync(LAST_CHECKED_FILE, "utf8").trim();
  }
  return getPolandTime(DateTime.now().minus({ hours: 1 }).toISO());
}

function updateLastCheckedTime(time) {
  const now = time;
  fs.writeFileSync(LAST_CHECKED_FILE, now);
}

async function fetchNotices() {
  const from = getLastCheckedTime();
  const to = getPolandTime(DateTime.now().toISO());
  const notices = [];

  for (const cpvCode of CPV_CODES) {
    try {
      console.log(
        `📡 Fetching notices for CPV Code: ${cpvCode} (${from} to ${to})`
      );
      const response = await axios.get(API_URL, {
        params: {
          NoticeType: "ContractNotice",
          CpvCode: cpvCode,
          PublicationDateFrom: from,
          PublicationDateTo: to,
          PageSize: 100,
        },
      });

      updateLastCheckedTime(to);

      if (response.data && response.data.length > 0) {
        response.data.forEach((item) => {
          notices.push([
            item.clientType,
            item.orderType,
            item.tenderType,
            item.noticeType,
            item.noticeNumber,
            item.bzpNumber,
            item.isTenderAmountBelowEU,
            item.publicationDate,
            item.orderObject,
            item.cpvCode,
            item.submittingOffersDate,
            item.procedureResult,
            item.organizationName,
            item.organizationCity,
            item.organizationProvince,
            item.organizationCountry,
            item.organizationNationalId,
            item.organizationId,
            item.tenderId,
            cleanHtml(item.htmlBody),
            item.contractors,
            item.objectId,
          ]);
        });
      }
    } catch (error) {
      console.error(`❌ Error fetching CPV Code ${cpvCode}:`, error.message);
    }
  }

  if (notices.length > 0) {
    await saveToGoogleSheet(notices);
  } else {
    console.log("⚠️ No new notices found.");
  }
}

(async () => {
  console.log("🚀 Running initial email check...");
  await fetchNotices();
})();

// Then schedule it to run every hour
cron.schedule("0 * * * *", async () => {
  console.log("⏳ Checking for new emails...");
  await fetchNotices();
});
