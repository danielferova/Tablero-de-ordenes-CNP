import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Order, SubOrder, Unit, UserRole, OrderStatus, PaymentMethod } from './types';
import Dashboard from './components/Dashboard';
import NewOrderModal from './components/NewOrderModal';
import EditSubOrderModal from './components/EditSubOrderModal';
import { PlusIcon } from './components/icons/PlusIcon';
import AddSubOrderModal from './components/AddSubOrderModal';
import EditOrderModal from './components/EditOrderModal';
import LoginScreen from './components/LoginScreen';
import NotificationToast from './components/NotificationToast';
import { Logo } from './components/Logo';
import { LogoutIcon } from './components/icons/LogoutIcon';
import ManagementDashboard from './components/ManagementDashboard';
import ExportControls from './components/ExportControls';
import * as db from './services/database';

interface FullOrderData extends Order, SubOrder {}

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [subOrders, setSubOrders] = useState<SubOrder[]>([]);
    const [isNewOrderModalOpen, setNewOrderModalOpen] = useState(false);
    const [isEditSubOrderModalOpen, setEditSubOrderModalOpen] = useState(false);
    const [isEditOrderModalOpen, setEditOrderModalOpen] = useState(false);
    const [isAddSubOrderModalOpen, setAddSubOrderModalOpen] = useState(false);
    const [editingSubOrder, setEditingSubOrder] = useState<SubOrder | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [parentOrderForNewSub, setParentOrderForNewSub] = useState<Order | null>(null);
    const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);
    const [filteredDataForExport, setFilteredDataForExport] = useState<FullOrderData[]>([]);
    const managementDashboardRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        // Subscribe to real-time updates from Firestore
        const unsubscribe = db.listenToData(({ orders, subOrders }) => {
            setOrders(orders);
            setSubOrders(subOrders);
        });

        // Cleanup subscription on component unmount
        return () => unsubscribe();
    }, []);


    const handleLogin = (role: UserRole) => {
        setCurrentUserRole(role);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setCurrentUserRole(null);
    };

    const triggerNotification = (title: string, message: string) => {
        setNotification({ title, message });
        setTimeout(() => setNotification(null), 8000); // Auto-dismiss after 8 seconds
    };

    const handleCreateOrder = async (orderData: { client: string; description: string; workType: string; quotedAmount: number; paymentMethod: PaymentMethod }, units: Unit[]) => {
        try {
            const { newOrder } = await db.createOrder(orderData, units);
            setNewOrderModalOpen(false);
            triggerNotification(
                "Orden Creada Exitosamente",
                `La orden ${newOrder.orderNumber} para ${orderData.client} ha sido creada y asignada a ${units.join(', ')}.`
            );
        } catch (error) {
            console.error("Error creating order: ", error);
            triggerNotification("Error", "No se pudo crear la orden.");
        }
    };

    const handleUpdateSubOrder = async (updatedSubOrder: SubOrder) => {
        try {
            await db.updateSubOrder(updatedSubOrder);
            setEditSubOrderModalOpen(false);
            setEditingSubOrder(null);
            triggerNotification(
                "Tarea Actualizada",
                `La tarea ${updatedSubOrder.subOrderNumber} ha sido actualizada por el Director de Unidad.`
            );
        } catch (error) {
            console.error("Error updating sub-order: ", error);
            triggerNotification("Error", "No se pudo actualizar la tarea.");
        }
    };
    
    const handleUpdateOrder = async (updatedOrder: Order, updatedSubOrders: SubOrder[]) => {
        try {
            await db.updateOrderWithSubOrders(updatedOrder, updatedSubOrders);
            setEditOrderModalOpen(false);
            setEditingOrder(null);
            triggerNotification(
                "Orden Actualizada",
                `La información de facturación de la orden ${updatedOrder.orderNumber} ha sido actualizada por Finanzas.`
            );
        } catch (error) {
            console.error("Error updating order: ", error);
            triggerNotification("Error", "No se pudo actualizar la orden.");
        }
    };

    const handleEditClick = (subOrder: SubOrder, order: Order) => {
        if (currentUserRole === UserRole.Unidad) {
            setEditingSubOrder(subOrder);
            setEditSubOrderModalOpen(true);
        } else if (currentUserRole === UserRole.Finanzas) {
            setEditingOrder(order);
            setEditOrderModalOpen(true);
        }
    };

    const handleAddSubOrderClick = (order: Order) => {
        setParentOrderForNewSub(order);
        setAddSubOrderModalOpen(true);
    };

    const handleCreateSubOrder = async (parentOrder: Order, unit: Unit, details: { workType: string; description: string }) => {
        try {
            const existingSubOrders = subOrders.filter(so => so.orderId === parentOrder.id);
            const nextIndex = existingSubOrders.length + 1;
            
            const newSubOrderData: Omit<SubOrder, 'id'> = {
                orderId: parentOrder.id,
                subOrderNumber: `${parentOrder.orderNumber}-${nextIndex}`,
                unit,
                status: OrderStatus.Pendiente,
                workType: details.workType,
                description: details.description,
                creationDate: new Date().toISOString().split('T')[0],
            };
            
            await db.createSubOrder(newSubOrderData);

            setAddSubOrderModalOpen(false);
            setParentOrderForNewSub(null);
            triggerNotification(
                "Nueva Tarea Añadida",
                `Se añadió una nueva tarea a la orden ${parentOrder.orderNumber} para la unidad de ${unit}.`
            );
        } catch (error) {
            console.error("Error creating sub-order:", error);
            triggerNotification("Error", "No se pudo añadir la nueva tarea.");
        }
    };

    const fullOrderData = useMemo(() => {
        return subOrders.map(subOrder => {
            const parentOrder = orders.find(o => o.id === subOrder.orderId);
            // Return a default/empty order structure if parentOrder is not found
            // to prevent crashes, though this indicates a data integrity issue.
            if (!parentOrder) {
                console.warn(`SubOrder ${subOrder.id} has no parent order.`);
                const missingOrder: Order = {
                    id: subOrder.orderId,
                    orderNumber: 'Desconocido',
                    client: 'Desconocido',
                    description: '',
                    workType: '',
                    creationDate: new Date().toISOString()
                };
                return { ...missingOrder, ...subOrder };
            }
            return {
                ...parentOrder,
                ...subOrder
            };
        });
    }, [orders, subOrders]);
    
    const subOrdersForEditingOrder = useMemo(() => {
        return editingOrder ? subOrders.filter(so => so.orderId === editingOrder.id) : [];
    }, [editingOrder, subOrders]);

    if (!isAuthenticated || !currentUserRole) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-brand-light dark:bg-brand-secondary text-gray-800 dark:text-gray-200 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <Logo className="h-12 text-brand-secondary dark:text-white" />
                    <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                         <div className="text-right">
                             <p className="font-semibold text-gray-800 dark:text-white">{currentUserRole}</p>
                             <p className="text-sm text-gray-500 dark:text-gray-400">Sesión Iniciada</p>
                         </div>
                         <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-300">
                           <LogoutIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                         </button>
                         {(currentUserRole === UserRole.Gerencia || currentUserRole === UserRole.Finanzas) && (
                            <ExportControls
                                filteredData={filteredDataForExport}
                                managementDashboardRef={managementDashboardRef}
                            />
                        )}
                        {currentUserRole === UserRole.Comercial && (
                            <button
                                onClick={() => setNewOrderModalOpen(true)}
                                className="flex items-center justify-center bg-brand-primary hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out shadow-md"
                            >
                                <PlusIcon className="h-5 w-5 mr-2" />
                                Nueva Orden
                            </button>
                        )}
                    </div>
                </header>

                {(currentUserRole === UserRole.Gerencia || currentUserRole === UserRole.Finanzas) && (
                    <ManagementDashboard data={fullOrderData} ref={managementDashboardRef} />
                )}

                <Dashboard 
                    data={fullOrderData} 
                    onEdit={handleEditClick} 
                    currentUserRole={currentUserRole} 
                    onAddSubOrder={handleAddSubOrderClick}
                    onFilteredDataChange={setFilteredDataForExport}
                />
            </div>

            {isNewOrderModalOpen && (
                <NewOrderModal
                    onClose={() => setNewOrderModalOpen(false)}
                    onSubmit={handleCreateOrder}
                />
            )}
            {isEditSubOrderModalOpen && editingSubOrder && (
                <EditSubOrderModal
                    subOrder={editingSubOrder}
                    onClose={() => setEditSubOrderModalOpen(false)}
                    onSubmit={handleUpdateSubOrder}
                />
            )}
            {isEditOrderModalOpen && editingOrder && (
                <EditOrderModal
                    order={editingOrder}
                    subOrders={subOrdersForEditingOrder}
                    onClose={() => setEditOrderModalOpen(false)}
                    onSubmit={handleUpdateOrder}
                />
            )}
            {isAddSubOrderModalOpen && parentOrderForNewSub && (
                <AddSubOrderModal
                    order={parentOrderForNewSub}
                    onClose={() => setAddSubOrderModalOpen(false)}
                    onSubmit={handleCreateSubOrder}
                />
            )}
            {notification && (
                <NotificationToast
                    title={notification.title}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
};

export default App;