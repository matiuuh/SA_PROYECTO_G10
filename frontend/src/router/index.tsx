import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PublicLayout, PrivateLayout } from '@/components/templates'
import { LandingPage, LoginPage, RegisterPage } from '@/pages/public'
import { DashboardPage } from '@/pages/private'

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
      { path: '/dashboard', element: <DashboardPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
