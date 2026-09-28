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
import { RestaurantDetailScreen } from '../features/discovery/RestaurantDetailScreen'
import { HomeScreen } from '../features/discovery/HomeScreen'
import { RestaurantsScreen } from '../features/discovery/RestaurantsScreen'
import { LocationPermissionScreen } from '../features/discovery/LocationPermissionScreen'
import { EstablishmentScreen } from '../features/manager/EstablishmentScreen'
import { HoursScreen } from '../features/manager/HoursScreen'
import { MenuScreen as ManagerMenuScreen } from '../features/manager/MenuScreen'
import { PromotionsScreen } from '../features/manager/PromotionsScreen'
import { MenuScreen as CustomerMenuScreen } from '../features/menu/MenuScreen'
import { MenuAvailabilityScreen } from '../features/attendant/MenuAvailabilityScreen'
import { RecipeSheetsScreen } from '../features/manager/RecipeSheetsScreen'
import { FloorPlanScreen } from '../features/manager/FloorPlanScreen'
import { TablesScreen } from '../features/manager/TablesScreen'
import { WaitlistScreen } from '../features/manager/WaitlistScreen'
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
      { index: true, element: <HomeScreen /> },
      { path: 'restaurantes', element: <RestaurantsScreen /> },
      { path: 'localizacao', element: <LocationPermissionScreen /> },
      { path: 'r/:establishmentId', element: <RestaurantDetailScreen /> },
      { path: 'r/:establishmentId/cardapio', element: <CustomerMenuScreen /> },
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
    children: [
      {
        element: <RequireRole roles={['STAFF']} />,
        children: [{ path: 'cardapio', element: <MenuAvailabilityScreen /> }],
      },
    ],
  },
  {
    path: '/gestor',
    element: <ManagerLayout />,
    children: [
      {
        element: <RequireRole roles={['STAFF']} />,
        children: [
          { index: true, element: <ManagerMenuScreen /> },
          { path: 'cardapio', element: <ManagerMenuScreen /> },
          { path: 'promocoes', element: <PromotionsScreen /> },
          { path: 'fichas-tecnicas', element: <RecipeSheetsScreen /> },
          { path: 'planta', element: <FloorPlanScreen /> },
          { path: 'mesas', element: <TablesScreen /> },
          { path: 'fila', element: <WaitlistScreen /> },
          { path: 'estabelecimento', element: <EstablishmentScreen /> },
          { path: 'horarios', element: <HoursScreen /> },
        ],
      },
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
