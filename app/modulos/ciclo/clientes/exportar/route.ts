import ExcelJS from 'exceljs'
import type { NextRequest } from 'next/server'
import { buildClienteListFilters, filterAndSortClientes } from '@/features/ciclo/clientes-list'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'
import type { CicloCliente, CicloRisco, CicloStatusCliente, CicloTemperatura, CicloTipoCliente } from '@/features/ciclo/types'

export const runtime = 'nodejs'

const tipoLabels: Record<CicloTipoCliente, string> = {
  cobranca: 'Cobrança',
  mensal: 'Mensal',
  pontual: 'Pontual',
}

const statusLabels: Record<CicloStatusCliente, string> = {
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  implantacao: 'Implantação',
  novo: 'Novo',
  pausado: 'Pausado',
}

const riscoLabels: Record<CicloRisco, string> = {
  alto: 'Alto',
  baixo: 'Baixo',
  critico: 'Crítico',
  medio: 'Médio',
}

const temperaturaLabels: Record<CicloTemperatura, string> = {
  frio: 'Frio',
  neutro: 'Neutro',
  quente: 'Quente',
}

function fileDate() {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  })
  return formatter.format(new Date()).split('/').reverse().join('-')
}

function clienteRow(cliente: CicloCliente) {
  return {
    Administradora: cliente.administradora,
    Carteira: cliente.carteira,
    Cidade: cliente.cidade,
    Cliente: cliente.nome,
    CNPJ: cliente.documento,
    Contato: cliente.contatoPrincipal,
    Estado: cliente.estado,
    Regularidade: cliente.regularidade,
    'Razão social': cliente.razaoSocial,
    Risco: riscoLabels[cliente.risco],
    Score: cliente.score,
    Status: statusLabels[cliente.status],
    Temperatura: temperaturaLabels[cliente.temperatura],
    Tipo: tipoLabels[cliente.tipoCliente],
    'Alertas abertos': cliente.alertasAbertos,
  }
}

export async function GET(request: NextRequest) {
  const context = await requireCicloContext()
  const data = await getCicloData(context)
  const filters = buildClienteListFilters({
    carteira: request.nextUrl.searchParams.get('carteira'),
    dir: request.nextUrl.searchParams.get('dir'),
    q: request.nextUrl.searchParams.get('q'),
    sort: request.nextUrl.searchParams.get('sort'),
    tipo: request.nextUrl.searchParams.get('tipo'),
  })
  const clientes = filterAndSortClientes(data.clientes, filters)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GKIT Suite'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Clientes')
  sheet.columns = [
    { header: 'Cliente', key: 'Cliente', width: 38 },
    { header: 'Razão social', key: 'Razão social', width: 38 },
    { header: 'CNPJ', key: 'CNPJ', width: 20 },
    { header: 'Tipo', key: 'Tipo', width: 14 },
    { header: 'Carteira', key: 'Carteira', width: 24 },
    { header: 'Administradora', key: 'Administradora', width: 24 },
    { header: 'Status', key: 'Status', width: 14 },
    { header: 'Regularidade', key: 'Regularidade', width: 14 },
    { header: 'Score', key: 'Score', width: 10 },
    { header: 'Risco', key: 'Risco', width: 12 },
    { header: 'Temperatura', key: 'Temperatura', width: 14 },
    { header: 'Alertas abertos', key: 'Alertas abertos', width: 16 },
    { header: 'Contato', key: 'Contato', width: 28 },
    { header: 'Cidade', key: 'Cidade', width: 20 },
    { header: 'Estado', key: 'Estado', width: 10 },
  ]
  sheet.addRows(clientes.map(clienteRow))

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { fgColor: { argb: 'FF351B40' }, pattern: 'solid', type: 'pattern' }
  sheet.getRow(1).alignment = { vertical: 'middle' }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.autoFilter = {
    from: { column: 1, row: 1 },
    to: { column: sheet.columnCount, row: Math.max(1, sheet.rowCount) },
  }
  sheet.getColumn('Regularidade').numFmt = '0%'
  sheet.getColumn('Regularidade').eachCell((cell, rowNumber) => {
    if (rowNumber > 1 && typeof cell.value === 'number') cell.value = Number(cell.value) / 100
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `clientes-ciclo-${fileDate()}.xlsx`

  return new Response(buffer as BodyInit, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
