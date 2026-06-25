import { requireModuleAccess, type ModuleSearchParams } from '@/lib/auth/platform';
import { canAccess } from '@/lib/auth/permissions';
import { GkitFlexColaboradoresPage } from '@/features/gkit-flex/colaboradores/ColaboradoresPage';
import { listGkitFlexColaboradores } from '@/features/gkit-flex/colaboradores/queries';
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame';

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function GkitFlexColaboradoresRoute({ searchParams }: { searchParams?: Promise<ModuleSearchParams> }) {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/colaboradores');
  const params = await searchParams;
  const data = await listGkitFlexColaboradores();

  return (
    <AppFrame>
      <GkitFlexColaboradoresPage
        data={data}
        canWrite={canAccess(context.permissions, 'gkit_flex.colaboradores.write')}
        query={param(params?.q)}
        status={param(params?.status)}
      />
    </AppFrame>
  );
}
