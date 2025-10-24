import React, { useState } from 'react';
import { Unit, Order } from '../types';
import { ALL_UNITS } from '../constants';

interface AddSubOrderModalProps {
    order: Order;
    onClose: () => void;
    onSubmit: (order: Order, unit: Unit, details: { workType: string; description: string }) => void;
}

const AddSubOrderModal: React.FC<AddSubOrderModalProps> = ({ order, onClose, onSubmit }) => {
    const [selectedUnit, setSelectedUnit] = useState<Unit | ''>('');
    const [workType, setWorkType] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUnit || !workType || !description) {
            alert('Por favor, complete todos los campos.');
            return;
        }
        onSubmit(order, selectedUnit, { workType, description });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Añadir Tarea a Orden: <span className="text-brand-primary">{order.orderNumber}</span></h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="unit-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asignar a unidad:</label>
                        <select
                            id="unit-select"
                            value={selectedUnit}
                            onChange={e => setSelectedUnit(e.target.value as Unit)}
                            className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            required
                        >
                            <option value="" disabled>Seleccione una unidad...</option>
                            {ALL_UNITS.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="workType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Trabajo:</label>
                        <input
                            id="workType"
                            type="text"
                            placeholder="Ej: Producto, Servicio"
                            value={workType}
                            onChange={e => setWorkType(e.target.value)}
                            className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción de Tarea:</label>
                        <textarea
                            id="description"
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            required
                        />
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" className="py-2 px-4 bg-brand-primary text-white rounded-md hover:bg-red-700">Añadir Tarea</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddSubOrderModal;