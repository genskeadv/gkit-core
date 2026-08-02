import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const files = [
  "C:/Users/Genske/Downloads/financas_511214782009144.xlsx",
  "C:/Users/Genske/Downloads/Carteiras 022026.xlsx",
];

for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const input = await FileBlob.load(file);
  const workbook = await SpreadsheetFile.importXlsx(input);
  const overview = await workbook.inspect({
    kind: "workbook,sheet,table",
    maxChars: 12000,
    tableMaxRows: 8,
    tableMaxCols: 12,
    tableMaxCellChars: 80,
  });
  console.log(overview.ndjson);
}
