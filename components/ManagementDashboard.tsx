import React, { useState, useMemo } from 'react';
import { Order, SubOrder, Unit, OrderStatus } from '../types';
import { ALL_UNITS } from '../constants';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ClockIcon } from './icons/ClockIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

interface FullOrderData extends Order, SubOrder {}

interface ManagementDashboardProps {
    data: FullOrderData[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
};

const ManagementDashboard = React.forwardRef<HTMLDivElement, ManagementDashboardProps>(({ data }, ref) => {
    const [unitFilter, setUnitFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const itemDate = new Date(item.creationDate);
            
            if (unitFilter !== 'all' && item.unit !== unitFilter) return false;
            
            if (monthFilter !== 'all') {
                if (itemDate.getMonth() !== parseInt(monthFilter)) return false;
            }

            const startDate = dateRange.start ? new Date(dateRange.start) : null;
            const endDate = dateRange.end ? new Date(dateRange.end) : null;
            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;

            return true;
        });
    }, [data, unitFilter, monthFilter, dateRange]);

    const summary = useMemo(() => {
        const totalCobrado = filteredData
            .filter(d => d.status === OrderStatus.Cobrado && d.amount)
            .reduce((sum, item) => sum + (item.amount || 0), 0);
        
        const totalFacturado = filteredData
            .filter(d => d.status === OrderStatus.Facturado && d.amount)
            .reduce((sum, item) => sum + (item.amount || 0), 0);

        const totalPendiente = filteredData
            .filter(d => d.status === OrderStatus.Pendiente && d.amount)
            .reduce((sum, item) => sum + (item.amount || 0), 0);
            
        const revenueByUnit = ALL_UNITS.map(unit => {
            const unitRevenue = filteredData
                .filter(d => d.unit === unit && d.status === OrderStatus.Cobrado && d.amount)
                .reduce((sum, item) => sum + (item.amount || 0), 0);
            return { unit, amount: unitRevenue };
        }).filter(u => u.amount > 0);

        // Operational Summary
        const totalOrders = new Set(filteredData.map(d => d.orderId)).size;
        const subOrdenesFacturadas = filteredData.filter(d => d.status === OrderStatus.Facturado).length;
        const subOrdenesPendientes = filteredData.filter(d => d.status === OrderStatus.Pendiente).length;

        return { 
            totalCobrado, 
            totalFacturado, 
            totalPendiente, 
            revenueByUnit,
            totalOrders,
            subOrdenesFacturadas,
            subOrdenesPendientes
        };
    }, [filteredData]);

    const maxRevenue = Math.max(...summary.revenueByUnit.map(u => u.amount), 0);

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
        <div ref={ref} className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Dashboard Gerencial y Financiero</h2>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <select onChange={(e) => setUnitFilter(e.target.value)} value={unitFilter} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option value="all">Todas las Unidades</option>
                    {ALL_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
                <select onChange={(e) => setMonthFilter(e.target.value)} value={monthFilter} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option value="all">Todos los Meses</option>
                    {months.map((month, index) => <option key={month} value={index}>{month}</option>)}
                </select>
                <input type="date" name="start" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                <input type="date" name="end" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>

            {/* Financial KPI Cards */}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 mt-6">Resumen Financiero</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <MetricCard title="Total Cobrado (Ingresos)" value={formatCurrency(summary.totalCobrado)} icon={<CurrencyIcon className="text-green-500"/>} />
                <MetricCard title="Total Facturado (Por Cobrar)" value={formatCurrency(summary.totalFacturado)} icon={<DocumentIcon className="text-blue-500"/>} />
                <MetricCard title="Total Pendiente (Por Facturar)" value={formatCurrency(summary.totalPendiente)} icon={<ClockIcon className="text-yellow-500"/>} />
            </div>
            
            {/* Operational KPI Cards */}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 mt-6">Resumen Operativo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                 <MetricCard title="Órdenes Totales" value={summary.totalOrders.toString()} icon={<BriefcaseIcon className="text-indigo-500"/>} />
                 <MetricCard title="Sub-órdenes Facturadas" value={summary.subOrdenesFacturadas.toString()} icon={<DocumentIcon className="text-blue-500"/>} />
                 <MetricCard title="Sub-órdenes Pendientes" value={summary.subOrdenesPendientes.toString()} icon={<ClockIcon className="text-yellow-500"/>} />
            </div>


            {/* Revenue by Unit Chart */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 mt-6">Ingresos por Unidad</h3>
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                    {summary.revenueByUnit.length > 0 ? summary.revenueByUnit.map(({ unit, amount }) => (
                        <div key={unit} className="flex items-center">
                            <span className="w-48 text-sm font-medium text-gray-600 dark:text-gray-300 truncate">{unit}</span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-6 mr-2">
                                <div
                                    className="bg-brand-primary h-6 rounded-full flex items-center justify-end px-2"
                                    style={{ width: maxRevenue > 0 ? `${(amount / maxRevenue) * 100}%` : '0%' }}
                                >
                                  <span className="text-xs font-bold text-white">{formatCurrency(amount)}</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                       <p className="text-center text-gray-500 dark:text-gray-400 py-4">No hay datos de ingresos para los filtros seleccionados.</p>
                    )}
                </div>
            </div>
        </div>
    );
});

interface MetricCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon }) => (
    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg shadow flex items-center">
        <div className="p-3 rounded-full bg-white dark:bg-gray-800 mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

export default ManagementDashboard;