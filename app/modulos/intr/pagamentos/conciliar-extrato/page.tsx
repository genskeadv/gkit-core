import { redirect } from 'next/navigation'

export default function LegacyIntrRedirectPage() {
  redirect('/modulos/fix/pagamentos/conciliar-extrato')
}
