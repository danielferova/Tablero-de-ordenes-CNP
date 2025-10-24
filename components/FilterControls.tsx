
import React from 'react';
import { OrderStatus, Unit } from '../types';
import { ALL_UNITS } from '../constants';

interface FilterControlsProps {
    filters: any;
    setFilters: (filters: any) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({ filters, setFilters }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters((prev: any) => ({
            ...prev,
            dateRange: { ...prev.dateRange, [name]: value },
        }));
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 p-4 border-b border-gray-200 dark:border-gray-700">
            <input
                type="text"
                name="client"
                placeholder="Buscar por Cliente"
                value={filters.client}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <input
                type="text"
                name="orderNumber"
                placeholder="Buscar por No. Orden"
                value={filters.orderNumber}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
             <input
                type="text"
                name="invoiceNumber"
                placeholder="Buscar por No. Factura"
                value={filters.invoiceNumber}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <select
                name="unit"
                value={filters.unit}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
                <option value="all">Todas las Unidades</option>
                {ALL_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
            </select>
            <select
                name="status"
                value={filters.status}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
                <option value="all">Todos los Estados</option>
                {Object.values(OrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
            </select>
            <div className="flex items-center space-x-2">
                <input
                    type="date"
                    name="start"
                    value={filters.dateRange.start}
                    onChange={handleDateChange}
                    className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <span className="text-gray-500">-</span>
                <input
                    type="date"
                    name="end"
                    value={filters.dateRange.end}
                    onChange={handleDateChange}
                    className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
            </div>
        </div>
    );
};

export default FilterControls;