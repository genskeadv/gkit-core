import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/Genske/Documents/gkit-core/outputs/resumo-categoria-carteira-20260802";
const outputPath = `${outputDir}/resumo_categoria_carteira.xlsx`;
const financasPath = "C:/Users/Genske/Downloads/financas_511214782009144.xlsx";
const carteirasPath = "C:/Users/Genske/Downloads/Carteiras 022026.xlsx";

const genericTokens = new Set([
  "CONDOMINIO",
  "CONDOMINIOS",
  "EDIFICIO",
  "EDIFICIOS",
  "RESIDENCIAL",
  "SUBCONDOMINIO",
  "SETOR",
  "TORRE",
  "APARTAMENTO",
  "APARTAMENTOS",
  "COMERCIAL",
]);

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/CPF\s*:\s*[\d.-]+/gi, "")
    .replace(/CNPJ\s*:\s*[\d./-]+/gi, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function aliasName(value) {
  return normalizeName(value)
    .split(" ")
    .filter((token) => token && !genericTokens.has(token))
    .join(" ");
}

function excelSerialToDate(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return value ?? null;
  const utcDays = Math.floor(value - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return new Date(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate());
}

function idxByHeader(headers) {
  return Object.fromEntries(headers.map((header, index) => [String(header ?? "").trim(), index]));
}

function colName(indexZeroBased) {
  let n = indexZeroBased + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function rangeAddress(startRow, startCol, rowCount, colCount) {
  const start = `${colName(startCol)}${startRow}`;
  const end = `${colName(startCol + colCount - 1)}${startRow + rowCount - 1}`;
  return `${start}:${end}`;
}

async function importValues(path, sheetName, range) {
  const input = await FileBlob.load(path);
  const workbook = await SpreadsheetFile.importXlsx(input);
  return workbook.worksheets.getItem(sheetName).getRange(range).values;
}

function buildUniqueMap(entries, keyGetter) {
  const buckets = new Map();
  for (const entry of entries) {
    const key = keyGetter(entry);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(entry);
  }
  const unique = new Map();
  const duplicated = new Set();
  for (const [key, bucket] of buckets) {
    const wallets = new Set(bucket.map((item) => `${item.carteira}|${item.tipo}`));
    if (wallets.size === 1) unique.set(key, bucket[0]);
    else duplicated.add(key);
  }
  return { unique, duplicated };
}

function resolveWallet(clientName, exactMap, aliasMap, walletEntries) {
  const normalized = normalizeName(clientName);
  const alias = aliasName(clientName);
  if (exactMap.has(normalized)) {
    return { ...exactMap.get(normalized), status: "Exato" };
  }
  if (aliasMap.unique.has(alias)) {
    return { ...aliasMap.unique.get(alias), status: "Alias unico" };
  }
  const containsMatches = walletEntries.filter((entry) => {
    if (!alias || !entry.alias || alias.length < 8 || entry.alias.length < 8) return false;
    return alias.includes(entry.alias) || entry.alias.includes(alias);
  });
  const distinctMatches = new Map(containsMatches.map((entry) => [`${entry.carteira}|${entry.tipo}`, entry]));
  if (distinctMatches.size === 1) {
    return { ...containsMatches[0], status: "Alias contido" };
  }
  return { carteira: "Sem carteira", tipo: "", clienteCarteira: "", status: "Sem carteira" };
}

function sum(rows, getter) {
  return rows.reduce((acc, row) => acc + Number(getter(row) ?? 0), 0);
}

function applyHeaderStyle(range) {
  range.format = {
    fill: "#14532D",
    font: { bold: true, color: "#FFFFFF" },
    borders: { preset: "outside", style: "thin", color: "#14532D" },
  };
}

function applySubheaderStyle(range) {
  range.format = {
    fill: "#DDEFE6",
    font: { bold: true, color: "#0F172A" },
    borders: { preset: "outside", style: "thin", color: "#B7D8C6" },
  };
}

function applyTitle(sheet, address, title) {
  const range = sheet.getRange(address);
  range.merge();
  range.values = [[title]];
  range.format = {
    fill: "#0F172A",
    font: { bold: true, color: "#FFFFFF", size: 16 },
    horizontalAlignment: "left",
    verticalAlignment: "middle",
  };
  range.format.rowHeight = 30;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const financasRows = await importValues(financasPath, "financas", "A1:AE193");
  const cartRows = await importValues(carteirasPath, "Cart", "A1:C183");

  const financeHeaders = financasRows[2].map((header) => String(header ?? "").trim());
  const financeIdx = idxByHeader(financeHeaders);
  const cartHeaders = cartRows[0].map((header) => String(header ?? "").trim());
  const cartIdx = idxByHeader(cartHeaders);

  const walletEntries = cartRows.slice(1).filter((row) => row.some(Boolean)).map((row) => ({
    clienteCarteira: row[cartIdx.Cliente],
    carteira: row[cartIdx.Carteira] || "Sem carteira",
    tipo: row[cartIdx.Tipo] || "",
    normalized: normalizeName(row[cartIdx.Cliente]),
    alias: aliasName(row[cartIdx.Cliente]),
  }));

  const exactMap = new Map();
  for (const entry of walletEntries) {
    if (entry.normalized && !exactMap.has(entry.normalized)) exactMap.set(entry.normalized, entry);
  }
  const aliasMap = buildUniqueMap(walletEntries, (entry) => entry.alias);

  const sourceRows = financasRows.slice(3).filter((row) => row.some((cell) => cell !== null && cell !== ""));
  const detailRows = sourceRows.map((row) => {
    const match = resolveWallet(row[financeIdx["Cliente (Nome Fantasia)"]], exactMap, aliasMap, walletEntries);
    return {
      situacao: row[financeIdx["Situação"]] ?? "",
      cliente: row[financeIdx["Cliente (Nome Fantasia)"]] ?? "",
      carteira: match.carteira || "Sem carteira",
      tipo: match.tipo ?? "",
      statusCarteira: match.status,
      categoria: row[financeIdx.Categoria] || "Sem categoria",
      previsao: excelSerialToDate(row[financeIdx["Previsão de Recebimento"]]),
      ultimoRecebimento: excelSerialToDate(row[financeIdx["Último Recebimento"]]),
      valorLiquido: Number(row[financeIdx["Valor Líquido"]] ?? 0),
      jurosMulta: Number(row[financeIdx["Juros e Multa"]] ?? 0),
      valorRecebido: Number(row[financeIdx["Valor Recebido"]] ?? 0),
      valorAReceber: Number(row[financeIdx["Valor a Receber"]] ?? 0),
      operacao: row[financeIdx["Operação"]] ?? "",
      clienteCarteira: match.clienteCarteira ?? "",
      fonte: "financas_511214782009144.xlsx",
    };
  });

  const wallets = [...new Set(detailRows.map((row) => row.carteira))].sort((a, b) => {
    if (a === "Sem carteira") return 1;
    if (b === "Sem carteira") return -1;
    return a.localeCompare(b, "pt-BR");
  });
  const categories = [...new Set(detailRows.map((row) => row.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const comboKeys = [...new Set(detailRows.map((row) => `${row.carteira}\u0000${row.categoria}`))]
    .map((key) => {
      const [carteira, categoria] = key.split("\u0000");
      return { carteira, categoria };
    })
    .sort((a, b) => {
      if (a.carteira === "Sem carteira" && b.carteira !== "Sem carteira") return 1;
      if (b.carteira === "Sem carteira" && a.carteira !== "Sem carteira") return -1;
      return a.carteira.localeCompare(b.carteira, "pt-BR") || a.categoria.localeCompare(b.categoria, "pt-BR");
    });

  const workbook = Workbook.create();
  const resumo = workbook.worksheets.add("Resumo");
  const porCarteira = workbook.worksheets.add("Por Carteira");
  const porCategoria = workbook.worksheets.add("Por Categoria");
  const detalhe = workbook.worksheets.add("Detalhe");
  const metodologia = workbook.worksheets.add("Metodologia");
  for (const sheet of [resumo, porCarteira, porCategoria, detalhe, metodologia]) {
    sheet.showGridLines = false;
  }

  const detailHeaders = [
    "Situacao",
    "Cliente",
    "Carteira",
    "Tipo",
    "Status Carteira",
    "Categoria",
    "Previsao Recebimento",
    "Ultimo Recebimento",
    "Valor Liquido",
    "Juros e Multa",
    "Valor Recebido",
    "Valor a Receber",
    "Operacao",
    "Cliente no arquivo Carteiras",
    "Fonte",
  ];
  const detailValues = detailRows.map((row) => [
    row.situacao,
    row.cliente,
    row.carteira,
    row.tipo,
    row.statusCarteira,
    row.categoria,
    row.previsao,
    row.ultimoRecebimento,
    row.valorLiquido,
    row.jurosMulta,
    row.valorRecebido,
    row.valorAReceber,
    row.operacao,
    row.clienteCarteira,
    row.fonte,
  ]);
  detalhe.getRangeByIndexes(0, 0, detailValues.length + 1, detailHeaders.length).values = [detailHeaders, ...detailValues];
  detalhe.tables.add(rangeAddress(1, 0, detailValues.length + 1, detailHeaders.length), true, "DetalheTable");
  applyHeaderStyle(detalhe.getRange(rangeAddress(1, 0, 1, detailHeaders.length)));
  detalhe.getRange(`G2:H${detailValues.length + 1}`).format.numberFormat = "yyyy-mm-dd";
  detalhe.getRange(`I2:L${detailValues.length + 1}`).format.numberFormat = "#,##0.00;[Red](#,##0.00);-";
  detalhe.getRange(`A1:O${detailValues.length + 1}`).format.borders = { preset: "inside", style: "thin", color: "#E2E8F0" };
  detalhe.getRange("A:O").format.autofitColumns();
  detalhe.getRange("B:B").format.columnWidth = 36;
  detalhe.getRange("F:F").format.columnWidth = 34;
  detalhe.getRange("N:N").format.columnWidth = 34;
  detalhe.freezePanes.freezeRows(1);

  applyTitle(resumo, "A1:F1", "Resumo por categoria e carteira");
  resumo.getRange("A3:B8").values = [
    ["Metrica", "Valor"],
    ["Lancamentos", ""],
    ["Valor liquido", ""],
    ["Valor recebido", ""],
    ["Valor a receber", ""],
    ["Lancamentos sem carteira", ""],
  ];
  applySubheaderStyle(resumo.getRange("A3:B3"));
  const lastDetailRow = detailRows.length + 1;
  resumo.getRange("B4:B8").formulas = [
    [`=COUNTA('Detalhe'!$A$2:$A$${lastDetailRow})`],
    [`=SUM('Detalhe'!$I$2:$I$${lastDetailRow})`],
    [`=SUM('Detalhe'!$K$2:$K$${lastDetailRow})`],
    [`=SUM('Detalhe'!$L$2:$L$${lastDetailRow})`],
    [`=COUNTIF('Detalhe'!$C$2:$C$${lastDetailRow},"Sem carteira")`],
  ];
  resumo.getRange("B5:B7").format.numberFormat = "#,##0.00;[Red](#,##0.00);-";
  resumo.getRange("B4:B8").format = { font: { bold: true }, horizontalAlignment: "right" };

  const comboStart = 10;
  const comboHeaders = ["Carteira", "Categoria", "Lancamentos", "Valor Liquido", "Valor Recebido", "Valor a Receber"];
  resumo.getRangeByIndexes(comboStart - 1, 0, 1, comboHeaders.length).values = [comboHeaders];
  applySubheaderStyle(resumo.getRange(rangeAddress(comboStart, 0, 1, comboHeaders.length)));
  const comboRows = comboKeys.map((row, index) => {
    const excelRow = comboStart + index + 1;
    return [
      row.carteira,
      row.categoria,
      `=COUNTIFS('Detalhe'!$C$2:$C$${lastDetailRow},A${excelRow},'Detalhe'!$F$2:$F$${lastDetailRow},B${excelRow})`,
      `=SUMIFS('Detalhe'!$I$2:$I$${lastDetailRow},'Detalhe'!$C$2:$C$${lastDetailRow},A${excelRow},'Detalhe'!$F$2:$F$${lastDetailRow},B${excelRow})`,
      `=SUMIFS('Detalhe'!$K$2:$K$${lastDetailRow},'Detalhe'!$C$2:$C$${lastDetailRow},A${excelRow},'Detalhe'!$F$2:$F$${lastDetailRow},B${excelRow})`,
      `=SUMIFS('Detalhe'!$L$2:$L$${lastDetailRow},'Detalhe'!$C$2:$C$${lastDetailRow},A${excelRow},'Detalhe'!$F$2:$F$${lastDetailRow},B${excelRow})`,
    ];
  });
  const comboRange = resumo.getRangeByIndexes(comboStart, 0, comboRows.length, comboHeaders.length);
  comboRange.values = comboRows.map((row) => [row[0], row[1], null, null, null, null]);
  comboRange.formulas = comboRows.map((row) => [null, null, row[2], row[3], row[4], row[5]]);
  resumo.tables.add(rangeAddress(comboStart, 0, comboRows.length + 1, comboHeaders.length), true, "ResumoCarteiraCategoriaTable");
  resumo.getRange(`C${comboStart + 1}:C${comboStart + comboRows.length}`).format.numberFormat = "#,##0";
  resumo.getRange(`D${comboStart + 1}:F${comboStart + comboRows.length}`).format.numberFormat = "#,##0.00;[Red](#,##0.00);-";
  resumo.getRange("A:F").format.autofitColumns();
  resumo.getRange("A:A").format.columnWidth = 26;
  resumo.getRange("B:B").format.columnWidth = 42;
  resumo.freezePanes.freezeRows(comboStart);

  applyTitle(porCarteira, "A1:F1", "Resumo por carteira");
  const walletHeaders = ["Carteira", "Tipo principal", "Lancamentos", "Valor Liquido", "Valor Recebido", "Valor a Receber"];
  porCarteira.getRange("A3:F3").values = [walletHeaders];
  applySubheaderStyle(porCarteira.getRange("A3:F3"));
  const walletRows = wallets.map((wallet, index) => {
    const types = [...new Set(detailRows.filter((row) => row.carteira === wallet).map((row) => row.tipo).filter(Boolean))];
    const excelRow = index + 4;
    return [
      wallet,
      types.join(", "),
      `=COUNTIF('Detalhe'!$C$2:$C$${lastDetailRow},A${excelRow})`,
      `=SUMIF('Detalhe'!$C$2:$C$${lastDetailRow},A${excelRow},'Detalhe'!$I$2:$I$${lastDetailRow})`,
      `=SUMIF('Detalhe'!$C$2:$C$${lastDetailRow},A${excelRow},'Detalhe'!$K$2:$K$${lastDetailRow})`,
      `=SUMIF('Detalhe'!$C$2:$C$${lastDetailRow},A${excelRow},'Detalhe'!$L$2:$L$${lastDetailRow})`,
    ];
  });
  porCarteira.getRangeByIndexes(3, 0, walletRows.length, walletHeaders.length).values = walletRows.map((row) => [row[0], row[1], null, null, null, null]);
  porCarteira.getRangeByIndexes(3, 0, walletRows.length, walletHeaders.length).formulas = walletRows.map((row) => [null, null, row[2], row[3], row[4], row[5]]);
  porCarteira.tables.add(rangeAddress(3, 0, walletRows.length + 1, walletHeaders.length), true, "PorCarteiraTable");
  porCarteira.getRange(`C4:C${walletRows.length + 3}`).format.numberFormat = "#,##0";
  porCarteira.getRange(`D4:F${walletRows.length + 3}`).format.numberFormat = "#,##0.00;[Red](#,##0.00);-";
  porCarteira.getRange("A:F").format.autofitColumns();
  porCarteira.getRange("A:A").format.columnWidth = 28;
  porCarteira.freezePanes.freezeRows(3);

  applyTitle(porCategoria, "A1:E1", "Resumo por categoria");
  const categoryHeaders = ["Categoria", "Lancamentos", "Valor Liquido", "Valor Recebido", "Valor a Receber"];
  porCategoria.getRange("A3:E3").values = [categoryHeaders];
  applySubheaderStyle(porCategoria.getRange("A3:E3"));
  const categoryRows = categories.map((category, index) => {
    const excelRow = index + 4;
    return [
      category,
      `=COUNTIF('Detalhe'!$F$2:$F$${lastDetailRow},A${excelRow})`,
      `=SUMIF('Detalhe'!$F$2:$F$${lastDetailRow},A${excelRow},'Detalhe'!$I$2:$I$${lastDetailRow})`,
      `=SUMIF('Detalhe'!$F$2:$F$${lastDetailRow},A${excelRow},'Detalhe'!$K$2:$K$${lastDetailRow})`,
      `=SUMIF('Detalhe'!$F$2:$F$${lastDetailRow},A${excelRow},'Detalhe'!$L$2:$L$${lastDetailRow})`,
    ];
  });
  porCategoria.getRangeByIndexes(3, 0, categoryRows.length, categoryHeaders.length).values = categoryRows.map((row) => [row[0], null, null, null, null]);
  porCategoria.getRangeByIndexes(3, 0, categoryRows.length, categoryHeaders.length).formulas = categoryRows.map((row) => [null, row[1], row[2], row[3], row[4]]);
  porCategoria.tables.add(rangeAddress(3, 0, categoryRows.length + 1, categoryHeaders.length), true, "PorCategoriaTable");
  porCategoria.getRange(`B4:B${categoryRows.length + 3}`).format.numberFormat = "#,##0";
  porCategoria.getRange(`C4:E${categoryRows.length + 3}`).format.numberFormat = "#,##0.00;[Red](#,##0.00);-";
  porCategoria.getRange("A:E").format.autofitColumns();
  porCategoria.getRange("A:A").format.columnWidth = 42;
  porCategoria.freezePanes.freezeRows(3);

  applyTitle(metodologia, "A1:D1", "Metodologia e fontes");
  const unmatchedCount = detailRows.filter((row) => row.carteira === "Sem carteira").length;
  const exactCount = detailRows.filter((row) => row.statusCarteira === "Exato").length;
  const aliasExactCount = detailRows.filter((row) => row.statusCarteira === "Alias unico").length;
  const aliasContainedCount = detailRows.filter((row) => row.statusCarteira === "Alias contido").length;
  metodologia.getRange("A3:D12").values = [
    ["Item", "Valor", "Observacao", "Fonte"],
    ["Arquivo financeiro", "financas_511214782009144.xlsx", "Aba financas, linhas de dados a partir da linha 4", financasPath],
    ["Arquivo carteiras", "Carteiras 022026.xlsx", "Aba Cart", carteirasPath],
    ["Lancamentos lidos", detailRows.length, "", ""],
    ["Linhas no arquivo de carteiras", walletEntries.length, "", ""],
    ["Correspondencias exatas", exactCount, "Cliente normalizado igual nos dois arquivos", ""],
    ["Correspondencias por alias unico", aliasExactCount, "Remove termos genericos e exige alias unico", ""],
    ["Correspondencias por alias contido", aliasContainedCount, "Usado apenas quando existe uma unica carteira candidata", ""],
    ["Lancamentos sem carteira", unmatchedCount, "Mantidos no grupo Sem carteira", ""],
    ["Total liquido conferido", sum(detailRows, (row) => row.valorLiquido), "Soma do detalhe", ""],
  ];
  applySubheaderStyle(metodologia.getRange("A3:D3"));
  metodologia.getRange("B6:B11").format.numberFormat = "#,##0";
  metodologia.getRange("B12:B12").format.numberFormat = "#,##0.00;[Red](#,##0.00);-";
  metodologia.getRange("A:D").format.autofitColumns();
  metodologia.getRange("C:C").format.columnWidth = 48;
  metodologia.getRange("D:D").format.columnWidth = 56;
  metodologia.freezePanes.freezeRows(3);

  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: "final formula error scan",
  });
  console.log(errors.ndjson);

  const check = await workbook.inspect({
    kind: "table",
    sheetId: "Resumo",
    range: "A1:F25",
    include: "values,formulas",
    tableMaxRows: 25,
    tableMaxCols: 6,
    maxChars: 10000,
  });
  console.log(check.ndjson);

  for (const sheetName of ["Resumo", "Por Carteira", "Por Categoria", "Detalhe", "Metodologia"]) {
    const preview = await workbook.render({
      sheetName,
      autoCrop: "all",
      scale: 1,
      format: "png",
    });
    await fs.writeFile(`${outputDir}/preview_${sheetName.replace(/\s+/g, "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
  }

  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(outputPath);
  console.log(JSON.stringify({
    outputPath,
    rows: detailRows.length,
    totalLiquido: sum(detailRows, (row) => row.valorLiquido),
    totalRecebido: sum(detailRows, (row) => row.valorRecebido),
    totalAReceber: sum(detailRows, (row) => row.valorAReceber),
    unmatchedCount,
    exactCount,
    aliasExactCount,
    aliasContainedCount,
  }, null, 2));
}

await main();
