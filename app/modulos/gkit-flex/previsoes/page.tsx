import { requireModuleAccess } from '@/lib/auth/platform';
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame';
import { ForecastPage } from '@/features/gkit-flex/previsoes/ForecastPage';

export default async function GkitFlexPrevisoesPage() {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/previsoes');

  return (
    <AppFrame usuario={context.usuario}>
      <ForecastPage />
    </AppFrame>
  );
}
