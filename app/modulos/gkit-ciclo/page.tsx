import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import {
  createCicloClienteAction,
  createCicloOcorrenciaAction,
  startCicloOnboardingAction,
  updateCicloCockpitDocumentacaoAction,
} from '@/features/ciclo/actions'
import { CicloCockpit } from '@/features/ciclo/cockpit'
import { CicloShell } from '@/features/ciclo/components'
import { getCicloCockpitData, requireCicloContext } from '@/features/ciclo/queries'
import type { CicloFormOption } from '@/features/ciclo/types'
import { moduleTarget } from '@/lib/auth/platform'

type CockpitPanel = 'cliente' | 'onboarding' | 'documentacao' | 'ocorrencia'
type CockpitPermissions = Record<CockpitPanel, boolean>

const cockpitPanels: Array<{ description: string; id: CockpitPanel; label: string; title: string }> = [
  { id: 'cliente', label: '1. Cliente', title: 'Criar cliente', description: 'Cadastre a entrada operacional.' },
  { id: 'onboarding', label: '2. Onboarding', title: 'Iniciar onboarding', description: 'Crie checklist e workflow.' },
  { id: 'documentacao', label: '3. Documentação', title: 'Atualizar documentos', description: 'Marque checklist e datas.' },
  { id: 'ocorrencia', label: '4. Ocorrência', title: 'Criar ocorrência', description: 'Registre evento e alerta.' },
]

function initialPanel(value: string | string[] | undefined): CockpitPanel | null {
  const panel = Array.isArray(value) ? value[0] : value
  if (panel === 'cliente' || panel === 'onboarding' || panel === 'documentacao' || panel === 'ocorrencia') return panel
  return null
}

function CicloOnboardingPanel({ clientes, permissions }: { clientes: CicloFormOption[]; permissions: CockpitPermissions }) {
  const availablePanels = cockpitPanels.filter((panel) => permissions[panel.id])

  return (
    <>
      <section className="suite-panel ciclo-command-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Ordem do fluxo</h2>
            <p>Escolha uma etapa para abrir o formulario; por padrão, o cockpit mostra clientes com documentação pendente.</p>
          </div>
        </div>

        <div className="ciclo-quick-grid ciclo-cockpit-flow">
          {availablePanels.map((item) => (
            <a
              aria-current={item.id === 'onboarding' ? 'page' : undefined}
              className={item.id === 'onboarding' ? 'ciclo-quick-card active' : 'ciclo-quick-card'}
              href={`/modulos/gkit-ciclo?panel=${item.id}`}
              key={item.id}
            >
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="suite-panel ciclo-cockpit-form-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Iniciar onboarding</h2>
            <p>Crie checklist e workflow.</p>
          </div>
        </div>

        <form action={startCicloOnboardingAction} className="card module-form module-form-grid">
          <input name="return_to" type="hidden" value="cockpit" />
          <label className="module-form-wide">
            <span>Cliente</span>
            <input
              autoComplete="off"
              list="ciclo-onboarding-clientes"
              name="cliente_busca"
              placeholder="Digite o cliente"
              required
              title="Selecione um cliente da lista."
              type="search"
            />
            <datalist id="ciclo-onboarding-clientes">
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.label} />
              ))}
            </datalist>
          </label>
          <div className="suite-empty-block module-form-wide">O onboarding cria o checklist documental e o workflow operacional padrão.</div>
          <div className="form-actions module-form-wide">
            <button className="button" type="submit">Iniciar onboarding</button>
          </div>
        </form>
      </section>
    </>
  )
}

export default async function CicloPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireCicloContext(moduleTarget('/modulos/gkit-ciclo', params))
  const permissions = {
    cliente: canAccess(context.permissions, 'ciclo.clientes.write'),
    onboarding: canAccess(context.permissions, 'ciclo.clientes.write'),
    documentacao: canAccess(context.permissions, 'ciclo.documentos.write'),
    ocorrencia: canAccess(context.permissions, 'ciclo.alertas.write'),
  }
  const panel = initialPanel(params?.panel)
  if (panel && !permissions[panel]) redirect('/modulos/gkit-ciclo')

  const data = await getCicloCockpitData(context, panel)

  if (panel === 'onboarding') {
    return (
      <CicloShell
        active="cockpit"
        eyebrow="GKIT Ciclo"
        title="Fluxo operacional"
        description="Execução diária do Ciclo, organizada na ordem natural da rotina de acompanhamento."
        usuario={context.usuario}
      >
        <CicloOnboardingPanel clientes={data.documentoFormData.clientes} permissions={permissions} />
      </CicloShell>
    )
  }

  return (
    <CicloShell
      active="cockpit"
      eyebrow="GKIT Ciclo"
      title="Fluxo operacional"
      description="Execução diária do Ciclo, organizada na ordem natural da rotina de acompanhamento."
      usuario={context.usuario}
    >
      <CicloCockpit
        createClienteAction={createCicloClienteAction}
        createOcorrenciaAction={createCicloOcorrenciaAction}
        data={data}
        initialPanel={panel}
        permissions={permissions}
        startOnboardingAction={startCicloOnboardingAction}
        updateDocumentacaoAction={updateCicloCockpitDocumentacaoAction}
      />
    </CicloShell>
  )
}
