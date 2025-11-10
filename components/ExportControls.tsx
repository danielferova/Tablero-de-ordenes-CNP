import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { Order, SubOrder, FinancialMovement, Unit, OrderStatus } from '../types';

interface FullOrderData extends Order, SubOrder {}

interface ExportControlsProps {
    filteredTableData: FullOrderData[];
    fullTableData: FullOrderData[];
    allOrders: Order[];
    allSubOrders: SubOrder[];
    allFinancialMovements: FinancialMovement[];
    allClients: string[];
    allDirectors: string[];
    allExecutives: string[];
    managementFilters: {
        unitFilter: string;
        yearFilter: string;
        monthFilter: string;
        dateRange: { start: string; end: string };
    };
}

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Q0.00';
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
};

const unitNameCorrections: { [key: string]: Unit } = {
    "CNP La Agencia": "CNP Lagencia" as Unit,
    "Publicidad y Movimiento": "Publicidad en Movimiento" as Unit,
    "D´Metal": "D'Metal" as Unit,
};

const getCorrectUnitName = (unitName: string): Unit => {
    return unitNameCorrections[unitName] || unitName as Unit;
};

const directorTitles: { [key: string]: string } = {
    "Michael Marizuya": "Senior",
    "Pedro Luis Martinez": "Junior",
};

