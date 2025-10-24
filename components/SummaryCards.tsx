import React, { useMemo } from 'react';
import { Order, SubOrder, OrderStatus } from '../types';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ClockIcon } from './icons/ClockIcon';

interface FullOrderData extends Order, SubOrder {}

interface SummaryCardsProps {
    data: FullOrderData[];
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => {
    const summary = useMemo(() => {
        const totalRevenue = data
            .filter(d => d.status === OrderStatus.Cobrado && d.amount)
            .reduce((sum, item) => sum + (item.amount || 0), 0);
        
        const totalOrders = new Set(data.map(d => d.orderId)).size;
        
        const pending = data.filter(d => d.status === OrderStatus.Pendiente).length;
        const invoiced = data.filter(d => d.status === OrderStatus.Facturado).length;

        return { totalRevenue, totalOrders, pending, invoiced };
    }, [data]);
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard title="Ingresos Totales (Cobrado)" value={formatCurrency(summary.totalRevenue)} icon={<CurrencyIcon />} />
            <SummaryCard title="Órdenes Totales" value={summary.totalOrders.toString()} icon={<BriefcaseIcon />} />
            <SummaryCard title="Sub-órdenes Facturadas" value={summary.invoiced.toString()} icon={<DocumentIcon />} />
            <SummaryCard title="Sub-órdenes Pendientes" value={summary.pending.toString()} icon={<ClockIcon />} />
        </div>
    );
};

interface SummaryCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center space-x-4">
            <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-full text-brand-primary">
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
};

export default SummaryCards;