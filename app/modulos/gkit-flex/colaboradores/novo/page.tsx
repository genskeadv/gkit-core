import { redirect } from 'next/navigation';
import { requireModuleAccess } from '@/lib/auth/platform';
import { canAccess } from '@/lib/auth/permissions';
import { GkitFlexColaboradorForm } from '@/features/gkit-flex/colaboradores/ColaboradoresPage';
import { getGkitFlexColaboradorFormData } from '@/features/gkit-flex/colaboradores/queries';
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame';

export default async function GkitFlexNovoColaboradorPage() {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/colaboradores/novo');
  if (!canAccess(context.permissions, 'gkit_flex.colaboradores.write')) redirect('/modulos/gkit-flex/colaboradores');
  const data = await getGkitFlexColaboradorFormData();

  return (
    <AppFrame>
      <GkitFlexColaboradorForm data={data} />
    </AppFrame>
  );
}