const ExportControls: React.FC<ExportControlsProps> = ({ 
    filteredTableData, 
    fullTableData,
    allOrders,
    allSubOrders,
    allFinancialMovements,
    allClients,
    allDirectors,
    allExecutives,
    managementFilters,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredManagementData = useMemo(() => {
        return fullTableData.filter(item => {
            if (!item.creationDate) return false;
            const itemDate = new Date(item.creationDate.replace(/-/g, '\/'));
            
            if (managementFilters.unitFilter !== 'all' && item.unit !== managementFilters.unitFilter) return false;

            if (managementFilters.yearFilter !== 'all') {
                if (itemDate.getUTCFullYear() !== parseInt(managementFilters.yearFilter)) return false;
            }
            
            if (managementFilters.monthFilter !== 'all') {
                if (itemDate.getUTCMonth() !== parseInt(managementFilters.monthFilter)) return false;
            }

            const startDate = managementFilters.dateRange.start ? new Date(managementFilters.dateRange.start.replace(/-/g, '\/')) : null;
            const endDate = managementFilters.dateRange.end ? new Date(managementFilters.dateRange.end.replace(/-/g, '\/')) : null;
            
            if (startDate) startDate.setUTCHours(0, 0, 0, 0);

            if (endDate) {
                endDate.setUTCHours(23, 59, 59, 999);
            }

            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;

            return true;
        });
    }, [fullTableData, managementFilters.unitFilter, managementFilters.yearFilter, managementFilters.monthFilter, managementFilters.dateRange]);

    const managementSummary = useMemo(() => {
        // --- Revenue Calculations ---
        const revenuePerSubOrder = new Map<string, number>();
        allSubOrders.forEach(so => revenuePerSubOrder.set(so.id, 0));
        allFinancialMovements.forEach(m => {
            if (m.subOrderId && m.paidAmount) {
                revenuePerSubOrder.set(
                    m.subOrderId,
                    (revenuePerSubOrder.get(m.subOrderId) || 0) + m.paidAmount
                );
            }
        });
        const globalPaymentsByOrderId = new Map<string, number>();
        allFinancialMovements.forEach(m => {
            if (m.orderId && !m.subOrderId && m.paidAmount) {
                globalPaymentsByOrderId.set(
                    m.orderId,
                    (globalPaymentsByOrderId.get(m.orderId) || 0) + m.paidAmount
                );
            }
        });
        globalPaymentsByOrderId.forEach((totalGlobalPayment, orderId) => {
            const subOrdersForOrder = allSubOrders.filter(so => so.orderId === orderId);
            if (subOrdersForOrder.length === 0) return;
            let totalOutstanding = 0;
            const outstandingBalances = new Map<string, number>();
            subOrdersForOrder.forEach(so => {
                const balance = (so.amount || 0) - (revenuePerSubOrder.get(so.id) || 0);
                if (balance > 0) {
                    totalOutstanding += balance;
                    outstandingBalances.set(so.id, balance);
                }
            });
            if (totalOutstanding > 0) {
                outstandingBalances.forEach((balance, subOrderId) => {
                    const proportion = balance / totalOutstanding;
                    const attributedRevenue = totalGlobalPayment * proportion;
                    const revenueToAdd = Math.min(attributedRevenue, balance);
                    revenuePerSubOrder.set(
                        subOrderId,
                        (revenuePerSubOrder.get(subOrderId) || 0) + revenueToAdd
                    );
                });
            }
        });

        const revenueByUnitDirectorMap = new Map<Unit, { total: number; directors: Map<string, number> }>();
        const processedSubOrderIds = new Set<string>();
        filteredManagementData.forEach(item => {
            if (processedSubOrderIds.has(item.id) || !item.director) return;
            
            const revenue = revenuePerSubOrder.get(item.id) || 0;
            if (revenue > 0) {
                const correctUnit = getCorrectUnitName(item.unit);
                if (!revenueByUnitDirectorMap.has(correctUnit)) {
                    revenueByUnitDirectorMap.set(correctUnit, { total: 0, directors: new Map() });
                }
                const unitData = revenueByUnitDirectorMap.get(correctUnit)!;
                unitData.total += revenue;
                unitData.directors.set(
                    item.director,
                    (unitData.directors.get(item.director) || 0) + revenue
                );
            }
            processedSubOrderIds.add(item.id);
        });
        
        const revenueByUnit = Array.from(revenueByUnitDirectorMap.entries())
            .map(([unit, data]) => ({
                unit,
                amount: data.total,
                directors: Array.from(data.directors.entries()).map(([name, amount]) => ({
                    name,
                    amount,
                    title: directorTitles[name] || ''
                })).sort((a,b) => b.amount - a.amount)
            }))
            .filter(u => u.amount > 0.01)
            .sort((a,b) => b.amount - a.amount);
            
        const totalCobrado = revenueByUnit.reduce((sum, unit) => sum + unit.amount, 0);

        const uniqueOrdersMap = new Map<string, { paidAmount: number; invoiceTotalAmount: number; quotedAmount: number; subOrders: FullOrderData[] }>();
        filteredManagementData.forEach(item => {
             if (!uniqueOrdersMap.has(item.orderId)) {
                uniqueOrdersMap.set(item.orderId, {
                    paidAmount: item.paidAmount || 0,
                    invoiceTotalAmount: item.invoiceTotalAmount || 0,
                    quotedAmount: item.quotedAmount || 0,
                    subOrders: []
                });
            }
            uniqueOrdersMap.get(item.orderId)!.subOrders.push(item);
        });

        const totalFacturadoPorCobrar = Array.from(uniqueOrdersMap.values()).reduce((sum, order) => {
            const balance = (order.invoiceTotalAmount || 0) - (order.paidAmount || 0);
            return sum + (balance > 0 ? balance : 0);
        }, 0);
        
        const totalCotizadoGlobal = Array.from(uniqueOrdersMap.values()).reduce((sum, order) => sum + (order.quotedAmount || 0), 0);
        const totalFacturadoGlobal = Array.from(uniqueOrdersMap.values()).reduce((sum, order) => sum + (order.invoiceTotalAmount || 0), 0);
        const totalPendiente = totalCotizadoGlobal - totalFacturadoGlobal;
        
        // --- Overall Status Calculation ---
        let ordenesCompletadas = 0;
        let ordenesEnProgreso = 0;
        let ordenesPendientes = 0;

        uniqueOrdersMap.forEach(order => {
            if (order.subOrders.length > 0 && order.subOrders.every(so => so.status === OrderStatus.Cobrado)) {
                ordenesCompletadas++;
            } else if (order.subOrders.every(so => so.status === OrderStatus.Pendiente)) {
                ordenesPendientes++;
            } else {
                ordenesEnProgreso++;
            }
        });

        return {
            totalCobrado,
            totalFacturado: totalFacturadoPorCobrar,
            totalPendiente,
            revenueByUnit,
            totalOrders: uniqueOrdersMap.size,
            subOrdenesFacturadas: filteredManagementData.filter(d => d.status === OrderStatus.Facturado).length,
            subOrdenesCobradas: filteredManagementData.filter(d => d.status === OrderStatus.Cobrado).length,
            subOrdenesPendientes: filteredManagementData.filter(d => d.status === OrderStatus.Pendiente).length,
            ordenesCompletadas,
            ordenesEnProgreso,
            ordenesPendientes,
        };
    }, [filteredManagementData, allSubOrders, allFinancialMovements]);

    const handlePdfDownload = () => {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
        let y = 15;
        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        // --- TITLE ---
        doc.setFontSize(18);
        doc.setTextColor("#343A40");
        doc.text("Reporte Gerencial", 105, y, { align: "center" });
        y += 7;

        // --- FILTERS ---
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor("#6B7280");
        const filtersApplied = [];
        if (managementFilters.unitFilter !== 'all') {
            filtersApplied.push(`Unidad: ${managementFilters.unitFilter}`);
        }
        if (managementFilters.dateRange.start && managementFilters.dateRange.end) {
            filtersApplied.push(`Rango: ${managementFilters.dateRange.start} a ${managementFilters.dateRange.end}`);
        } else {
            if (managementFilters.yearFilter !== 'all') {
                filtersApplied.push(`Año: ${managementFilters.yearFilter}`);
            }
            if (managementFilters.monthFilter !== 'all') {
                filtersApplied.push(`Mes: ${months[parseInt(managementFilters.monthFilter)]}`);
            }
        }
        if (filtersApplied.length === 0) {
            filtersApplied.push('Todos los datos');
        }
        doc.text(`Filtros Aplicados: ${filtersApplied.join(' | ')}`, 105, y, { align: "center" });
        y += 10;
        
        // --- OPERATIONAL SUMMARY ---
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor("#343A40");
        doc.text("Resumen Operativo", 14, y);
        y += 8;
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Órdenes Totales: ${managementSummary.totalOrders}`, 14, y);
        doc.text(`Sub-órdenes Cobradas: ${managementSummary.subOrdenesCobradas}`, 110, y);
        y += 7;
        doc.text(`Sub-órdenes Facturadas: ${managementSummary.subOrdenesFacturadas}`, 14, y);
        doc.text(`Sub-órdenes Pendientes: ${managementSummary.subOrdenesPendientes}`, 110, y);
        y += 12;

        // --- FINANCIAL SUMMARY ---
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("Resumen Financiero", 14, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.setTextColor("#00875a");
        doc.text(`Total Cobrado (Ingresos): ${formatCurrency(managementSummary.totalCobrado)}`, 14, y);
        y += 7;
        doc.setTextColor("#0052cc");
        doc.text(`Total Facturado (Por Cobrar): ${formatCurrency(managementSummary.totalFacturado)}`, 14, y);
        y += 7;
        doc.setTextColor("#de350b");
        doc.text(`Total Pendiente (Por Facturar): ${formatCurrency(managementSummary.totalPendiente)}`, 14, y);
        y += 12;

        // --- OVERALL STATUS ---
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor("#343A40");
        doc.text("Estado General de Órdenes", 14, y);
        y += 8;
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.setTextColor("#00875a");
        doc.text(`Completado: ${managementSummary.ordenesCompletadas}`, 14, y);
        doc.setTextColor("#0052cc");
        doc.text(`En Progreso: ${managementSummary.ordenesEnProgreso}`, 80, y);
        doc.setTextColor("#de350b");
        doc.text(`Pendiente: ${managementSummary.ordenesPendientes}`, 150, y);
        y+= 15;
        doc.setTextColor("#343A40");


        // --- INCOME BY UNIT & DIRECTOR ---
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("Ingresos por Unidad y Director", 14, y);
        y += 8;

        if (managementSummary.revenueByUnit.length === 0) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text("No hay datos de ingresos para los filtros seleccionados.", 14, y);
        } else {
             managementSummary.revenueByUnit.forEach(unit => {
                if (y > 270) {
                    doc.addPage();
                    y = 15;
                }
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor("#D9232D");
                doc.text(unit.unit, 14, y);
                doc.text(formatCurrency(unit.amount), 196, y, { align: "right" });
                y += 7;

                unit.directors.forEach(dir => {
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor("#343A40");
                    const directorTitle = dir.title ? `(${dir.title})` : '';
                    doc.text(`- ${dir.name} ${directorTitle}`, 20, y);
                    doc.text(formatCurrency(dir.amount), 196, y, { align: "right" });
                    y += 6;
                });
                
                doc.setDrawColor("#E5E7EB");
                doc.line(14, y, 196, y);
                y += 7;
            });
        }
        
        // --- DETAILED DATA TABLE ---
        doc.addPage();
        y = 15;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor("#343A40");
        doc.text("Detalle de Trabajos (Según Filtros)", 14, y);
        y += 10;

        const tableHeaders = ["No. Orden", "Sub-Orden", "Cliente", "Fecha", "Unidad", "Monto", "Estado"];
        const tableColumnWidths = [25, 25, 50, 20, 35, 20, 20];
        const tableMargin = 14;
        const rowHeight = 8;
        const pageHeight = doc.internal.pageSize.height;
        const bottomMargin = 15;

        const drawTableHeader = () => {
            let currentX = tableMargin;
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setFillColor(243, 244, 246); // gray-100
            doc.rect(tableMargin, y, tableColumnWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
            tableHeaders.forEach((header, i) => {
                doc.text(header, currentX + 2, y + 5.5);
                currentX += tableColumnWidths[i];
            });
            y += rowHeight;
        };

        drawTableHeader();

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');

        if (filteredManagementData.length === 0) {
            doc.text("No hay trabajos para mostrar con los filtros seleccionados.", 105, y + 10, { align: 'center' });
        } else {
            filteredManagementData.forEach(item => {
                if (y + rowHeight > pageHeight - bottomMargin) {
                    doc.addPage();
                    y = 15;
                    drawTableHeader();
                }

                const rowData = [
                    item.orderNumber, item.subOrderNumber, item.client,
                    item.creationDate, item.unit, formatCurrency(item.amount), item.status
                ];

                let currentX = tableMargin;
                rowData.forEach((cell, i) => {
                    doc.text(String(cell || 'N/A'), currentX + 2, y + 5.5, { maxWidth: tableColumnWidths[i] - 4 });
                    currentX += tableColumnWidths[i];
                });

                doc.setDrawColor(229, 231, 235);
                doc.line(tableMargin, y + rowHeight, tableMargin + tableColumnWidths.reduce((a, b) => a + b, 0), y + rowHeight);
                y += rowHeight;
            });
        }

        doc.save(`Reporte_Gerencial_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsOpen(false);
    };

    const handleExcelDownload = (data: FullOrderData[], filename: string) => {
        const XLSX = (window as any).XLSX;
        if (data.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }
        const dataToExport = data.map(item => ({
            'No. Orden': item.orderNumber, 'Cliente': item.client, 'Fecha Creación': item.creationDate,
            'Monto Cotizado': item.quotedAmount, 'No. Sub-Orden': item.subOrderNumber, 'Unidad': item.unit,
            'Tipo Trabajo (Tarea)': item.workType, 'Descripción (Tarea)': item.description, 'Monto (Tarea)': item.amount,
            'Estado (Tarea)': item.status, 'No. Factura Gral.': item.invoiceNumber, 'Fecha Factura': item.invoiceDate,
            'Monto Factura': item.invoiceTotalAmount, 'Método Pago': item.paymentMethod, 'Fecha Pago': item.paymentDate,
            'Monto Pagado': item.paidAmount, 'Saldo Pendiente': (item.invoiceTotalAmount || 0) - (item.paidAmount || 0),
            'Director': item.director, 'Ejecutivo': item.executive
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Órdenes');
        XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
        setIsOpen(false);
    };
    
    const handleExcelBackupDownload = () => {
        const XLSX = (window as any).XLSX;
        const workbook = XLSX.utils.book_new();

        // 1. Orders Sheet
        const ordersData = allOrders.map(o => ({
            'ID Orden': o.id,
            'No. Orden': o.orderNumber,
            'Cliente': o.client,
            'Descripción': o.description,
            'Tipo Trabajo': o.workType,
            'Fecha Creación': o.creationDate,
            'Monto Cotizado': o.quotedAmount,
            'No. Factura Gral.': o.invoiceNumber,
            'Fecha Factura Gral.': o.invoiceDate,
            'Fecha Pago Gral.': o.paymentDate,
            'Método Pago': o.paymentMethod,
            'Monto Facturado Total': o.invoiceTotalAmount,
            'Monto Pagado Total': o.paidAmount,
            'Ejecutivo': o.executive,
            'Director': o.director,
            'Tipo Facturación': o.billingType,
            'Observaciones Financieras': o.financialObservations,
        }));
        const ordersSheet = XLSX.utils.json_to_sheet(ordersData);
        XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Órdenes');

        // 2. Sub-Orders Sheet
        const subOrdersData = allSubOrders.map(so => ({
            'ID Tarea': so.id,
            'ID Orden Parent': so.orderId,
            'No. Tarea': so.subOrderNumber,
            'Unidad': so.unit,
            'Tipo Trabajo': so.workType,
            'Descripción': so.description,
            'Monto Tarea': so.amount,
            'Observaciones': so.observations,
            'Estado': so.status,
            'Fecha Creación': so.creationDate,
        }));
        const subOrdersSheet = XLSX.utils.json_to_sheet(subOrdersData);
        XLSX.utils.book_append_sheet(workbook, subOrdersSheet, 'Tareas');

        // 3. Financial Movements Sheet
        const financialMovementsData = allFinancialMovements.map(fm => ({
            'ID Movimiento': fm.id,
            'ID Tarea Asociada': fm.subOrderId,
            'ID Orden Asociada': fm.orderId,
            'No. Factura': fm.invoiceNumber,
            'Fecha Factura': fm.invoiceDate,
            'Monto Facturado': fm.invoiceAmount,
            'Fecha Pago': fm.paymentDate,
            'Monto Pagado': fm.paidAmount,
            'Fecha Creación Mov.': fm.creationDate,
            'Emisor Nombre': fm.issuerName,
            'Emisor NIT': fm.issuerNit,
            'Receptor Nombre': fm.receiverName,
            'Receptor NIT': fm.receiverNit,
            'Fecha Hora Emisión XML': fm.issueDateTime,
            'UUID Autorización': fm.authorizationUuid,
            'Serie DTE': fm.series,
            'Número DTE': fm.dteNumber,
            'Agente Retención IVA': fm.vatWithholdingAgent,
        }));
        const financialMovementsSheet = XLSX.utils.json_to_sheet(financialMovementsData);
        XLSX.utils.book_append_sheet(workbook, financialMovementsSheet, 'Movimientos Financieros');

        // 4. Clients, Directors, Executives Sheets
        const clientsData = allClients.map(name => ({ 'Nombre Cliente': name }));
        const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
        XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clientes');
        
        const directorsData = allDirectors.map(name => ({ 'Nombre Director': name }));
        const directorsSheet = XLSX.utils.json_to_sheet(directorsData);
        XLSX.utils.book_append_sheet(workbook, directorsSheet, 'Directores');

        const executivesData = allExecutives.map(name => ({ 'Nombre Ejecutivo': name }));
        const executivesSheet = XLSX.utils.json_to_sheet(executivesData);
        XLSX.utils.book_append_sheet(workbook, executivesSheet, 'Ejecutivos');

        XLSX.writeFile(workbook, `CNP_Backup_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);
        setIsOpen(false);
    };

    const handleBackupDownload = () => {
        const backupData = {
            orders: allOrders,
            subOrders: allSubOrders,
            financialMovements: allFinancialMovements,
            clients: allClients,
            directors: allDirectors,
            executives: allExecutives,
            backupDate: new Date().toISOString()
        };

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `CNP_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center justify-center bg-gray-700 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-white text-white dark:text-gray-800 font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out shadow-md text-sm"
            >
                Exportar y Descargar
                <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                        <button onClick={handlePdfDownload} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            <DocumentIcon className="w-4 h-4 mr-3 text-red-500" />
                            Reporte Gerencial (PDF)
                        </button>
                        <button onClick={() => handleExcelDownload(filteredTableData, 'Reporte_Ordenes_Filtrado')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                             <DownloadIcon className="w-4 h-4 mr-3 text-green-500" />
                            Tabla Filtrada (Excel)
                        </button>
                         <button onClick={() => handleExcelDownload(fullTableData, 'Reporte_Ordenes_Completo')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            <DownloadIcon className="w-4 h-4 mr-3 text-green-500" />
                            Todas las Órdenes (Excel)
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                        <button onClick={handleExcelBackupDownload} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                           <DatabaseIcon className="w-4 h-4 mr-3 text-green-500" />
                            Copia de Seguridad (Excel)
                        </button>
                        <button onClick={handleBackupDownload} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                           <DatabaseIcon className="w-4 h-4 mr-3 text-blue-500" />
                            Copia de Seguridad (JSON)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportControls;