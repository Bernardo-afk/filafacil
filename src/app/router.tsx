import { createHashRouter, RouterProvider } from 'react-router-dom'
import { CustomerLayout } from '../layouts/CustomerLayout'
import { AttendantLayout } from '../layouts/AttendantLayout'
import { ManagerLayout } from '../layouts/ManagerLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { WelcomeScreen } from '../features/auth/WelcomeScreen'
import { SignupScreen } from '../features/auth/SignupScreen'
import { LoginScreen } from '../features/auth/LoginScreen'
import { StaffEstablishmentChooser } from '../features/auth/StaffEstablishmentChooser'
import { RequireAuth } from '../features/auth/RequireAuth'
import { RequireRole } from '../features/auth/RequireRole'
import { ProfileFullScreen } from '../features/profile/ProfileFullScreen'
import { EditProfileScreen } from '../features/profile/EditProfileScreen'
import { AccountManagementScreen } from '../features/profile/AccountManagementScreen'
import { AddressesScreen } from '../features/profile/AddressesScreen'
import { AddressFormScreen } from '../features/profile/AddressFormScreen'
import { EstablishmentsListScreen } from '../features/admin/EstablishmentsListScreen'
import { EstablishmentDetailScreen } from '../features/admin/EstablishmentDetailScreen'
import { EstablishmentFormScreen } from '../features/admin/EstablishmentFormScreen'
import { PlansListScreen } from '../features/admin/PlansListScreen'
import { PlanFormScreen } from '../features/admin/PlanFormScreen'
import { UsersListScreen } from '../features/admin/UsersListScreen'
import { UserDetailScreen } from '../features/admin/UserDetailScreen'
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
      {
        path: 'perfil',
        element: <RequireAuth />,
        children: [
          { index: true, element: <ProfileFullScreen /> },
          { path: 'editar', element: <EditProfileScreen /> },
          { path: 'conta', element: <AccountManagementScreen /> },
          { path: 'enderecos', element: <AddressesScreen /> },
          { path: 'enderecos/novo', element: <AddressFormScreen /> },
          { path: 'enderecos/:addressId/editar', element: <AddressFormScreen /> },
        ],
      },
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
      {
        element: <RequireRole roles={['PLATFORM_ADMIN']} />,
        children: [
          { index: true, element: <EstablishmentsListScreen /> },
          { path: 'estabelecimentos', element: <EstablishmentsListScreen /> },
          { path: 'estabelecimentos/novo', element: <EstablishmentFormScreen /> },
          { path: 'estabelecimentos/:establishmentId', element: <EstablishmentDetailScreen /> },
          { path: 'estabelecimentos/:establishmentId/editar', element: <EstablishmentFormScreen /> },
          { path: 'usuarios', element: <UsersListScreen /> },
          { path: 'usuarios/:userId', element: <UserDetailScreen /> },
          { path: 'planos', element: <PlansListScreen /> },
          { path: 'planos/novo', element: <PlanFormScreen /> },
          { path: 'planos/:planId/editar', element: <PlanFormScreen /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
