import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PublicLayout, PrivateLayout } from '@/components/templates'
import { LandingPage, LoginPage, RegisterPage } from '@/pages/public'
import {
  DashboardPage,
  SubscriptionPlansPage,
  SubscriptionCheckoutPage,
  SubscriptionConfirmationPage,
  UserProfilePage,
  UserSettingsPage,
  ProfileSelectionPage,
} from '@/pages/private'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/',         element: <LandingPage /> },
      { path: '/login',    element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <PrivateLayout />,
    children: [
      { path: '/profiles',                    element: <ProfileSelectionPage /> },
      { path: '/dashboard',                   element: <DashboardPage /> },
      { path: '/subscription/plans',          element: <SubscriptionPlansPage /> },
      { path: '/subscription/checkout',       element: <SubscriptionCheckoutPage /> },
      { path: '/subscription/confirmation',   element: <SubscriptionConfirmationPage /> },
      { path: '/profile',                     element: <UserProfilePage /> },
      { path: '/settings',                    element: <UserSettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
