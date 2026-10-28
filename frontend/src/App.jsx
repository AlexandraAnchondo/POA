import * as React from 'react';
import { Outlet } from 'react-router';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import logo from './assets/Avatar.png';
import "./styles/App.css";

const BRANDING = {
  title: "POA",
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
  const tieneUnidadResponsable =
    localStorage.getItem('tieneUnidadResponsable') === 'true';
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
        ...(tieneUnidadResponsable ? [{
          segment: 'avance',
          title: 'Avance del POA',
          icon: <AssessmentIcon />,
          pattern: 'avance',
        }] : []),
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
