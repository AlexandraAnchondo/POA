import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

import poaCongreso from '../assets/POA 2026 CONGRESO BC.xlsx?url';
import formatoCumplimiento from '../assets/POA Formato cumplimiento.docx?url';
import '../styles/Formatos.css';

const formatos = [
  {
    title: 'POA 2026 Congreso BC',
    description: 'Documento de trabajo del Programa Operativo Anual 2026.',
    type: 'Excel',
    fileName: 'POA 2026 CONGRESO BC.xlsx',
    href: poaCongreso,
    Icon: TableChartOutlinedIcon,
  },
  {
    title: 'Formato de cumplimiento',
    description: 'Formato para el registro y seguimiento del cumplimiento.',
    type: 'Word',
    fileName: 'POA Formato cumplimiento.docx',
    href: formatoCumplimiento,
    Icon: InsertDriveFileOutlinedIcon,
  },
];

export default function Formatos() {
  return (
    <Box component="main" className="formatos-container">
      <Box className="formatos-heading">
        <Typography variant="h4" className="formatos-title">
          Formatos de Gestión del POA
        </Typography>
        <Typography variant="body1" className="formatos-subtitle">
          Descarga los documentos disponibles para la gestión y seguimiento del POA.
        </Typography>
      </Box>

      <Box className="formatos-grid">
        {formatos.map(({ title, description, type, fileName, href, Icon }) => (
          <Card className="formato-card" key={fileName} elevation={0}>
            <CardContent className="formato-card-content">
              <Box className="formato-icon">
                <Icon />
              </Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" className="formato-card-title">
                  {title}
                </Typography>
                <Chip label={type} size="small" className="formato-chip" />
              </Stack>
              <Typography variant="body2" className="formato-description">
                {description}
              </Typography>
              <Button
                component="a"
                href={href}
                download={fileName}
                variant="contained"
                startIcon={<DownloadIcon />}
                className="formato-download"
                aria-label={`Descargar ${title}`}
              >
                Descargar archivo
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
