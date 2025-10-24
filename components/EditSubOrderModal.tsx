import React, { useState, useEffect } from 'react';
import { SubOrder } from '../types';

interface EditSubOrderModalProps {
    subOrder: SubOrder;
    onClose: () => void;
    onSubmit: (subOrder: SubOrder) => void;
}

const EditSubOrderModal: React.FC<EditSubOrderModalProps> = ({ subOrder, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<SubOrder>({ ...subOrder });

    useEffect(() => {
        setFormData({ ...subOrder });
    }, [subOrder]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const parsedValue = name === 'amount' ? parseFloat(value) : value;
        setFormData(prev => ({ ...prev, [name]: parsedValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
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
                                value={formData.workType || ''}
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
                                value={formData.description || ''}
                                onChange={handleChange}
                                rows={3}
                                className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto (Q)</label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount || ''}
                                onChange={handleChange}
                                className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</label>
                            <textarea
                                name="observations"
                                value={formData.observations || ''}
                                onChange={handleChange}
                                rows={3}
                                className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                        </div>
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