import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout, PrivateLayout, AuthLayout, AdminLayout } from '@/components/templates'
import { LandingPage, AuthPage, NotFoundPage } from '@/pages/public'
import {
  PanelPage,
  SubscriptionPlansPage,
  SubscriptionCheckoutPage,
  SubscriptionConfirmationPage,
  UserProfilePage,
  UserSettingsPage,
  ProfileSelectionPage,
  MovieDetailPage,
  AdminDashboardPage,
  UploadMoviePage,
  UploadSeriesPage,
} from '@/pages/private'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login',    element: <AuthPage /> },
      { path: '/register', element: <AuthPage /> },
    ],
  },
  {
    element: <PrivateLayout />,
    children: [
      { path: '/profiles',                    element: <ProfileSelectionPage /> },
      { path: '/panel',                       element: <PanelPage /> },
      { path: '/subscription/plans',          element: <SubscriptionPlansPage /> },
      { path: '/subscription/checkout',       element: <SubscriptionCheckoutPage /> },
      { path: '/subscription/confirmation',   element: <SubscriptionConfirmationPage /> },
      { path: '/profile',                     element: <UserProfilePage /> },
      { path: '/settings',                    element: <UserSettingsPage /> },
      { path: '/movie/:id',                   element: <MovieDetailPage /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      { path: '/admin',               element: <AdminDashboardPage /> },
      { path: '/admin/upload/movie',  element: <UploadMoviePage /> },
      { path: '/admin/upload/series', element: <UploadSeriesPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
