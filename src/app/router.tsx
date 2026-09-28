import { createHashRouter, RouterProvider } from 'react-router-dom'
import { CustomerLayout } from '../layouts/CustomerLayout'
import { AttendantLayout } from '../layouts/AttendantLayout'
import { ManagerLayout } from '../layouts/ManagerLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { WelcomeScreen } from '../features/auth/WelcomeScreen'
import { SignupScreen } from '../features/auth/SignupScreen'
import { LoginScreen } from '../features/auth/LoginScreen'
import { StaffEstablishmentChooser } from '../features/auth/StaffEstablishmentChooser'
import { Placeholder } from '../components/ui/Placeholder'

// HashRouter (spec §4 decisão 11, §13.1): GitHub Pages não sabe devolver
// index.html para uma rota profunda recarregada direto; com hash router toda
// rota vive depois do "#".
export const router = createHashRouter([
  { path: '/', element: <WelcomeScreen /> },
  { path: '/cadastro', element: <SignupScreen /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/escolher-estabelecimento', element: <StaffEstablishmentChooser /> },
  {
    path: '/app',
    element: <CustomerLayout />,
    children: [
      { index: true, element: <Placeholder title="Início" story="11" /> },
      { path: 'restaurantes', element: <Placeholder title="Restaurantes" story="11" /> },
      { path: 'r/:establishmentId', element: <Placeholder title="Página do restaurante" story="12" /> },
      { path: 'r/:establishmentId/cardapio', element: <Placeholder title="Cardápio" story="03" /> },
      { path: 'pedidos', element: <Placeholder title="Pedidos" /> },
      { path: 'perfil', element: <Placeholder title="Perfil" story="13" /> },
    ],
  },
  {
    path: '/atendente',
    element: <AttendantLayout />,
    children: [{ path: 'cardapio', element: <Placeholder title="Disponibilidade do cardápio" story="19" /> }],
  },
  {
    path: '/gestor',
    element: <ManagerLayout />,
    children: [
      { index: true, element: <Placeholder title="Cardápio" story="28" /> },
      { path: 'cardapio', element: <Placeholder title="Cardápio" story="28" /> },
      { path: 'promocoes', element: <Placeholder title="Promoções" story="29" /> },
      { path: 'fichas-tecnicas', element: <Placeholder title="Fichas técnicas" story="31" /> },
      { path: 'mesas', element: <Placeholder title="Mesas e locais" story="20" /> },
      { path: 'fila', element: <Placeholder title="Fila de espera" story="21" /> },
      { path: 'estabelecimento', element: <Placeholder title="Estabelecimento" story="12" /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Placeholder title="Estabelecimentos" story="34" /> },
      { path: 'estabelecimentos', element: <Placeholder title="Estabelecimentos" story="34" /> },
      { path: 'usuarios', element: <Placeholder title="Usuários" story="36" /> },
      { path: 'planos', element: <Placeholder title="Planos" story="37" /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
