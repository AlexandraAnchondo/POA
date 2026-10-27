import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
} from '@react-pdf/renderer';
import logoCongreso from '../assets/logo_congreso.png';

const styles = StyleSheet.create({
    page: {
        padding: 20,
        flexDirection: 'column',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid black',
        paddingBottom: 5,
        marginBottom: 10,
    },
    headerCenter: {
        textAlign: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBold: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    headerText: {
        fontSize: 12,
    },
    dateBox: {
        border: '1px solid black',
        padding: 5,
        fontSize: 10,
        textAlign: 'center',
    },
    logoBox: {
        width: 180,
        height: 50,
        textAlign: 'center',
        fontSize: 8,
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
    },
    sectionGray: {
        backgroundColor: '#e0e0e0',
        padding: 5,
        marginTop: 5,
    },
    label: {
        fontSize: 10,
    },
    typeContainer: {
        flexDirection: 'row',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 5,
        marginBottom: 5,
    },
    table: {
        border: '1px solid black',
        marginBottom: 10,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid black',
    },
    tableHeaderCell: {
        flex: 1,
        backgroundColor: '#e0e0e0',
        fontSize: 9,
        padding: 3,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    tableCell: {
        flex: 1,
        fontSize: 9,
        padding: 3,
        textAlign: 'center',
    },
    tableCellBold: {
        flex: 1,
        fontSize: 9,
        padding: 3,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
    },
    firmaBox: {
        width: '40%',
        borderBottom: '1px solid black',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 9,
        paddingTop: 3,
    },
    selloBox: {
        marginTop: 10,
        border: '1px solid black',
        width: 120,
        height: 80,
        textAlign: 'center',
        fontSize: 9,
        alignSelf: 'flex-end',
        fontWeight: 'bold',
    },
    selloText: {
        marginTop: 2,
    },
});

const renderTable = (data, type) => {
    return (
        <View style={styles.table}>
            <View style={styles.tableRow}>
                <Text style={styles.tableHeaderCell}>{type.toUpperCase()}</Text>
                <Text style={styles.tableHeaderCell}>INVENTARIO</Text>
                <Text style={styles.tableHeaderCell}>NO. SERIE</Text>
            </View>
            {['cpu', 'monitor', 'teclado', 'impresora', 'otro'].map((item) => (
                <View style={styles.tableRow} key={item}>
                    <Text style={styles.tableCellBold}>{item.toUpperCase()}</Text>
                    <Text style={styles.tableCell}>{data[`${type.toLowerCase()}_${item}_inventario`] || ''}</Text>
                    <Text style={styles.tableCell}>{data[`${type.toLowerCase()}_${item}_num_serie`] || ''}</Text>
                </View>
            ))}
        </View>
    );
};

const MyDocument = ({ data }) => {
    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View style={styles.logoBox}>
                        <Image
                            src={logoCongreso}
                            style={{ width: 180, height: 50 }}
                        />
                    </View>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerBold}>PODER LEGISLATIVO DEL ESTADO DE BAJA CALIFORNIA</Text>
                        <Text style={styles.headerText}>DEPARTAMENTO DE INFORMÁTICA</Text>
                        <View style={{ height: 10 }} />
                        <Text style={styles.headerBold}>MOVIMIENTO DE EQUIPO DE CÓMPUTO</Text>
                    </View>
                    <View style={styles.dateBox}>
                        <Text>DD MM AA</Text>
                        <Text>{new Date(data.fecha).toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Tipo movimiento */}
                <View style={styles.typeContainer}>
                    <Text>TIPO MOVIMIENTO: </Text>
                    <Text style={{ marginLeft: 10 }}>Entregado {data.tipo_movimiento === 'Entregado' ? 'X' : ''}</Text>
                    <Text style={{ marginLeft: 10 }}>Retirado {data.tipo_movimiento === 'Retirado' ? 'X' : ''}</Text>
                    <Text style={{ marginLeft: 10 }}>Cambio {data.tipo_movimiento === 'Cambio' ? 'X' : ''}</Text>
                </View>

                {/* Oficina y nombre */}
                <View style={styles.sectionGray}>
                    <Text style={styles.label}>OFICINA/DEPTO/PISO: {data.oficina}</Text>
                </View>
                <View style={styles.sectionGray}>
                    <Text style={styles.label}>NOMBRE: {data.nombre_recibe}</Text>
                </View>

                {/* Espacio extra para separar de las tablas */}
                <View style={{ height: 10 }} />

                {/* Tablas */}
                {data.tipo_movimiento === 'Entregado' && renderTable(data, 'entregado')}
                {data.tipo_movimiento === 'Retirado' && renderTable(data, 'retirado')}
                {data.tipo_movimiento === 'Cambio' && (
                    <>
                        {renderTable(data, 'entregado')}
                        {renderTable(data, 'retirado')}
                    </>
                )}

                {/* Firmas */}
                <View style={styles.footerContainer}>
                    <View style={styles.firmaBox}>
                        <Text>QUIEN RECIBE</Text>
                        <View style={{ height: 50 }} />
                        <Text>{data.nombre_recibe}</Text>
                    </View>
                    <View style={styles.firmaBox}>
                        
                        <Text>ENTREGÓ PERSONAL DE INFORMÁTICA</Text>
                        <View style={{ height: 50 }} />
                        <Text>{data.nombre_entrega}</Text>
                    </View>

                    {/* Sello */}
                    <View style={styles.selloBox}>
                        <Text style={styles.selloText}>INVENTARIOS/RECIBIDO</Text>
                    </View>
                </View>

                
            </Page>
        </Document>
    );
};

export default MyDocument;
