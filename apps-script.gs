const SHEET_ID = '1T6XxVZ3L6Wp0RmGe93ix931OaqVpBBklGRaI57TdTB4';
const SHEET_NAME = 'RM2026';

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSavedRequest(requestId) {
  if (!requestId) return null;
  const saved = CacheService.getScriptCache().get(`rm2026-save-${requestId}`);
  return saved ? JSON.parse(saved) : null;
}

function rememberRequest(requestId, result) {
  if (requestId) CacheService.getScriptCache().put(`rm2026-save-${requestId}`, JSON.stringify(result), 21600);
}

function setLinkCell(sheet, row, value) {
  const link = String(value || '').trim();
  if (!link) return sheet.getRange(row, 7).clearContent();
  if (isDriveFileLink(link)) return setDriveFileChip(sheet, row, link);
  const richText = SpreadsheetApp.newRichTextValue().setText(link).setLinkUrl(link).build();
  sheet.getRange(row, 7).setRichTextValue(richText);
}

function isDriveFileLink(link) {
  return /^https:\/\/(?:drive\.google\.com\/file\/d\/|docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/)/i.test(link);
}

function setDriveFileChip(sheet, row, link) {
  Sheets.Spreadsheets.batchUpdate({
    requests: [{
      updateCells: {
        range: { sheetId: sheet.getSheetId(), startRowIndex: row - 1, endRowIndex: row, startColumnIndex: 6, endColumnIndex: 7 },
        rows: [{ values: [{ userEnteredValue: { stringValue: '@' }, chipRuns: [{ chip: { richLinkProperties: { uri: link } } }] }] }],
        fields: 'userEnteredValue,chipRuns'
      }
    }]
  }, SHEET_ID);
}

function shiftLinkCells(sheet, rowToDelete, lastRecordRow) {
  if (rowToDelete >= lastRecordRow) return;
  Sheets.Spreadsheets.batchUpdate({
    requests: [{
      copyPaste: {
        source: { sheetId: sheet.getSheetId(), startRowIndex: rowToDelete, endRowIndex: lastRecordRow, startColumnIndex: 6, endColumnIndex: 7 },
        destination: { sheetId: sheet.getSheetId(), startRowIndex: rowToDelete - 1, endRowIndex: lastRecordRow - 1, startColumnIndex: 6, endColumnIndex: 7 },
        pasteType: 'PASTE_NORMAL'
      }
    }]
  }, SHEET_ID);
}

function getBalance(sheet) {
  return Number(sheet.getRange('F1002').getValue()) || 0;
}

function getLastRecordRow(sheet) {
  const values = sheet.getRange(1, 1, sheet.getMaxRows(), 5).getValues();
  const links = sheet.getRange(1, 7, sheet.getMaxRows(), 1).getValues();
  for (let index = values.length - 1; index >= 1; index -= 1) {
    if (values[index].some((value) => value !== '' && value !== null) || links[index][0] !== '') return index + 1;
  }
  return 1;
}

function getSequenceForDate(sheet, isoDate) {
  const [year, month, day] = String(isoDate || '').split('-');
  if (!year || !month || !day) return 1;
  const target = `${month}/${day}/${year}`;
  const values = sheet.getRange(2, 1, Math.max(1, sheet.getMaxRows() - 1), 1).getValues();
  const matches = values.filter(([value]) => {
    const recordDate = value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'MM/dd/yyyy') : String(value);
    return recordDate === target;
  }).length;
  return matches + 1;
}

function doGet(e) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const sequenceDate = e && e.parameter && e.parameter.sequenceDate;
  if (sequenceDate) return jsonResponse({ ok: true, sequence: getSequenceForDate(sheet, sequenceDate) });
  const selectionSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('selection');
  const balance = getBalance(sheet);
  const lastRecordRow = getLastRecordRow(sheet);
  const firstRecordRow = Math.max(2, lastRecordRow - 37);
  const recordCount = lastRecordRow >= 2 ? lastRecordRow - firstRecordRow + 1 : 0;
  const recordValues = recordCount ? sheet.getRange(firstRecordRow, 1, recordCount, 5).getValues() : [];
  const recordLinks = recordCount ? sheet.getRange(firstRecordRow, 7, recordCount, 1).getDisplayValues() : [];
  const records = recordCount
    ? recordValues.map((values, index) => ({
        row: firstRecordRow + index,
        date: values[0] instanceof Date ? Utilities.formatDate(values[0], Session.getScriptTimeZone(), 'yyyy-MM-dd') : values[0],
        item: values[1],
        other: values[2],
        dt: values[3],
        kt: values[4],
        link: recordLinks[index][0]
      })).reverse()
    : [];
  const options = selectionSheet ? selectionSheet.getRange(1, 1, selectionSheet.getLastRow(), 1).getValues().flat().filter((value) => String(value).trim()) : [];
  return jsonResponse({ ok: true, balance: balance, records: records, options: options });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents || '{}');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const previousResult = getSavedRequest(data.requestId);
    if (previousResult) return jsonResponse(previousResult);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('RM2026 not found');
    if (data.action === 'delete') {
      const rowToDelete = Number(data.row);
      const lastRecordRow = getLastRecordRow(sheet);
      if (!Number.isInteger(rowToDelete) || rowToDelete < 2 || rowToDelete > lastRecordRow) throw new Error('Invalid record row');
      if (rowToDelete < lastRecordRow) {
        const rowsBelow = sheet.getRange(rowToDelete + 1, 1, lastRecordRow - rowToDelete, 5).getValues();
        sheet.getRange(rowToDelete, 1, rowsBelow.length, 5).setValues(rowsBelow);
        shiftLinkCells(sheet, rowToDelete, lastRecordRow);
      }
      sheet.getRange(lastRecordRow, 1, 1, 5).clearContent();
      sheet.getRange(lastRecordRow, 7).clearContent();
      SpreadsheetApp.flush();
      return jsonResponse({ ok: true, balance: getBalance(sheet) });
    }
    if (!data.date || !data.item || (!data.dt && !data.kt)) throw new Error('Missing required fields');
    const lastRow = getLastRecordRow(sheet);
    const dt = Number(data.dt) || 0;
    const kt = Number(data.kt) || 0;
    const newRow = lastRow + 1;
    const [year, month, day] = String(data.date).split('-');
    const recordDate = `${month}/${day}/${year}`;
    sheet.getRange(newRow, 1, 1, 5).setValues([[recordDate, data.item, data.other || '', dt || '', kt || '']]);
    setLinkCell(sheet, newRow, data.link || '');
    SpreadsheetApp.flush();
    const result = { ok: true, balance: getBalance(sheet), row: newRow };
    rememberRequest(data.requestId, result);
    return jsonResponse(result);
  } finally {
    lock.releaseLock();
  }
}
