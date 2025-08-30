import axios from "axios";

const api = axios.create({
  baseURL: "https://sheetdb.io/api/v1/pzq4zwvekqhqp",
  headers: { "Content-Type": "application/json" },
});

const DOLLAR_PREFIX = true;

/**
 * Fetch a whole sheet (tab) by name, e.g. "AAPL"
 * Returns an array of row objects from SheetDB.
 */
export async function getSheetByName(sheetName) {
  const sheetParam = DOLLAR_PREFIX ? `$${sheetName}` : sheetName;
  const { data } = await api.get("/", { params: { sheet: sheetParam } });
  return data;
}

/**
 * Convenience: fetch many sheets in parallel (e.g. Magnificent 7).
 */
export async function getManySheets(sheetNames = []) {
  const results = await Promise.all(sheetNames.map(getSheetByName));
  return results;
}
