import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from './App';
import Layout from './layouts/dashboard';
import Inicio from './pages/Inicio';
import Avance from './pages/Avance';
import Login from './pages/Login';

function PrivateRoute({ children }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

const router = createBrowserRouter(
  [
    {
      path: "/login",
      element: <Login />,
    },
    {
      Component: App,
      children: [
        { index: true, element: <Navigate to="login" /> },
        {
          path: "/",
          Component: Layout,
          children: [
            {
              path: "inicio",
              element: (
                <PrivateRoute>
                  <Inicio />
                </PrivateRoute>
              )
            },
            {
              path: "avance",
              element: (
                <PrivateRoute>
                  <Avance />
                </PrivateRoute>
              )
            },
          ],
        },
      ],
    }
  ],
  {
    basename: '/poa',
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
