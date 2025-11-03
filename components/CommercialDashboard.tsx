import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Order, SubOrder, Unit, UserRole, OrderStatus } from '../types';
import { ALL_UNITS } from '../constants';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import FilterControls from './FilterControls';
import OrderTable from './OrderTable';
import SummaryCards from './SummaryCards';


interface FullOrderData extends Order, SubOrder {}

interface CommercialDashboardProps {
    data: FullOrderData[];
    subOrderFinancials: { paidPerSubOrder: Map<string, number> };
    directorName: string;
    onEdit: (subOrderId: string, orderId: string) => void;
    onAddSubOrder: (order: Order) => void;
    onNotifyPayment: (order: Order) => void;
    onAdjustBudget: (order: Order) => void;
    onFilteredDataChange: (data: FullOrderData[]) => void;
    directors: string[];
    executives: string[];
}

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Q0.00';
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
};

// Reusable MetricCard component (copied from ManagementDashboard for encapsulation)
const MetricCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    color: 'green' | 'blue' | 'yellow' | 'indigo' | 'red';
}> = ({ title, value, icon, color }) => {
    const colorClasses = {
        green: 'bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-400',
        blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500 dark:border-yellow-400',
        indigo: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-400',
        red: 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-400',
    };
    const iconContainerClasses = {
        green: 'bg-green-100 dark:bg-green-800/50',
        blue: 'bg-blue-100 dark:bg-blue-800/50',
        yellow: 'bg-yellow-100 dark:bg-yellow-800/50',
        indigo: 'bg-indigo-100 dark:bg-indigo-800/50',
        red: 'bg-red-100 dark:bg-red-800/50',
    };
    return (
        <div className={`p-4 rounded-lg shadow flex items-center border-l-4 ${colorClasses[color]}`}>
            <div className={`p-3 rounded-full mr-4 ${iconContainerClasses[color]}`}>{icon}</div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
};

const CommercialDashboard: React.FC<CommercialDashboardProps> = ({ 
    data, 
    subOrderFinancials, 
    directorName, 
    onEdit, 
    onAddSubOrder, 
    onNotifyPayment, 
    onAdjustBudget,
    onFilteredDataChange,
    directors,
    executives 
}) => {
    const [salesFilters, setSalesFilters] = useState<{ units: Unit[], dateRange: { start: string, end: string } }>({
        units: [],
        dateRange: { start: '', end: '' }
    });
    const [isUnitDropdownOpen, setUnitDropdownOpen] = useState(false);
    const unitDropdownRef = useRef<HTMLDivElement>(null);
    
    // State for the operational table filters
    const [tableFilters, setTableFilters] = useState<{
        unit: Unit[];
        status: string;
        overallStatus: string;
        client: string;
        orderNumber: string;
        invoiceNumber: string;
        dateRange: { start: string; end: string };
        director: string;
        executive: string;
    }>({
        unit: [],
        status: 'all',
        overallStatus: 'all',
        client: '',
        orderNumber: '',
        invoiceNumber: '',
        dateRange: { start: '', end: '' },
        director: 'all',
        executive: 'all',
    });


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) {
                setUnitDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const directorData = useMemo(() => {
        return data.filter(item => item.director === directorName);
    }, [data, directorName]);

    // Data filtered for the Sales Report section
    const filteredSalesData = useMemo(() => {
        return directorData.filter(item => {
            if (salesFilters.units.length > 0 && !salesFilters.units.includes(item.unit)) return false;

            if (!item.creationDate) return false;
            const itemDate = new Date(item.creationDate.replace(/-/g, '\/'));
            const startDate = salesFilters.dateRange.start ? new Date(salesFilters.dateRange.start.replace(/-/g, '\/')) : null;
            const endDate = salesFilters.dateRange.end ? new Date(salesFilters.dateRange.end.replace(/-/g, '\/')) : null;

            if (endDate) endDate.setHours(23, 59, 59, 999);
            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;

            return true;
        });
    }, [directorData, salesFilters]);

    // Data filtered for the operational table
    const filteredTableData = useMemo(() => {
        const baseData = directorData; // Table is always scoped to the director

        const ordersWithSubOrders = new Map<string, SubOrder[]>();
        baseData.forEach(item => {
            if (!ordersWithSubOrders.has(item.orderId)) {
                ordersWithSubOrders.set(item.orderId, []);
            }
            ordersWithSubOrders.get(item.orderId)!.push(item);
        });

        const overallStatusMap = new Map<string, string>();
        ordersWithSubOrders.forEach((subOrders, orderId) => {
            const allCobrado = subOrders.length > 0 && subOrders.every(so => so.status === OrderStatus.Cobrado);
            const allPendiente = subOrders.every(so => so.status === OrderStatus.Pendiente);
            let overallStatus;
            if (allCobrado) overallStatus = "Completado";
            else if (allPendiente) overallStatus = "Pendiente";
            else overallStatus = "En Progreso";
            overallStatusMap.set(orderId, overallStatus);
        });

        return baseData.filter(item => {
            if (tableFilters.overallStatus !== 'all' && overallStatusMap.get(item.orderId) !== tableFilters.overallStatus) return false;
            if (!item.creationDate) return false;
            const itemDate = new Date(item.creationDate.replace(/-/g, '\/'));
            const startDate = tableFilters.dateRange.start ? new Date(tableFilters.dateRange.start.replace(/-/g, '\/')) : null;
            const endDate = tableFilters.dateRange.end ? new Date(tableFilters.dateRange.end.replace(/-/g, '\/')) : null;

            if (endDate) endDate.setHours(23, 59, 59, 999);
            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;
            if (tableFilters.status !== 'all' && item.status !== tableFilters.status) return false;
            if (tableFilters.client && !item.client.toLowerCase().includes(tableFilters.client.toLowerCase())) return false;
            if (tableFilters.orderNumber && !item.orderNumber.toLowerCase().includes(tableFilters.orderNumber.toLowerCase())) return false;
            if (tableFilters.invoiceNumber && !item.invoiceNumber?.toLowerCase().includes(tableFilters.invoiceNumber.toLowerCase())) return false;

            return true;
        });
    }, [directorData, tableFilters]);

    useEffect(() => {
        onFilteredDataChange(filteredTableData);
    }, [filteredTableData, onFilteredDataChange]);


    const salesSummary = useMemo(() => {
        const uniqueOrders = new Map<string, { quotedAmount: number, paidAmount: number, invoiceTotalAmount: number }>();
        filteredSalesData.forEach(item => {
            if (!uniqueOrders.has(item.orderId)) {
                uniqueOrders.set(item.orderId, {
                    quotedAmount: item.quotedAmount || 0,
                    paidAmount: item.paidAmount || 0,
                    invoiceTotalAmount: item.invoiceTotalAmount || 0
                });
            }
        });

        let totalCobrado = 0;
        let totalCotizado = 0;
        let saldoPorCobrar = 0;

        uniqueOrders.forEach(order => {
            totalCobrado += order.paidAmount;
            totalCotizado += order.quotedAmount;
            const balance = order.invoiceTotalAmount - order.paidAmount;
            if (balance > 0) {
                saldoPorCobrar += balance;
            }
        });

        const revenueByUnitMap = new Map<Unit, number>();
        const processedSubOrders = new Set<string>();
        filteredSalesData.forEach(item => {
            if (!processedSubOrders.has(item.id)) {
                const revenue = subOrderFinancials.paidPerSubOrder.get(item.id) || 0;
                if (revenue > 0) {
                    revenueByUnitMap.set(item.unit, (revenueByUnitMap.get(item.unit) || 0) + revenue);
                }
                processedSubOrders.add(item.id);
            }
        });
        
        const revenueByUnit = Array.from(revenueByUnitMap.entries())
            .map(([unit, amount]) => ({ unit, amount }))
            .sort((a, b) => b.amount - a.amount);

        return {
            totalCobrado,
            totalCotizado,
            saldoPorCobrar,
            totalOrders: uniqueOrders.size,
            revenueByUnit
        };
    }, [filteredSalesData, subOrderFinancials.paidPerSubOrder]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSalesFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, [name]: value } }));
    };

    const handleUnitToggle = (unit: Unit) => {
        setSalesFilters(prev => {
            const newUnits = prev.units.includes(unit) ? prev.units.filter(u => u !== unit) : [...prev.units, unit];
            return { ...prev, units: newUnits };
        });
    };
    
    const handleExportPDF = () => {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
        let y = 15;

        // --- PAGE 1: SALES REPORT ---
        doc.setFontSize(18);
        doc.setTextColor("#343A40");
        doc.text(`Reporte de Ventas - ${directorName}`, 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(10);
        doc.setTextColor("#6B7280");
        const filtersApplied = [];
        if (salesFilters.units.length > 0) filtersApplied.push(`Unidades: ${salesFilters.units.join(', ')}`);
        if (salesFilters.dateRange.start || salesFilters.dateRange.end) filtersApplied.push(`Fechas: ${salesFilters.dateRange.start || 'N/A'} a ${salesFilters.dateRange.end || 'N/A'}`);
        if(filtersApplied.length > 0) {
            doc.text(`Filtros: ${filtersApplied.join(' | ')}`, 105, y, { align: 'center' });
        } else {
             doc.text(`Mostrando todos los datos`, 105, y, { align: 'center' });
        }
        y += 15;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor("#343A40");
        doc.text("Resumen General", 14, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`- Ingresos Totales (Cobrado): ${formatCurrency(salesSummary.totalCobrado)}`, 14, y); y += 7;
        doc.text(`- Monto Total Cotizado: ${formatCurrency(salesSummary.totalCotizado)}`, 14, y); y += 7;
        doc.text(`- Órdenes Totales: ${salesSummary.totalOrders}`, 14, y); y += 7;
        doc.text(`- Saldo por Cobrar: ${formatCurrency(salesSummary.saldoPorCobrar)}`, 14, y);
        y += 15;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("Ingresos por Unidad de Negocio", 14, y);
        y += 8;

        if (salesSummary.revenueByUnit.length > 0) {
            salesSummary.revenueByUnit.forEach(item => {
                if (y > 270) { doc.addPage(); y = 15; }
                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                doc.text(item.unit, 14, y);
                doc.text(formatCurrency(item.amount), 196, y, { align: 'right' });
                y += 7;
            });
        } else {
            doc.setFontSize(10);
            doc.setFont(undefined, 'italic');
            doc.text("No se encontraron ingresos para los filtros seleccionados.", 14, y);
        }

        // --- PAGE 2 (and beyond): ORDERS TABLE ---
        doc.addPage();
        y = 15;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor("#343A40");
        doc.text("Detalle de Mis Órdenes", 14, y);
        y += 10;
        
        const groupedData = filteredTableData.reduce<{[key: string]: Order & { subOrders: SubOrder[] }}>((acc, item) => {
            if (!acc[item.orderId]) {
                 acc[item.orderId] = { ...(item as Order), subOrders: [] };
            }
            acc[item.orderId].subOrders.push(item as SubOrder);
            return acc;
        }, {});
        const ordersToPrint = Object.values(groupedData).sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
        
        const tableHeaders = ["No. Orden", "Cliente", "Fecha", "M. Cotizado", "M. Trabajos", "M. Facturado", "Saldo", "Estado"];
        const columnWidths = [20, 38, 20, 20, 20, 20, 20, 20]; // Adjusted widths
        const rowHeight = 8;
        const pageHeight = doc.internal.pageSize.height;
        const bottomMargin = 15;

        const drawTableHeader = () => {
            let currentX = 14;
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setFillColor(243, 244, 246);
            doc.rect(14, y, columnWidths.reduce((a, b) => a + b, 0) + 2, rowHeight, 'F');
            tableHeaders.forEach((header, i) => {
                doc.text(header, currentX + 2, y + 5.5);
                currentX += columnWidths[i];
            });
            y += rowHeight;
        };

        drawTableHeader();
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        
        if (ordersToPrint.length === 0) {
             doc.text("No se encontraron órdenes con los filtros aplicados.", 105, y + 10, { align: 'center' });
        } else {
             ordersToPrint.forEach(order => {
                if (y + rowHeight > pageHeight - bottomMargin) {
                    doc.addPage();
                    y = 15;
                    drawTableHeader();
                }
                
                const subOrdersTotal = order.subOrders.reduce((sum, so) => sum + (so.amount || 0), 0);
                const balance = (order.invoiceTotalAmount || 0) - (order.paidAmount || 0);
                const allCobrado = order.subOrders.length > 0 && order.subOrders.every(so => so.status === OrderStatus.Cobrado);
                const allPendiente = order.subOrders.every(so => so.status === OrderStatus.Pendiente);
                let overallStatusText = allCobrado ? "Completado" : allPendiente ? "Pendiente" : "En Progreso";

                const rowData = [
                    order.orderNumber,
                    order.client,
                    order.creationDate,
                    formatCurrency(order.quotedAmount),
                    formatCurrency(subOrdersTotal),
                    formatCurrency(order.invoiceTotalAmount),
                    formatCurrency(balance),
                    overallStatusText
                ];
                
                let currentX = 14;
                rowData.forEach((cell, i) => {
                     doc.text(String(cell || 'N/A'), currentX + 2, y + 5.5, { maxWidth: columnWidths[i] - 4 });
                     currentX += columnWidths[i];
                });

                doc.setDrawColor(229, 231, 235);
                doc.line(14, y + rowHeight, 14 + columnWidths.reduce((a, b) => a + b, 0) + 2, y + rowHeight);
                y += rowHeight;
            });
        }


        doc.save(`Reporte_Ventas_${directorName}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <main>
            <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <ChartBarIcon className="w-7 h-7 text-brand-primary" />
                        Reporte de Ventas
                    </h2>
                    <button onClick={handleExportPDF} className="flex items-center text-sm bg-gray-700 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-white text-white dark:text-gray-800 font-semibold py-2 px-4 rounded-md transition-colors">
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Exportar a PDF
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="relative" ref={unitDropdownRef}>
                        <button type="button" onClick={() => setUnitDropdownOpen(p => !p)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-left flex justify-between items-center">
                            <span className="truncate">{salesFilters.units.length === 0 ? 'Filtrar por Unidad' : `${salesFilters.units.length} Unidades`}</span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isUnitDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isUnitDropdownOpen && (
                            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            <div className="p-2 flex justify-between border-b border-gray-200 dark:border-gray-700">
                                    <button onClick={() => setSalesFilters(prev => ({...prev, units: ALL_UNITS}))} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Todas</button>
                                    <button onClick={() => setSalesFilters(prev => ({...prev, units: []}))} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Limpiar</button>
                                </div>
                                {ALL_UNITS.map(unit => (
                                    <label key={unit} className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                        <input type="checkbox" className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded" checked={salesFilters.units.includes(unit)} onChange={() => handleUnitToggle(unit)} />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{unit}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <input type="date" name="start" value={salesFilters.dateRange.start} onChange={handleDateChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                        <span className="text-gray-500">-</span>
                        <input type="date" name="end" value={salesFilters.dateRange.end} onChange={handleDateChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <MetricCard title="Ingresos Totales (Cobrado)" value={formatCurrency(salesSummary.totalCobrado)} icon={<CurrencyIcon className="text-green-500" />} color="green" />
                    <MetricCard title="Monto Cotizado" value={formatCurrency(salesSummary.totalCotizado)} icon={<DocumentIcon className="text-blue-500" />} color="blue" />
                    <MetricCard title="Órdenes Totales" value={salesSummary.totalOrders.toString()} icon={<BriefcaseIcon className="text-indigo-500" />} color="indigo" />
                    <MetricCard title="Saldo por Cobrar" value={formatCurrency(salesSummary.saldoPorCobrar)} icon={<CurrencyIcon className="text-red-500" />} color="red" />
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Ingresos por Unidad</h3>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        {salesSummary.revenueByUnit.length > 0 ? (
                            <ul className="space-y-3">
                                {salesSummary.revenueByUnit.map(item => (
                                    <li key={item.unit} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-700 dark:text-gray-200">{item.unit}</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No hay ingresos que mostrar para los filtros seleccionados.</p>
                        )}
                    </div>
                </div>
            </div>

            <SummaryCards 
                data={filteredTableData}
                currentUserRole={UserRole.Comercial}
                currentUserUnit={null}
                subOrderFinancials={subOrderFinancials}
            />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mt-6 p-4">
                <FilterControls 
                    filters={tableFilters} 
                    setFilters={setTableFilters} 
                    isCommercialDirector={true}
                    directors={directors}
                    executives={executives}
                />
                <OrderTable 
                    data={filteredTableData} 
                    onEdit={onEdit}
                    currentUserRole={UserRole.Comercial}
                    currentUserUnit={null}
                    onAddSubOrder={onAddSubOrder}
                    onNotifyPayment={onNotifyPayment}
                    onAdjustBudget={onAdjustBudget}
                />
            </div>

        </main>
    );
};

export default CommercialDashboard;