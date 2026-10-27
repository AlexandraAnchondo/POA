import * as React from 'react';
import { Outlet } from 'react-router';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import DashboardIcon from '@mui/icons-material/Dashboard';
import logo from './assets/Avatar.png';
import "./styles/App.css";

const BRANDING = {
  title: "Template Toolpad",
  logo: (
    <img
      src={logo}
      alt="Logo"
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        objectFit: "cover",
      }}
    />
  ),
};

export default function App() {
  const navigation = [
        {
          kind: 'header',
          title: 'NAVEGACIÓN',
        },
        {
          segment: 'inicio',
          title: 'Inicio',
          icon: <DashboardIcon />,
          pattern: 'inicio',
        },
      ];

  return (
    <ReactRouterAppProvider
      navigation={navigation}
      branding={BRANDING}
    >
      <Outlet />
    </ReactRouterAppProvider>
  );
}
