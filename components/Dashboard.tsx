import React, { useState, useMemo, useEffect } from 'react';
import { Order, SubOrder, Unit, UserRole } from '../types';
import OrderTable from './OrderTable';
import FilterControls from './FilterControls';
import SummaryCards from './SummaryCards';

interface FullOrderData extends Order, SubOrder {}

interface DashboardProps {
    data: FullOrderData[];
    onEdit: (subOrder: SubOrder, order: Order) => void;
    currentUserRole: UserRole;
    onAddSubOrder: (order: Order) => void;
    onFilteredDataChange: (data: FullOrderData[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onEdit, currentUserRole, onAddSubOrder, onFilteredDataChange }) => {
    const [filters, setFilters] = useState<{
        unit: string;
        status: string;
        client: string;
        orderNumber: string;
        invoiceNumber: string;
        dateRange: { start: string; end: string };
    }>({
        unit: 'all',
        status: 'all',
        client: '',
        orderNumber: '',
        invoiceNumber: '',
        dateRange: { start: '', end: '' },
    });

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const itemDate = new Date(item.creationDate);
            const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
            const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;

            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;
            if (filters.unit !== 'all' && item.unit !== filters.unit) return false;
            if (filters.status !== 'all' && item.status !== filters.status) return false;
            if (filters.client && !item.client.toLowerCase().includes(filters.client.toLowerCase())) return false;
            if (filters.orderNumber && !item.orderNumber.toLowerCase().includes(filters.orderNumber.toLowerCase())) return false;
            if (filters.invoiceNumber && !item.invoiceNumber?.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) return false;

            return true;
        });
    }, [data, filters]);

    useEffect(() => {
        onFilteredDataChange(filteredData);
    }, [filteredData, onFilteredDataChange]);

    return (
        <main>
            <SummaryCards data={filteredData} />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mt-6 p-4">
                <FilterControls filters={filters} setFilters={setFilters} />
                <OrderTable 
                    data={filteredData} 
                    onEdit={onEdit}
                    currentUserRole={currentUserRole}
                    onAddSubOrder={onAddSubOrder}
                />
            </div>
        </main>
    );
};

export default Dashboard;