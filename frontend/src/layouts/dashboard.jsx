import * as React from 'react';
import { Outlet } from 'react-router';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import LogoutButton from '../components/LogoutButton';

// ICONS
import {
  Settings as SettingsIcon
} from '@mui/icons-material';

// MODALS
import CambiarPasswordModal from '../components/modals/CambiarPasswordModal';

export default function Layout() {
  const [openPasswordModal, setOpenPasswordModal] = React.useState(false);
  const [colorScheme, setColorScheme] = React.useState(
    document.documentElement.getAttribute('data-toolpad-color-scheme') || 'light'
  );

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      const scheme = document.documentElement.getAttribute('data-toolpad-color-scheme') || 'light';
      setColorScheme(scheme);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-toolpad-color-scheme'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <DashboardLayout
        slots={{
          sidebarFooter: () => (
            <Box sx={{ p: 2 }}>
              <Tooltip title="Cambiar contraseña">
                <IconButton onClick={() => setOpenPasswordModal(true)}>
                  <SettingsIcon className="settings-btn" />
                </IconButton>
              </Tooltip>
              <LogoutButton />
            </Box>
          ),
        }}
      >
        {/* CONTENIDO */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: "calc(100vh - 64px)", // evita superposición
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Outlet />
          </Box>

          {/* Footer */}
          <Box
            component="footer"
            sx={{
              textAlign: "center",
              p: 2,
              backgroundColor: colorScheme === "light" ? "#f5f5f5" : "#222",
              color: colorScheme === "light" ? "#333" : "#ddd",
            }}
          >
            <Typography variant="body2">
              © {new Date().getFullYear()} Congreso del Estado de Baja California.
            </Typography>
          </Box>
        </Box>
      </DashboardLayout>



      {/* MODAL CAMBIO CONTRASEÑA */}
      <CambiarPasswordModal
        open={openPasswordModal}
        onClose={() => setOpenPasswordModal(false)}
      />
    </>
  );
}