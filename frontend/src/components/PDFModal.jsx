import React, { useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Box } from "@mui/material";
import { motion } from "framer-motion";
import '../styles/PDFModal.css';

const API_URL = import.meta.env.VITE_API_URL_DEV;

export default function PDFModal({ data, onClose }) {
    if (!data?.archivo) return null;

    const pdfUrl = useMemo(() => {
        const archivo = data.archivo;

        if (typeof archivo === 'string') {
            return `${API_URL || ''}/${archivo}`;
        }

        if (archivo instanceof File || archivo instanceof Blob) {
            return URL.createObjectURL(archivo);
        }

        return null;
    }, [data.archivo]);

    useEffect(() => {
        return () => {
            if (data.archivo instanceof File || data.archivo instanceof Blob) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl, data.archivo]);

    if (!pdfUrl) return null;

    return ReactDOM.createPortal(
        <Box className="modal-overlay" onClick={onClose} >
            <Box
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                component={motion.div}
                initial={{ scale: 0.5, y: -100, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.5, y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
                <iframe
                    src={pdfUrl}
                    title="Vista PDF"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none'
                    }}
                />

                {/* BOTONES */}
                <div className="button-container">
                    <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="download-btn"
                    >
                        Descargar PDF
                    </a>

                    <button className="close-btn" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </Box>
        </Box>,
        document.body // 🔥 AQUÍ ESTÁ LA MAGIA
    );
}