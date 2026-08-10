const SHEET_ID = '1T6XxVZ3L6Wp0RmGe93ix931OaqVpBBklGRaI57TdTB4';
const SHEET_NAME = 'RM2026';

function getBalance(sheet) {
  return Number(sheet.getRange('F1002').getValue()) || 0;
}

function getLastRecordRow(sheet) {
  const values = sheet.getRange(1, 1, sheet.getMaxRows(), 5).getValues();
  for (let index = values.length - 1; index >= 1; index -= 1) {
    if (values[index].some((value) => value !== '' && value !== null)) return index + 1;
  }
  return 1;
}

function doGet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const balance = getBalance(sheet);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, balance: balance })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents || '{}');
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('RM2026 not found');
  if (data.action === 'delete') {
    const rowToDelete = Number(data.row);
    const lastRecordRow = getLastRecordRow(sheet);
    if (!Number.isInteger(rowToDelete) || rowToDelete < 2 || rowToDelete > lastRecordRow) throw new Error('Invalid record row');
    if (rowToDelete < lastRecordRow) {
      const rowsBelow = sheet.getRange(rowToDelete + 1, 1, lastRecordRow - rowToDelete, 5).getValues();
      sheet.getRange(rowToDelete, 1, rowsBelow.length, 5).setValues(rowsBelow);
    }
    sheet.getRange(lastRecordRow, 1, 1, 5).clearContent();
    SpreadsheetApp.flush();
    const balance = getBalance(sheet);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, balance: balance })).setMimeType(ContentService.MimeType.JSON);
  }
  if (!data.date || !data.item || (!data.dt && !data.kt)) throw new Error('Missing required fields');
  const lastRow = getLastRecordRow(sheet);
  const dt = Number(data.dt) || 0;
  const kt = Number(data.kt) || 0;
  const newRow = lastRow + 1;
  sheet.getRange(newRow, 1, 1, 5).setValues([[new Date(data.date), data.item, data.other || '', dt || '', kt || '']]);
  sheet.getRange(newRow, 1).setNumberFormat('dd/MM/yyyy');
  SpreadsheetApp.flush();
  const balance = getBalance(sheet);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, balance: balance, row: newRow })).setMimeType(ContentService.MimeType.JSON);
}
