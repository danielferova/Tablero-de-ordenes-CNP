import React, { useState, useMemo } from 'react';
import { Unit, PaymentMethod } from '../types';
import { ALL_UNITS } from '../constants';
import { PlusIcon } from './icons/PlusIcon';
import { WarningIcon } from './icons/WarningIcon';

interface NewOrderModalProps {
    onClose: () => void;
    onSubmit: (
        orderData: { 
            client: string; 
            description: string; 
            workType: string; 
            quotedAmount: number; 
            paymentMethod: PaymentMethod;
            director: string;
            executive: string;
            billingType: 'perTask' | 'global';
        }, 
        unitsWithAmounts: { unit: Unit, amount?: number }[],
        isNewClient: boolean
    ) => void;
    clients: string[];
    directors: string[];
    executives: string[];
}
const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Q0.00';
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
};

const NewOrderModal: React.FC<NewOrderModalProps> = ({ onClose, onSubmit, clients, directors, executives }) => {
    // Input states
    const [clientInput, setClientInput] = useState('');
    const [directorInput, setDirectorInput] = useState('');
    const [executiveInput, setExecutiveInput] = useState('');
    
    // Dropdown visibility
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Form data
    const [description, setDescription] = useState('');
    const [workType, setWorkType] = useState('');
    const [quotedAmount, setQuotedAmount] = useState('');
    const [selectedUnits, setSelectedUnits] = useState<Unit[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
    const [billingType, setBillingType] = useState<'perTask' | 'global' | ''>('');
    const [formError, setFormError] = useState<string | null>(null);
    const [unitAmounts, setUnitAmounts] = useState<{ [key: string]: string }>({});

    // Memoized filters
    const filteredClients = useMemo(() => {
        if (!clientInput) return [];
        return clients.filter(c => c.toLowerCase().includes(clientInput.toLowerCase()));
    }, [clientInput, clients]);
    const isNewClient = useMemo(() => {
        return clientInput.trim() !== '' && !clients.some(c => c.toLowerCase() === clientInput.toLowerCase().trim());
    }, [clientInput, clients]);

    const filteredDirectors = useMemo(() => {
        if (!directorInput) return directors;
        return directors.filter(d => d.toLowerCase().includes(directorInput.toLowerCase()));
    }, [directorInput, directors]);

    const filteredExecutives = useMemo(() => {
        if (!executiveInput) return executives;
        return executives.filter(e => e.toLowerCase().includes(executiveInput.toLowerCase()));
    }, [executiveInput, executives]);

    const totalAssignedAmount = useMemo(() => {
        // FIX: Explicitly type `reduce` parameters to prevent `unknown` type errors.
        return Object.values(unitAmounts).reduce((sum: number, amountStr: string) => {
            const amount = parseFloat(amountStr);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
    }, [unitAmounts]);

    const quotedAmountValue = useMemo(() => parseFloat(quotedAmount) || 0, [quotedAmount]);
    const isOverBudget = useMemo(() => totalAssignedAmount > quotedAmountValue && quotedAmountValue > 0, [totalAssignedAmount, quotedAmountValue]);

    // Handlers
    const handleUnitToggle = (unit: Unit) => {
        const isSelected = selectedUnits.includes(unit);
        if (isSelected) {
            setSelectedUnits(prev => prev.filter(u => u !== unit));
            setUnitAmounts(prev => {
                const newAmounts = { ...prev };
                delete newAmounts[unit];
                return newAmounts;
            });
        } else {
            setSelectedUnits(prev => [...prev, unit]);
        }
    };

    const handleUnitAmountChange = (unit: Unit, value: string) => {
        setUnitAmounts(prev => ({
            ...prev,
            [unit]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        
        const amount = parseFloat(quotedAmount);
        
        if (isOverBudget) {
            setFormError('El total asignado a las unidades no puede exceder el monto cotizado.');
            return;
        }

        if (!clientInput.trim()) {
            setFormError('Debe seleccionar o añadir un cliente.');
            return;
        }
        if (!directorInput.trim() || !directors.includes(directorInput.trim())) {
            setFormError('Debe seleccionar un director válido de la lista.');
            return;
        }
        if (!executiveInput.trim() || !executives.includes(executiveInput.trim())) {
            setFormError('Debe seleccionar un ejecutivo válido de la lista.');
            return;
        }
        if (!description.trim() || !workType.trim() || !quotedAmount || !paymentMethod || !billingType) {
            setFormError('Por favor, complete todos los campos de la orden, incluyendo el método de pago y tipo de facturación.');
            return;
        }
        if (selectedUnits.length === 0) {
            setFormError('Debe seleccionar al menos una unidad.');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            setFormError('El monto cotizado debe ser un número positivo.');
            return;
        }
        
        const unitsWithAmounts = selectedUnits.map(unit => ({
            unit,
            amount: unitAmounts[unit] ? parseFloat(unitAmounts[unit]) : undefined
        }));

        onSubmit(
            { client: clientInput.trim(), description, workType, quotedAmount: amount, paymentMethod, director: directorInput.trim(), executive: executiveInput.trim(), billingType }, 
            unitsWithAmounts,
            isNewClient
        );
    };

    const renderDropdown = (
        items: string[], 
        onSelect: (value: string) => void, 
        onAddNew?: () => void, 
        addNewText?: string,
        showAddNew?: boolean,
        noResultsText: string = "No se encontraron resultados."
    ) => (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
            <ul>
                {items.map(item => (
                    <li key={item} onMouseDown={() => onSelect(item)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">{item}</li>
                ))}
                {showAddNew && onAddNew && addNewText && (
                     <li onMouseDown={onAddNew} className="px-4 py-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/50 cursor-pointer flex items-center">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        {addNewText}
                    </li>
                )}
                {items.length === 0 && !showAddNew && (
                    <li className="px-4 py-2 text-gray-500">{noResultsText}</li>
                )}
            </ul>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Crear Nueva Orden</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Client Input */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Cliente</label>
                            <input type="text" placeholder="Buscar o agregar cliente" value={clientInput} 
                                onChange={e => setClientInput(e.target.value)}
                                onFocus={() => setOpenDropdown('client')}
                                onBlur={() => setTimeout(() => setOpenDropdown(null), 200)}
                                className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required />
                            {openDropdown === 'client' && renderDropdown(
                                filteredClients, 
                                (client) => { setClientInput(client); setOpenDropdown(null); },
                                () => setOpenDropdown(null),
                                `Añadir "${clientInput.trim()}"`,
                                isNewClient
                            )}
                        </div>

                        {/* Director and Executive Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Director Input */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Director</label>
                                <input type="text" placeholder="Buscar Director" value={directorInput} 
                                    onChange={e => setDirectorInput(e.target.value)}
                                    onFocus={() => setOpenDropdown('director')}
                                    onBlur={() => setTimeout(() => setOpenDropdown(null), 200)}
                                    className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required />
                                {openDropdown === 'director' && renderDropdown(
                                    filteredDirectors,
                                    (director) => { setDirectorInput(director); setOpenDropdown(null); }
                                )}
                            </div>
                            {/* Executive Input */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ejecutivo a Cargo</label>
                                <input type="text" placeholder="Buscar Ejecutivo" value={executiveInput} 
                                    onChange={e => setExecutiveInput(e.target.value)}
                                    onFocus={() => setOpenDropdown('executive')}
                                    onBlur={() => setTimeout(() => setOpenDropdown(null), 200)}
                                    className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required />
                                {openDropdown === 'executive' && renderDropdown(
                                    filteredExecutives,
                                    (executive) => { setExecutiveInput(executive); setOpenDropdown(null); }
                                )}
                            </div>
                        </div>

                        <textarea placeholder="Descripción del Trabajo" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Tipo de Trabajo" value={workType} onChange={e => setWorkType(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required />
                            <input type="number" placeholder="Monto Cotizado (Q)" value={quotedAmount} onChange={e => setQuotedAmount(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Método de Pago</label>
                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required>
                                    <option value="" disabled>Seleccionar...</option>
                                    {Object.values(PaymentMethod).map(pm => <option key={pm} value={pm}>{pm}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Facturación</label>
                                <select value={billingType} onChange={e => setBillingType(e.target.value as 'perTask' | 'global')} className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required>
                                    <option value="" disabled>Seleccionar...</option>
                                    <option value="perTask">Facturación por Tarea</option>
                                    <option value="global">Facturación Global</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Asignar a Unidades:</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
                                {ALL_UNITS.map(unit => (
                                    <div key={unit} className="col-span-2 grid grid-cols-2 gap-x-4 items-center">
                                        <label className="flex items-center space-x-2 cursor-pointer p-1">
                                            <input type="checkbox" checked={selectedUnits.includes(unit)} onChange={() => handleUnitToggle(unit)} className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{unit}</span>
                                        </label>
                                        {selectedUnits.includes(unit) && (
                                            <input
                                                type="number"
                                                placeholder="Monto (Opcional)"
                                                value={unitAmounts[unit] || ''}
                                                onChange={(e) => handleUnitAmountChange(unit, e.target.value)}
                                                className="w-full p-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                                                step="0.01"
                                                min="0"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                             {selectedUnits.length > 0 && (
                                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-md text-sm">
                                    <div className={`flex justify-between ${isOverBudget ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>
                                        <span>Total Asignado:</span>
                                        <span className="font-semibold">{formatCurrency(totalAssignedAmount)}</span>
                                    </div>
                                    <div className="flex justify-between mt-1 text-gray-600 dark:text-gray-300">
                                        <span>Monto Cotizado:</span>
                                        <span className="font-semibold">{formatCurrency(quotedAmountValue)}</span>
                                    </div>
                                    {isOverBudget && (
                                        <p className="text-xs text-red-500 mt-2 text-right">El total asignado no puede exceder el monto cotizado.</p>
                                    )}
                                </div>
                            )}
                        </div>

                         {formError && (
                            <div className="flex items-center text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded-md text-sm">
                                <WarningIcon className="w-5 h-5 mr-2" />
                                {formError}
                            </div>
                         )}
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" className="py-2 px-4 bg-brand-primary text-white rounded-md hover:bg-red-700 disabled:bg-red-400 dark:disabled:bg-red-800 disabled:cursor-not-allowed" disabled={isOverBudget}>Crear Orden</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewOrderModal;