import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { NotFound } from '@/pages/NotFound';

/**
 * Route table.
 *
 * Every authenticated route sits inside ProtectedRoute → AppShell, so a page added
 * below inherits both the session gate and the layout. It cannot accidentally be left
 * public, which is the failure mode of applying `protect` per-route.
 *
 * Feature pages are `lazy()` as they arrive, so the dashboard's chart bundle never
 * loads for someone who only opens the property list.
 */

const Dashboard = lazy(() =>
  import('@/features/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })),
);

const PipelineBoard = lazy(() =>
  import('@/features/pipeline/PipelineBoard').then((m) => ({ default: m.PipelineBoard })),
);

const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

const PropertyList = lazy(() =>
  import('@/features/properties/PropertyList').then((m) => ({ default: m.PropertyList })),
);

const PropertyDetail = lazy(() =>
  import('@/features/properties/PropertyDetail').then((m) => ({ default: m.PropertyDetail })),
);

const BuyerList = lazy(() =>
  import('@/features/buyers/BuyerList').then((m) => ({ default: m.BuyerList })),
);

const BuyerDetail = lazy(() =>
  import('@/features/buyers/BuyerDetail').then((m) => ({ default: m.BuyerDetail })),
);

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Dashboard /> },
          {
            path: '/properties',
            element: <PropertyList />,
          },
          // The form sheet renders over the list, so both routes mount PropertyList.
          { path: '/properties/new', element: <PropertyList /> },
          { path: '/properties/:id/edit', element: <PropertyList /> },
          { path: '/properties/:id', element: <PropertyDetail /> },
          { path: '/buyers', element: <BuyerList /> },
          { path: '/buyers/:id', element: <BuyerDetail /> },
          { path: '/pipeline', element: <PipelineBoard /> },
          { path: '/settings', element: <SettingsPage /> },
          /**
           * Dev-only design sandbox: the F1 verification surface, kept for building
           * primitives against real tokens.
           *
           * The `import()` sits *inside* the guarded branch on purpose. Declaring it at
           * module scope and only guarding the route entry still emits the chunk —
           * Rollup sees a live dynamic import and cannot know the route is unreachable.
           * That shipped 9.4 KB of dead code and, worse, the service worker precached
           * it. With `import.meta.env.DEV` folded to `false` at build time the whole
           * branch is dropped, import included.
           */
          ...(import.meta.env.DEV
            ? [
                {
                  path: '/_design',
                  lazy: async () => ({
                    Component: (await import('@/pages/DesignSandbox')).DesignSandbox,
                  }),
                },
              ]
            : []),
        ],
      },
    ],
  },

  { path: '*', element: <NotFound /> },
]);
