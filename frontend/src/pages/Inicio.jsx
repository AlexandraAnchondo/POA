import React, { useState } from 'react';
import {
    Box,
    Typography
} from '@mui/material';

import Portada from '../assets/Portada.png';

// STYLES
import '../styles/Inicio.css';

export default function Inicio() {
    return (
        <Box component="form" className="inicio-container">
            <Typography variant="h4" gutterBottom className='title-inicio'>
                INICIO
            </Typography>
            <img src={Portada} alt="Imagen de Portada" className="portada-image" />
        </Box>
    );
}