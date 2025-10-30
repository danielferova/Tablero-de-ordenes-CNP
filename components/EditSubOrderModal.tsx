import React, { useState, useEffect, useMemo } from 'react';
import { SubOrder, Order } from '../types';
import { WarningIcon } from './icons/WarningIcon';

interface EditSubOrderModalProps {
    subOrder: SubOrder;
    parentOrder: Order;
    siblingSubOrders: SubOrder[];
    onClose: () => void;
    onSubmit: (subOrder: SubOrder) => void;
}

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Q0.00';
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
};


const EditSubOrderModal: React.FC<EditSubOrderModalProps> = ({ subOrder, parentOrder, siblingSubOrders, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        workType: subOrder.workType || '',
        description: subOrder.description || '',
        amount: subOrder.amount?.toString() || '',
        observations: subOrder.observations || '',
    });
    const [formError, setFormError] = useState<string | null>(null);

    const availableBudget = useMemo(() => {
        const quotedAmount = parentOrder.quotedAmount || 0;
        const otherSubOrdersAmount = siblingSubOrders
            .filter(so => so.id !== subOrder.id)
            .reduce((sum, so) => sum + (so.amount || 0), 0);
        
        const budget = quotedAmount - otherSubOrdersAmount;
        return budget < 0 ? 0 : budget;
    }, [parentOrder.quotedAmount, siblingSubOrders, subOrder.id]);

    useEffect(() => {
        setFormData({
            workType: subOrder.workType || '',
            description: subOrder.description || '',
            amount: subOrder.amount?.toString() || '',
            observations: subOrder.observations || '',
        });
    }, [subOrder]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'amount') {
            const newAmount = parseFloat(value);
            if (!isNaN(newAmount) && newAmount > availableBudget) {
                setFormError(`El monto no puede exceder el presupuesto disponible de ${formatCurrency(availableBudget)}.`);
            } else {
                setFormError(null);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const amountValue = formData.amount === '' ? NaN : parseFloat(String(formData.amount));

        if (isNaN(amountValue)) {
            setFormError('El monto debe ser un número válido.');
            return;
        }
        if (amountValue < 0) {
            setFormError('El monto no puede ser negativo.');
            return;
        }
        if (amountValue > availableBudget) {
            setFormError(`El monto excede el presupuesto disponible de ${formatCurrency(availableBudget)}.`);
            return;
        }

        const updatedSubOrder: SubOrder = {
            ...subOrder,
            workType: formData.workType,
            description: formData.description,
            amount: amountValue,
            observations: formData.observations,
        };
        onSubmit(updatedSubOrder);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Editar Tarea de: <span className="text-brand-primary">{subOrder.unit}</span></h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Trabajo</label>
                            <input
                                type="text"
                                name="workType"
                                value={formData.workType}
                                onChange={handleChange}
                                className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                placeholder="Ej: Producto, Servicio"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción de Tarea</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto (Q)</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Presupuesto disponible para esta tarea: {formatCurrency(availableBudget)}
                            </p>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                                step="0.01"
                                min="0"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</label>
                            <textarea
                                name="observations"
                                value={formData.observations}
                                onChange={handleChange}
                                rows={3}
                                className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                        </div>

                        {formError && (
                            <div className="flex items-center text-red-600 dark:text-red-400 p-2 mt-2 bg-red-50 dark:bg-red-900/20 rounded-md text-sm">
                                <WarningIcon className="w-5 h-5 mr-2" />
                                {formError}
                            </div>
                         )}
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" className="py-2 px-4 bg-brand-primary text-white rounded-md hover:bg-red-700">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSubOrderModal;