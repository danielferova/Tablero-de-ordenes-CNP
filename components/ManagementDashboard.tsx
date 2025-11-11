import React, { useState, useMemo } from 'react';
import { Order, SubOrder, Unit, OrderStatus, FinancialMovement, TaxType } from '../types';
import { ALL_UNITS } from '../constants';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ClockIcon } from './icons/ClockIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface FullOrderData extends Order, SubOrder {}

interface ManagementDashboardProps {
    data: FullOrderData[];
    subOrders: SubOrder[];
    financialMovements: FinancialMovement[];
    clients: string[];
    directors: string[];
    executives: string[];
    subOrderFinancials: {
        invoicedPerSubOrder: Map<string, number>;
        paidPerSubOrder: Map<string, number>;
    };
    filters: {
        unitFilter: string;
        yearFilter: string;
        monthFilter: string;
        dateRange: { start: string; end: string; };
    };
    setFilters: {
        setUnitFilter: (value: string) => void;
        setYearFilter: (value: string) => void;
        setMonthFilter: (value: string) => void;
        setDateRange: (value: { start: string; end: string; }) => void;
    };
}

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Q0.00';
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
};

const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return dateString;
}

const getStatusChipClass = (status: OrderStatus) => {
    switch (status) {
        case OrderStatus.Pendiente: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        case OrderStatus.Facturado: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case OrderStatus.Cobrado: return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

const unitNameCorrections: { [key: string]: Unit } = {
    "CNP La Agencia": Unit.CNPAgencia,
    "Publicidad y Movimiento": Unit.PublicidadMovimiento,
    "D´Metal": Unit.Dmetal,
};

const getCorrectUnitName = (unitName: string): Unit => {
    return unitNameCorrections[unitName] || unitName as Unit;
};

const directorTitles: { [key: string]: string } = {
    "Michael Marizuya": "Senior",
    "Pedro Luis Martinez": "Junior",
};

type AnalysisType = 'client' | 'unit' | 'director' | 'executive';


const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ data, subOrders, financialMovements, clients, directors, executives, subOrderFinancials, filters, setFilters }) => {
    // State for Unified Detailed Analysis
    const [analysisType, setAnalysisType] = useState<AnalysisType>('client');
    const [selectedAnalysisEntity, setSelectedAnalysisEntity] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState('');
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [analysisDateRange, setAnalysisDateRange] = useState({ start: '', end: '' });

    const { invoicedPerSubOrder, paidPerSubOrder } = subOrderFinancials;

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        data.forEach(item => {
            if (item && item.creationDate) {
                const date = new Date(item.creationDate.replace(/-/g, '\/'));
                if (!isNaN(date.getTime())) {
                    years.add(date.getUTCFullYear());
                }
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [data]);


    const filteredData = useMemo(() => {
        return data.filter(item => {
            if (!item.creationDate) return false;
            const itemDate = new Date(item.creationDate.replace(/-/g, '\/'));
            
            if (filters.unitFilter !== 'all' && item.unit !== filters.unitFilter) return false;

            if (filters.yearFilter !== 'all') {
                if (itemDate.getUTCFullYear() !== parseInt(filters.yearFilter)) return false;
            }
            
            if (filters.monthFilter !== 'all') {
                if (itemDate.getUTCMonth() !== parseInt(filters.monthFilter)) return false;
            }

            const startDate = filters.dateRange.start ? new Date(filters.dateRange.start.replace(/-/g, '\/')) : null;
            const endDate = filters.dateRange.end ? new Date(filters.dateRange.end.replace(/-/g, '\/')) : null;
            
            if (startDate) startDate.setUTCHours(0, 0, 0, 0);

            if (endDate) {
                endDate.setUTCHours(23, 59, 59, 999);
            }

            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;

            return true;
        });
    }, [data, filters.unitFilter, filters.yearFilter, filters.monthFilter, filters.dateRange]);

    const summary = useMemo(() => {
        // --- Financial Calculations ---
        const calculateNetTotal = (movements: FinancialMovement[], amountField: 'invoiceAmount' | 'paidAmount'): number => {
            return movements.reduce((sum, m) => {
                const grossAmount = m[amountField] || 0;
                if (grossAmount === 0) return sum;
                let netAmount = grossAmount;
                if (m.taxType === TaxType.IVA) {
                    netAmount = grossAmount / 1.12;
                } else if (m.taxType === TaxType.IVA_TIMBRE) {
                    netAmount = grossAmount / 1.125;
                }
                return sum + netAmount;
            }, 0);
        };

        const uniqueSubOrdersInFilter = new Map<string, SubOrder>();
        filteredData.forEach(item => {
            if (!uniqueSubOrdersInFilter.has(item.id)) {
                uniqueSubOrdersInFilter.set(item.id, item);
            }
        });
        const subOrderIds = Array.from(uniqueSubOrdersInFilter.keys());
        const orderIds = new Set(Array.from(uniqueSubOrdersInFilter.values()).map(so => so.orderId));
        
        const relevantFinancialMovements = financialMovements.filter(fm => 
            (fm.subOrderId && subOrderIds.includes(fm.subOrderId)) || 
            (fm.orderId && !fm.subOrderId && orderIds.has(fm.orderId))
        );
        
        const totalCobradoBruto = relevantFinancialMovements.reduce((sum, fm) => sum + (fm.paidAmount || 0), 0);
        const ventaRealCobradaNeta = calculateNetTotal(relevantFinancialMovements, 'paidAmount');
        const totalFacturadoBruto = relevantFinancialMovements.reduce((sum, fm) => sum + (fm.invoiceAmount || 0), 0);
        const ventaRealFacturadaNeta = calculateNetTotal(relevantFinancialMovements, 'invoiceAmount');
        const saldoPorCobrar = totalFacturadoBruto - totalCobradoBruto;
        
        const totalTrabajos = Array.from(uniqueSubOrdersInFilter.values()).reduce((sum, so) => sum + (so.amount || 0), 0);
        const pendientePorFacturar = Math.max(0, totalTrabajos - totalFacturadoBruto);

        // --- Operational Calculations ---
        const totalOrders = orderIds.size;
        const subOrdenesFacturadas = filteredData.filter(d => d.status === OrderStatus.Facturado).length;
        const subOrdenesCobradas = filteredData.filter(d => d.status === OrderStatus.Cobrado).length;
        const subOrdenesPendientes = filteredData.filter(d => d.status === OrderStatus.Pendiente).length;

        // --- Revenue by Unit (for the chart) ---
        const revenueByUnitDirectorMap = new Map<Unit, { total: number; directors: Map<string, number> }>();
        const processedSubOrderIds = new Set<string>();

        filteredData.forEach(item => {
            if (processedSubOrderIds.has(item.id) || !item.director) return;
            
            const revenue = paidPerSubOrder.get(item.id) || 0;
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
            
        return {
            totalCobradoBruto,
            ventaRealCobradaNeta,
            totalFacturadoBruto,
            ventaRealFacturadaNeta,
            saldoPorCobrar,
            pendientePorFacturar,
            revenueByUnit,
            totalOrders,
            subOrdenesFacturadas,
            subOrdenesCobradas,
            subOrdenesPendientes
        };
    }, [filteredData, financialMovements, paidPerSubOrder]);

    const detailedAnalysis = useMemo(() => {
        if (!selectedAnalysisEntity) return null;

        let entitySubOrders = data.filter(item => {
            switch(analysisType) {
                case 'client': return item.client === selectedAnalysisEntity;
                case 'unit': return item.unit === selectedAnalysisEntity;
                case 'director': return item.director === selectedAnalysisEntity;
                case 'executive': return item.executive === selectedAnalysisEntity;
                default: return false;
            }
        });

        const dateFilteredSubOrders = entitySubOrders.filter(item => {
            if (!item.creationDate) return false;
            const itemDate = new Date(item.creationDate.replace(/-/g, '\/'));
            const startDate = analysisDateRange.start ? new Date(analysisDateRange.start.replace(/-/g, '\/')) : null;
            const endDate = analysisDateRange.end ? new Date(analysisDateRange.end.replace(/-/g, '\/')) : null;
            if (endDate) endDate.setHours(23, 59, 59, 999);

            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;
            
            return true;
        });
        
        const entityOrderIds = new Set(dateFilteredSubOrders.map(so => so.orderId));
        
        const totalRevenue = Array.from(entityOrderIds).reduce((sum: number, orderId) => {
            const order = data.find(so => so.orderId === orderId);
            return sum + Number(order?.paidAmount || 0);
        }, 0);
        
        const totalInvoiced = Array.from(entityOrderIds).reduce((sum: number, orderId) => {
            const order = data.find(so => so.orderId === orderId);
            return sum + Number(order?.invoiceTotalAmount || 0);
        }, 0);

        const balanceDue = Number(totalInvoiced) - Number(totalRevenue);
        
        const activeOrders = Array.from(entityOrderIds).filter(orderId => {
            const subOrdersForThisOrder = dateFilteredSubOrders.filter(so => so.orderId === orderId);
            return !subOrdersForThisOrder.every(so => so.status === OrderStatus.Cobrado);
        }).length;

        const augmentedSubOrders = dateFilteredSubOrders.map(so => {
            const subOrderInvoicedAmount = invoicedPerSubOrder.get(so.id) || 0;
            const subOrderPaidAmount = paidPerSubOrder.get(so.id) || 0;
            const subOrderBalance = subOrderInvoicedAmount - subOrderPaidAmount;

            return {
                ...so,
                subOrderInvoicedAmount,
                subOrderPaidAmount,
                subOrderBalance,
            };
        });

        return {
            totalRevenue,
            balanceDue: balanceDue > 0 ? balanceDue : 0,
            activeOrders,
            subOrders: augmentedSubOrders.sort((a, b) => {
                const timeA = a.creationDate ? new Date(a.creationDate.replace(/-/g, "/")).getTime() : NaN;
                const timeB = b.creationDate ? new Date(b.creationDate.replace(/-/g, "/")).getTime() : NaN;

                if (isNaN(timeA) && isNaN(timeB)) return 0;
                if (isNaN(timeA)) return 1;
                if (isNaN(timeB)) return -1;
                
                return Number(timeB) - Number(timeA);
            })
        };
    }, [selectedAnalysisEntity, analysisType, data, analysisDateRange, invoicedPerSubOrder, paidPerSubOrder]);


    const currentSearchList = useMemo(() => {
        switch(analysisType) {
            case 'client': return clients;
            case 'unit': return ALL_UNITS;
            case 'director': return directors;
            case 'executive': return executives;
            default: return [];
        }
    }, [analysisType, clients, directors, executives]);

    const filteredSearchList = useMemo(() => {
        if (!searchInput) return [];
        return currentSearchList.filter(c => c.toLowerCase().includes(searchInput.toLowerCase()));
    }, [searchInput, currentSearchList]);

    const handleAnalysisTypeChange = (type: AnalysisType) => {
        setAnalysisType(type);
        setSelectedAnalysisEntity(null);
        setSearchInput('');
        setAnalysisDateRange({ start: '', end: '' });
    };

    const analysisTypeLabels: Record<AnalysisType, string> = {
        client: 'Cliente',
        unit: 'Unidad',
        director: 'Director',
        executive: 'Ejecutivo'
    };

    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Dashboard Gerencial y Financiero</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <select onChange={(e) => setFilters.setUnitFilter(e.target.value)} value={filters.unitFilter} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option value="all">Todas las Unidades</option>
                    {ALL_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
                <select onChange={(e) => setFilters.setYearFilter(e.target.value)} value={filters.yearFilter} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option value="all">Todos los Años</option>
                    {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <select onChange={(e) => setFilters.setMonthFilter(e.target.value)} value={filters.monthFilter} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option value="all">Todos los Meses</option>
                    {months.map((month, index) => <option key={month} value={index}>{month}</option>)}
                </select>
                <input type="date" name="start" placeholder="dd/mm/aaaa" value={filters.dateRange.start} onChange={e => setFilters.setDateRange({ ...filters.dateRange, start: e.target.value })} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                <input type="date" name="end" placeholder="dd/mm/aaaa" value={filters.dateRange.end} onChange={e => setFilters.setDateRange({ ...filters.dateRange, end: e.target.value })} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 mt-6">Resumen Financiero</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <MetricCard title="Total Cobrado (Ingresos Brutos)" value={formatCurrency(summary.totalCobradoBruto)} icon={<CurrencyIcon className="text-green-500"/>} color="green" />
                <MetricCard title="Venta Real Cobrada (Neto)" value={formatCurrency(summary.ventaRealCobradaNeta)} icon={<CurrencyIcon className="text-green-500"/>} color="green" />
                <MetricCard title="Total Facturado (Acumulado Bruto)" value={formatCurrency(summary.totalFacturadoBruto)} icon={<DocumentIcon className="text-blue-500"/>} color="blue" />
                <MetricCard title="Venta Real Facturada (Neto)" value={formatCurrency(summary.ventaRealFacturadaNeta)} icon={<DocumentIcon className="text-blue-500"/>} color="blue" />
                <MetricCard title="Saldo por Cobrar" value={formatCurrency(summary.saldoPorCobrar)} icon={<ClockIcon className="text-red-500"/>} color="red" />
                <MetricCard title="Pendiente por Facturar" value={formatCurrency(summary.pendientePorFacturar)} icon={<ClockIcon className="text-yellow-500"/>} color="yellow" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 mt-6">Resumen Operativo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                 <MetricCard title="Órdenes Totales" value={summary.totalOrders.toString()} icon={<BriefcaseIcon className="text-indigo-500"/>} color="indigo" />
                 <MetricCard title="Sub-órdenes Facturadas" value={summary.subOrdenesFacturadas.toString()} icon={<DocumentIcon className="text-blue-500"/>} color="blue" />
                 <MetricCard title="Sub-órdenes Cobradas" value={summary.subOrdenesCobradas.toString()} icon={<CheckCircleIcon className="text-green-500"/>} color="green" />
                 <MetricCard title="Sub-órdenes Pendientes" value={summary.subOrdenesPendientes.toString()} icon={<ClockIcon className="text-yellow-500"/>} color="yellow" />
            </div>

            <div className="mt-8 border-t-2 border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Análisis Detallado</h2>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                        {(['client', 'unit', 'director', 'executive'] as AnalysisType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => handleAnalysisTypeChange(type)}
                                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${analysisType === type ? 'bg-brand-primary text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                {analysisTypeLabels[type]}
                            </button>
                        ))}
                    </div>
                     <div className="relative w-full sm:w-auto flex flex-wrap items-center gap-2">
                        <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                            {analysisType === 'unit' ? (
                                <select
                                    value={selectedAnalysisEntity || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSelectedAnalysisEntity(value || null);
                                        setSearchInput(value);
                                    }}
                                    className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                                >
                                    <option value="">Seleccionar Unidad...</option>
                                    {ALL_UNITS.map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        placeholder={`Buscar por ${analysisTypeLabels[analysisType]}...`}
                                        value={searchInput}
                                        onChange={e => { setSearchInput(e.target.value); setDropdownOpen(true); }}
                                        onFocus={() => setDropdownOpen(true)}
                                        onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                                        className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                                    />
                                    {isDropdownOpen && filteredSearchList.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                            <ul>
                                                {filteredSearchList.map(item => (
                                                    <li key={item} onMouseDown={() => {
                                                        setSelectedAnalysisEntity(item);
                                                        setSearchInput(item);
                                                        setDropdownOpen(false);
                                                    }} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                             <input type="date" name="start" value={analysisDateRange.start} onChange={e => setAnalysisDateRange(prev => ({ ...prev, start: e.target.value }))} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm" />
                             <span className="text-gray-500 dark:text-gray-400">-</span>
                             <input type="date" name="end" value={analysisDateRange.end} onChange={e => setAnalysisDateRange(prev => ({ ...prev, end: e.target.value }))} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm" />
                             {(analysisDateRange.start || analysisDateRange.end) && (
                                <button onClick={() => setAnalysisDateRange({ start: '', end: '' })} className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2">Limpiar</button>
                             )}
                        </div>
                    </div>
                </div>

                {detailedAnalysis ? (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Mostrando Análisis para: <span className="text-brand-primary">{selectedAnalysisEntity}</span></h3>
                            <button onClick={() => { setSelectedAnalysisEntity(null); setSearchInput(''); setAnalysisDateRange({ start: '', end: '' }); }} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Limpiar selección</button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                             <MetricCard title="Ingresos Totales (Cobrado)" value={formatCurrency(detailedAnalysis.totalRevenue)} icon={<CurrencyIcon className="text-green-500"/>} color="green" />
                             <MetricCard title="Saldo Pendiente (Por Cobrar)" value={formatCurrency(detailedAnalysis.balanceDue)} icon={<DocumentIcon className="text-red-500"/>} color="red" />
                             <MetricCard title="Órdenes Activas" value={detailedAnalysis.activeOrders.toString()} icon={<BriefcaseIcon className="text-indigo-500"/>} color="indigo" />
                        </div>

                        <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Detalle de Trabalhos</h4>
                        <div className="overflow-x-auto max-h-96">
                             <table className="min-w-full text-sm">
                                <thead className="bg-gray-200 dark:bg-gray-700 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left">No. Orden</th>
                                        <th className="p-2 text-left">Sub-Orden</th>
                                        <th className="p-2 text-left">Unidad</th>
                                        <th className="p-2 text-left">Descripción</th>
                                        <th className="p-2 text-left">Monto Tarea</th>
                                        <th className="p-2 text-left">Monto Facturado</th>
                                        <th className="p-2 text-left">Monto Pagado</th>
                                        <th className="p-2 text-left">Saldo Pendiente</th>
                                        <th className="p-2 text-left">Estado</th>
                                        <th className="p-2 text-left">Fecha Factura</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {detailedAnalysis.subOrders.length > 0 ? detailedAnalysis.subOrders.map(so => (
                                        <tr key={so.id}>
                                            <td className="p-2 whitespace-nowrap">{so.orderNumber}</td>
                                            <td className="p-2 whitespace-nowrap">{so.subOrderNumber}</td>
                                            <td className="p-2 whitespace-nowrap">{so.unit}</td>
                                            <td className="p-2 truncate max-w-xs">{so.description}</td>
                                            <td className="p-2 whitespace-nowrap">{formatCurrency(so.amount || 0)}</td>
                                            <td className="p-2 whitespace-nowrap">{formatCurrency(so.subOrderInvoicedAmount)}</td>
                                            <td className="p-2 whitespace-nowrap">{formatCurrency(so.subOrderPaidAmount)}</td>
                                            <td className="p-2 whitespace-nowrap">{formatCurrency(so.subOrderBalance)}</td>
                                            <td className="p-2 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChipClass(so.status)}`}>{so.status}</span></td>
                                            <td className="p-2 whitespace-nowrap">{formatDate(so.invoiceDate)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={10} className="text-center py-6 text-gray-500 dark:text-gray-400">
                                                No se encontraron trabajos para el período seleccionado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                             </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p>Seleccione un {analysisTypeLabels[analysisType].toLowerCase()} para ver su estado de cuenta y detalle de trabajos.</p>
                    </div>
                )}
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Ingresos por Unidad y Director</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {summary.revenueByUnit.length > 0 ? summary.revenueByUnit.map(({ unit, amount, directors }) => {
                        return (
                        <div key={unit} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-baseline mb-2">
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-white truncate">{unit}</h4>
                                <span className="text-lg font-bold text-brand-primary">{formatCurrency(amount)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mb-4">
                                <div
                                    className="bg-brand-primary h-2.5 rounded-full"
                                    style={{ width: summary.totalCobradoBruto > 0 ? `${(amount / summary.totalCobradoBruto) * 100}%` : '0%' }}
                                ></div>
                            </div>
                            
                            <h5 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Contribución por Director:</h5>
                            <div className="space-y-2">
                                {directors.map(dir => (
                                <div key={dir.name} className="flex justify-between items-center text-sm">
                                    <div className='flex items-center'>
                                        <p className="text-gray-700 dark:text-gray-200">{dir.name}</p>
                                        {dir.title && (
                                             <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${dir.title === 'Senior' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>
                                                {dir.title}
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-medium text-gray-800 dark:text-white">{formatCurrency(dir.amount)}</p>
                                </div>
                                ))}
                            </div>
                        </div>
                    )}) : (
                       <p className="text-center text-gray-500 dark:text-gray-400 py-4 col-span-1 lg:col-span-2">No hay datos de ingresos para los filtros seleccionados.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

interface MetricCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: 'green' | 'blue' | 'yellow' | 'indigo' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => {
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

    const selectedColor = colorClasses[color];
    const selectedIconBg = iconContainerClasses[color];

    return (
        <div className={`p-4 rounded-lg shadow flex items-center border-l-4 ${selectedColor}`}>
            <div className={`p-3 rounded-full mr-4 ${selectedIconBg}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
};

export default ManagementDashboard;