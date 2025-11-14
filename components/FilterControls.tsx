
import React, { useState, useRef, useEffect } from 'react';
import { OrderStatus, Unit } from '../types';
import { ALL_UNITS } from '../constants';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface FilterControlsProps {
    filters: any;
    setFilters: (filters: any) => void;
    isUnitDirector?: boolean;
    isCommercialDirector?: boolean;
    directors: string[];
    executives: string[];
}

const FilterControls: React.FC<FilterControlsProps> = ({ filters, setFilters, isUnitDirector = false, isCommercialDirector = false, directors, executives }) => {
    const [isUnitDropdownOpen, setUnitDropdownOpen] = useState(false);
    const unitDropdownRef = useRef<HTMLDivElement>(null);

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
    
    const handleUnitToggle = (unit: Unit) => {
        setFilters((prev: any) => {
            const newUnits = prev.unit.includes(unit)
                ? prev.unit.filter((u: Unit) => u !== unit)
                : [...prev.unit, unit];
            return { ...prev, unit: newUnits };
        });
    };
    
    const handleSelectAllUnits = () => {
        setFilters((prev: any) => ({ ...prev, unit: ALL_UNITS }));
    };

    const handleClearAllUnits = () => {
        setFilters((prev: any) => ({ ...prev, unit: [] }));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) {
                setUnitDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const isUnitFilterDisabled = isUnitDirector || isCommercialDirector;
    const isDirectorFilterDisabled = isCommercialDirector;
    const isExecutiveFilterDisabled = false;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border-b border-gray-200 dark:border-gray-700">
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
                name="director"
                value={filters.director}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-gray-200 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                disabled={isDirectorFilterDisabled}
                title={isDirectorFilterDisabled ? "El filtro de director no está disponible en esta vista." : "Filtrar por director"}
            >
                <option value="all">Todos los Directores</option>
                {directors.map(director => <option key={director} value={director}>{director}</option>)}
            </select>
            <select
                name="executive"
                value={filters.executive}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-gray-200 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                disabled={isExecutiveFilterDisabled}
                title={isExecutiveFilterDisabled ? "El filtro de ejecutivo no está disponible en esta vista." : "Filtrar por ejecutivo"}
            >
                <option value="all">Todos los Ejecutivos</option>
                {executives.map(executive => <option key={executive} value={executive}>{executive}</option>)}
            </select>
            <div className="relative" ref={unitDropdownRef}>
                <button
                    type="button"
                    onClick={() => setUnitDropdownOpen(prev => !prev)}
                    className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-left flex justify-between items-center disabled:bg-gray-200 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                    disabled={isUnitFilterDisabled}
                    title={isUnitFilterDisabled ? "El filtro de unidad no está disponible en esta vista." : "Filtrar por unidad"}
                >
                    <span className="truncate">
                        {filters.unit.length === 0 ? 'Todas las Unidades' : 
                         filters.unit.length === 1 ? filters.unit[0] :
                         `${filters.unit.length} Unidades Seleccionadas`}
                    </span>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${isUnitDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isUnitDropdownOpen && !isUnitFilterDisabled && (
                    <div className="absolute z-20 w-72 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
                        <div className="p-2 flex justify-between border-b border-gray-200 dark:border-gray-700">
                            <button onClick={handleSelectAllUnits} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Todas</button>
                            <button onClick={handleClearAllUnits} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Limpiar</button>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1">
                            {ALL_UNITS.map(unit => (
                                <label key={unit} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                                        checked={filters.unit.includes(unit)}
                                        onChange={() => handleUnitToggle(unit)}
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{unit}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <select
                name="overallStatus"
                value={filters.overallStatus}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
                <option value="all">Estado de Orden (Todos)</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Progreso">En Progreso</option>
                <option value="Completado">Completado</option>
            </select>
            <select
                name="status"
                value={filters.status}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
                <option value="all">Estado de Tarea (Todos)</option>
                {Object.values(OrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
            </select>
            <div className="flex items-center space-x-2 lg:col-span-2">
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