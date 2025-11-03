import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Order, SubOrder, Unit, UserRole, OrderStatus, PaymentMethod, FinancialMovement, Director } from './types';
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
import { BellIcon } from './components/icons/BellIcon';
import NotificationsPanel from './components/NotificationsPanel';
import { UNIT_CONTACTS } from './constants';
import NotifyPaymentModal, { PaymentNotificationDetails } from './components/NotifyPaymentModal';
import AdjustBudgetModal from './components/AdjustBudgetModal';
import CommercialDashboard from './components/CommercialDashboard';

// Helper functions to create clean, plain JavaScript objects from complex Firestore objects.
// This prevents "Converting circular structure to JSON" errors when setting state for modals or dev tools.
const cleanSubOrder = (so: SubOrder): SubOrder => ({
    id: so.id,
    orderId: so.orderId,
    subOrderNumber: so.subOrderNumber,
    unit: so.unit,
    workType: so.workType,
    description: so.description,
    amount: so.amount,
    budgetedAmount: so.budgetedAmount,
    observations: so.observations,
    status: so.status,
    creationDate: so.creationDate,
});

const cleanOrder = (o: Order): Order => ({
    id: o.id,
    orderNumber: o.orderNumber,
    client: o.client,
    description: o.description,
    workType: o.workType,
    creationDate: o.creationDate,
    quotedAmount: o.quotedAmount,
    invoiceNumber: o.invoiceNumber,
    invoiceDate: o.invoiceDate,
    paymentDate: o.paymentDate,
    paymentMethod: o.paymentMethod,
    invoiceTotalAmount: o.invoiceTotalAmount,
    paidAmount: o.paidAmount,
    executive: o.executive,
    director: o.director,
    billingType: o.billingType,
    financialObservations: o.financialObservations,
});

const cleanFinancialMovement = (fm: FinancialMovement): FinancialMovement => ({
    id: fm.id,
    subOrderId: fm.subOrderId,
    orderId: fm.orderId,
    invoiceNumber: fm.invoiceNumber,
    invoiceDate: fm.invoiceDate,
    invoiceAmount: fm.invoiceAmount,
    paymentDate: fm.paymentDate,
    paidAmount: fm.paidAmount,
    creationDate: fm.creationDate,
});

interface FullOrderData extends Order, SubOrder {}

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    date: Date;
    read: boolean;
    roleTarget: UserRole[];
    unitTarget?: Unit[];
    directorTarget?: string[];
}

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
    const [currentUserUnit, setCurrentUserUnit] = useState<Unit | null>(null);
    const [currentUserDirectorName, setCurrentUserDirectorName] = useState<string | null>(null);
    const [currentUserDirectorTeam, setCurrentUserDirectorTeam] = useState<string | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [subOrders, setSubOrders] = useState<SubOrder[]>([]);
    const [financialMovements, setFinancialMovements] = useState<FinancialMovement[]>([]);
    const [clients, setClients] = useState<string[]>([]);
    const [directors, setDirectors] = useState<Director[]>([]);
    const [executives, setExecutives] = useState<string[]>([]);
    const [isNewOrderModalOpen, setNewOrderModalOpen] = useState(false);
    const [isEditSubOrderModalOpen, setEditSubOrderModalOpen] = useState(false);
    const [isEditOrderModalOpen, setEditOrderModalOpen] = useState(false);
    const [isAddSubOrderModalOpen, setAddSubOrderModalOpen] = useState(false);
    const [isNotifyPaymentModalOpen, setNotifyPaymentModalOpen] = useState(false);
    const [isAdjustBudgetModalOpen, setAdjustBudgetModalOpen] = useState(false);
    const [editingSubOrderContext, setEditingSubOrderContext] = useState<{ subOrder: SubOrder; parentOrder: Order; siblingSubOrders: SubOrder[] } | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [parentOrderForNewSub, setParentOrderForNewSub] = useState<Order | null>(null);
    const [orderForPaymentNotification, setOrderForPaymentNotification] = useState<Order | null>(null);
    const [adjustingBudgetContext, setAdjustingBudgetContext] = useState<{ order: Order; subOrders: SubOrder[] } | null>(null);
    const [toastNotification, setToastNotification] = useState<{ title: string; message: string; whatsappLink: string; } | null>(null);
    const [filteredDataForExport, setFilteredDataForExport] = useState<FullOrderData[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isNotificationsPanelOpen, setNotificationsPanelOpen] = useState(false);


    // Management Dashboard State
    const [managementUnitFilter, setManagementUnitFilter] = useState('all');
    const [managementYearFilter, setManagementYearFilter] = useState('all');
    const [managementMonthFilter, setManagementMonthFilter] = useState('all');
    const [managementDateRange, setManagementDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        const unsubscribeData = db.listenToData(({ orders, subOrders, financialMovements }) => {
            setOrders(orders.map(cleanOrder));
            setSubOrders(subOrders.map(cleanSubOrder));
            setFinancialMovements(financialMovements.map(cleanFinancialMovement));
        });

        const unsubscribeClients = db.listenToClients((clientNames) => {
            setClients(clientNames);
        });

        const unsubscribeDirectors = db.listenToDirectors((directorData) => {
            setDirectors(directorData);
        });

        const unsubscribeExecutives = db.listenToExecutives((executiveNames) => {
            setExecutives(executiveNames);
        });

        return () => {
            unsubscribeData();
            unsubscribeClients();
            unsubscribeDirectors();
            unsubscribeExecutives();
        };
    }, []);


    const handleLogin = (role: UserRole, options?: { unit?: Unit; directorName?: string; directorTeam?: string }) => {
        setCurrentUserRole(role);
        if (options?.unit) {
            setCurrentUserUnit(options.unit);
        }
        if (options?.directorName) {
            setCurrentUserDirectorName(options.directorName);
        }
        if (options?.directorTeam) {
            setCurrentUserDirectorTeam(options.directorTeam);
        }
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setCurrentUserRole(null);
        setCurrentUserUnit(null);
        setCurrentUserDirectorName(null);
        setCurrentUserDirectorTeam(null);
    };

    const triggerNotification = (
        title: string,
        message: string,
        whatsappMessage: string,
        details: { roleTarget: UserRole[], unitTarget?: Unit[], directorTarget?: string[] }
    ) => {
        // Create persistent in-app notification
        const newNotification: AppNotification = {
            id: `notif-${Date.now()}`,
            title,
            message,
            date: new Date(),
            read: false,
            roleTarget: details.roleTarget,
            unitTarget: details.unitTarget,
            directorTarget: details.directorTarget,
        };
        setNotifications(prev => [newNotification, ...prev]);

        // Create ephemeral toast notification with WhatsApp link
        setToastNotification({
            title,
            message: message.split('\n')[0], // Show a shorter message on the toast
            whatsappLink: `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`
        });
        setTimeout(() => setToastNotification(null), 8000); // Auto-dismiss after 8 seconds
    };


    const handleCreateOrder = async (
        orderData: { client: string; description: string; workType: string; quotedAmount: number; paymentMethod: PaymentMethod; director: string; executive: string; billingType: 'perTask' | 'global'; }, 
        unitsWithAmounts: { unit: Unit, amount?: number }[],
        isNewClient: boolean
    ) => {
        try {
            if (isNewClient) {
                await db.createClient(orderData.client);
            }

            const { newOrder } = await db.createOrder(orderData, unitsWithAmounts);
            setNewOrderModalOpen(false);
            
            const units = unitsWithAmounts.map(u => u.unit);
            
            const unitDetails = units.map(u => `• *${u}*`).join('\n');
            
            const assignmentText = units.length === 1 
                ? `Se ha asignado una tarea a la siguiente unidad:` 
                : `Se han asignado tareas a las siguientes unidades:`;
            
            const whatsappMessage = `*[NUEVA ORDEN: ${newOrder.orderNumber}]*\n\nSe ha creado una nueva orden para el cliente *${orderData.client}*.\n\n${assignmentText}\n${unitDetails}\n\nPor favor, revisar el tablero para más detalles.`;

            const toastMessage = units.length === 1
                ? `La orden ${newOrder.orderNumber} ha sido creada para ${orderData.client}, con una tarea para ${units[0]}.`
                : `La orden ${newOrder.orderNumber} ha sido creada para ${orderData.client}, con tareas para ${units.length} unidades.`;

            triggerNotification(
                "Orden Creada Exitosamente",
                toastMessage,
                whatsappMessage,
                { roleTarget: [UserRole.Unidad, UserRole.Finanzas, UserRole.Gerencia], unitTarget: units }
            );
        } catch (error) {
            console.error("Error creating order: ", error);
        }
    };

    const handleUpdateSubOrder = async (updatedSubOrder: SubOrder) => {
        try {
            const originalSubOrder = subOrders.find(so => so.id === updatedSubOrder.id);
            if (!originalSubOrder) {
                console.error("Error: Could not find the original sub-order to compare changes.");
                triggerNotification("Error", "No se pudo encontrar la tarea original para comparar los cambios.", "Error al actualizar tarea.", { roleTarget: [] });
                return;
            }
    
            const cleanUpdatedSubOrder = await db.updateSubOrder(updatedSubOrder);
            const parentOrder = orders.find(o => o.id === cleanUpdatedSubOrder.orderId);
            if (!parentOrder) {
                console.error("Error: Could not find parent order for notification.");
                triggerNotification("Error", "No se pudo encontrar la orden principal para la notificación.", "Error al actualizar tarea.", { roleTarget: [] });
                return;
            }
    
            // --- Notification Logic ---
            const newAmount = cleanUpdatedSubOrder.amount ?? 0;
            const originalAmount = originalSubOrder.amount;
            const amountChanged = Math.abs(newAmount - (originalAmount ?? 0)) > 0.01;
    
            // Calculate effective budget for comparison
            const siblingSubOrders = subOrders.filter(so => so.orderId === parentOrder.id);
            const isSingleTask = siblingSubOrders.length === 1;
            const hasOriginalBudget = originalSubOrder.budgetedAmount && originalSubOrder.budgetedAmount > 0;
            
            let effectiveOriginalBudget = originalSubOrder.budgetedAmount ?? 0;
            if (!hasOriginalBudget && isSingleTask) {
                effectiveOriginalBudget = parentOrder.quotedAmount ?? 0;
            }
            
            const difference = newAmount - effectiveOriginalBudget;
            const formatCurrency = (val: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(val);
            
            if (amountChanged) {
                // Notify Finanzas that an amount was updated. This is general.
                const whatsappMessageFinance = `*[TAREA ACTUALIZADA: ${cleanUpdatedSubOrder.subOrderNumber}]*\n\nLa unidad *${cleanUpdatedSubOrder.unit}* ha añadido/modificado un monto de *${formatCurrency(newAmount)}* a su tarea para la orden del cliente *${parentOrder.client}*.\n\nSe requiere revisión de Finanzas.`;
                
                triggerNotification(
                    "Tarea Actualizada",
                    `Orden ${parentOrder.orderNumber}: La unidad ${cleanUpdatedSubOrder.unit} actualizó la tarea ${cleanUpdatedSubOrder.subOrderNumber} con un nuevo monto de ${formatCurrency(newAmount)}.`,
                    whatsappMessageFinance,
                    { roleTarget: [UserRole.Finanzas, UserRole.Gerencia] }
                );
    
                // Specific notification for Commercial Director about budget implications.
                // This triggers if an amount is added for the first time OR if an existing amount is changed to create a discrepancy.
                if (parentOrder.director && ((originalAmount == null && newAmount > 0) || Math.abs(difference) > 0.01)) {
                    let message: string;
                    let whatsappMessageForCommercial: string;
                    let title: string;
    
                    if (originalAmount == null && newAmount > 0 && Math.abs(difference) < 0.01) {
                        title = `Costo Establecido en Orden ${parentOrder.orderNumber}`;
                        message = `La unidad "${cleanUpdatedSubOrder.unit}" ha establecido un costo de ${formatCurrency(newAmount)} para su tarea, de acuerdo con el presupuesto.`;
                        whatsappMessageForCommercial = `*[COSTO DE TAREA ESTABLECIDO: ${parentOrder.orderNumber}]*\n\nLa unidad *${cleanUpdatedSubOrder.unit}* ha establecido un costo de *${formatCurrency(newAmount)}* para su tarea en la orden del cliente *${parentOrder.client}*.\n\nEl monto coincide con el presupuesto asignado. No se requiere acción inmediata.`;
                    } else {
                        const changeType = difference > 0 ? "un excedente" : "una discrepancia";
                        title = `Ajuste de Presupuesto en Orden ${parentOrder.orderNumber}`;
                        message = `La unidad "${cleanUpdatedSubOrder.unit}" ajustó el presupuesto de ${formatCurrency(effectiveOriginalBudget)} a ${formatCurrency(newAmount)}, generando ${changeType} de ${formatCurrency(Math.abs(difference))}.`;
                        whatsappMessageForCommercial = `*[AJUSTE DE PRESUPUESTO: ${parentOrder.orderNumber}]*\n\nLa unidad *${cleanUpdatedSubOrder.unit}* ajustó el presupuesto para el cliente *${parentOrder.client}*.\n\n*Presupuesto Original:* ${formatCurrency(effectiveOriginalBudget)}\n*Nuevo Costo:* ${formatCurrency(newAmount)}\n*Diferencia:* ${formatCurrency(Math.abs(difference))} (${changeType.replace('un ', '').replace('una ', '')})\n\nSe requiere su revisión.`;
                    }
                    
                    triggerNotification(
                        title,
                        message,
                        whatsappMessageForCommercial,
                        { roleTarget: [UserRole.Comercial, UserRole.Gerencia], directorTarget: [parentOrder.director] }
                    );
                }
            } else {
                // NEW LOGIC: If the amount didn't change, but the user saved the form, it's considered a confirmation.
                // This is especially relevant after a Commercial Director adjusts a budget.
                if (newAmount > 0) {
                    const whatsappMessageFinance = `*[MONTO CONFIRMADO: ${cleanUpdatedSubOrder.subOrderNumber}]*\n\nLa unidad *${cleanUpdatedSubOrder.unit}* ha revisado y confirmado el monto de *${formatCurrency(newAmount)}* para su tarea en la orden del cliente *${parentOrder.client}*.\n\nEl presupuesto está alineado y listo para proceder.`;
                    
                    triggerNotification(
                        "Monto de Tarea Confirmado",
                        `Orden ${parentOrder.orderNumber}: La unidad ${cleanUpdatedSubOrder.unit} confirmó el monto para la tarea ${cleanUpdatedSubOrder.subOrderNumber}.`,
                        whatsappMessageFinance,
                        { roleTarget: [UserRole.Finanzas, UserRole.Gerencia] }
                    );
                }
            }
            
            setEditSubOrderModalOpen(false);
            setEditingSubOrderContext(null);
    
        } catch (error) {
            console.error("Error updating sub-order: ", error);
             triggerNotification("Error", "No se pudo actualizar la tarea.", "Error al actualizar la tarea.", {roleTarget: []});
        }
    };
    
    const handleUpdateOrder = async (updatedOrder: Order, finalSubOrders: SubOrder[], finalMovements: FinancialMovement[]) => {
        try {
            const originalSubOrderIds = subOrders.filter(so => so.orderId === updatedOrder.id).map(so => so.id);
            const originalMovements = financialMovements.filter(m => 
                (m.subOrderId && originalSubOrderIds.includes(m.subOrderId)) || m.orderId === updatedOrder.id
            );

            const movementsToCreate = finalMovements.filter(fm => fm.id.startsWith('local-')).map(({ id, ...rest }) => rest as Omit<FinancialMovement, 'id'>);
            const movementsToUpdate = finalMovements.filter(fm => {
                if (fm.id.startsWith('local-')) return false;
                const original = originalMovements.find(om => om.id === fm.id);
                if (!original) return false; 
                
                return (
                    original.invoiceNumber !== fm.invoiceNumber ||
                    original.invoiceDate !== fm.invoiceDate ||
                    original.invoiceAmount !== fm.invoiceAmount ||
                    original.paymentDate !== fm.paymentDate ||
                    original.paidAmount !== fm.paidAmount
                );
            });
            const movementsToDelete = originalMovements.filter(om => !finalMovements.some(fm => fm.id === om.id));
            
            const totalOrderAmount = finalSubOrders.reduce((sum, so) => sum + (so.amount || 0), 0);
            const totalOrderPaid = finalMovements.reduce((sum, fm) => sum + (fm.paidAmount || 0), 0);
            const totalOrderInvoiced = finalMovements.reduce((sum, fm) => sum + (fm.invoiceAmount || 0), 0);
            const isOrderFullyPaid = totalOrderAmount > 0 && totalOrderPaid >= totalOrderAmount;

            const subOrdersWithNewStatus = finalSubOrders.map(so => {
                const movementsForThisSubOrder = finalMovements.filter(m => m.subOrderId === so.id);
                const perTaskInvoiced = movementsForThisSubOrder.reduce((acc, m) => acc + (m.invoiceAmount || 0), 0);
                const perTaskPaid = movementsForThisSubOrder.reduce((acc, m) => acc + (m.paidAmount || 0), 0);
                
                let newStatus = OrderStatus.Pendiente;
                const isTaskPaid = so.amount && so.amount > 0 && perTaskPaid >= so.amount;

                if (isTaskPaid || isOrderFullyPaid) {
                    newStatus = OrderStatus.Cobrado;
                } else if (
                    (updatedOrder.billingType === 'perTask' && (perTaskInvoiced > 0 || perTaskPaid > 0)) ||
                    (updatedOrder.billingType === 'global' && (totalOrderInvoiced > 0 || totalOrderPaid > 0))
                ) {
                    newStatus = OrderStatus.Facturado;
                }
                
                return { ...so, status: newStatus };
            });

            const originalSubOrders = subOrders.filter(so => so.orderId === updatedOrder.id);
            const subOrdersToUpdate = subOrdersWithNewStatus.filter(sn => {
                const original = originalSubOrders.find(os => os.id === sn.id);
                return !original || original.status !== sn.status;
            });
            
            const orderUpdates: Partial<Order> = {
                billingType: updatedOrder.billingType,
                financialObservations: updatedOrder.financialObservations || '',
            };

            await db.updateOrderFinances(updatedOrder.id, orderUpdates, subOrdersToUpdate, movementsToCreate, movementsToUpdate, movementsToDelete);
            
            setEditOrderModalOpen(false);
            setEditingOrder(null);

            const whatsappMessage = `*[ACTUALIZACIÓN FINANCIERA: ${updatedOrder.orderNumber}]*\n\nFinanzas ha actualizado la información de la orden para *${updatedOrder.client}*. El estado de las tareas puede haber cambiado.\n\nPor favor, revisar el tablero.`;
            const directorTarget = updatedOrder.director ? [updatedOrder.director] : [];

            triggerNotification(
                "Orden Actualizada",
                `La información financiera de la orden ${updatedOrder.orderNumber} ha sido actualizada.`,
                whatsappMessage,
                { 
                    roleTarget: [UserRole.Unidad, UserRole.Comercial, UserRole.Gerencia], 
                    unitTarget: finalSubOrders.map(so => so.unit),
                    directorTarget: directorTarget,
                }
            );

        } catch (error) {
            console.error("Error updating order finances: ", error);
             triggerNotification("Error", "No se pudo actualizar la información financiera.", "Error al actualizar finanzas.", {roleTarget: []});
        }
    };


    const handleEditClick = (subOrderId: string, orderId: string) => {
        // Find the most up-to-date versions of the order and sub-order from the main state.
        // This prevents using stale data from a memoized table render.
        const subOrderToEdit = subOrders.find(so => so.id === subOrderId);
        const parentOrder = orders.find(o => o.id === orderId);

        if (!subOrderToEdit || !parentOrder) {
            console.error("Could not find the requested order or sub-order for editing.");
            triggerNotification("Error", "No se pudo encontrar la tarea o la orden para editar.", "Error de edición.", {roleTarget: []});
            return;
        }

        if (currentUserRole === UserRole.Unidad) {
            if (subOrderToEdit.unit !== currentUserUnit) {
                 triggerNotification("Acceso Denegado", "No tiene permiso para editar tareas de otra unidad.", "Intento de acceso denegado.", {roleTarget: []});
                return;
            }
            const siblings = subOrders.filter(so => so.orderId === parentOrder.id);
            setEditingSubOrderContext({
                subOrder: cleanSubOrder(subOrderToEdit),
                parentOrder: cleanOrder(parentOrder),
                siblingSubOrders: siblings.map(cleanSubOrder)
            });
            setEditSubOrderModalOpen(true);
        } else if (currentUserRole === UserRole.Finanzas) {
            setEditingOrder(cleanOrder(parentOrder));
            setEditOrderModalOpen(true);
        }
    };

    const handleAddSubOrderClick = (order: Order) => {
        setParentOrderForNewSub(cleanOrder(order));
        setAddSubOrderModalOpen(true);
    };

    const handleCreateSubOrder = async (parentOrder: Order, details: { unit: Unit; workType: string; description: string }) => {
        try {
            if (currentUserRole !== UserRole.Unidad) {
                triggerNotification("Error", "Acción no permitida para este usuario.", "Error de permisos.", {roleTarget: []});
                return;
            }

            const existingSubOrders = subOrders.filter(so => so.orderId === parentOrder.id);
            const nextIndex = existingSubOrders.length + 1;
            
            const newSubOrderData: Omit<SubOrder, 'id'> = {
                orderId: parentOrder.id,
                subOrderNumber: `${parentOrder.orderNumber}-${nextIndex}`,
                unit: details.unit,
                status: OrderStatus.Pendiente,
                workType: details.workType,
                description: details.description,
                creationDate: new Date().toISOString().split('T')[0],
            };
            
            const newSubOrder = await db.createSubOrder(newSubOrderData);

            setAddSubOrderModalOpen(false);
            setParentOrderForNewSub(null);

            const whatsappMessage = `*[NUEVA TAREA AÑADIDA: ${newSubOrder.subOrderNumber}]*\n\nLa unidad *${currentUserUnit}* ha añadido una nueva tarea para la unidad *${details.unit}* (Director a cargo: ${UNIT_CONTACTS[details.unit] || 'N/A'}) en la orden del cliente *${parentOrder.client}*.\n\nPor favor, revisar el tablero.`;
            
            triggerNotification(
                "Nueva Tarea Añadida",
                `La unidad ${currentUserUnit} añadió una nueva tarea a la orden ${parentOrder.orderNumber} para la unidad ${details.unit}.`,
                whatsappMessage,
                { roleTarget: [UserRole.Unidad, UserRole.Finanzas, UserRole.Gerencia], unitTarget: [details.unit] }
            );
        } catch (error) {
            console.error("Error creating sub-order:", error);
            triggerNotification("Error", "No se pudo añadir la nueva tarea.", "Error al añadir tarea.", {roleTarget: []});
        }
    };

    const handleNotifyPaymentClick = (order: Order) => {
        setOrderForPaymentNotification(cleanOrder(order));
        setNotifyPaymentModalOpen(true);
    };

    const handleSendPaymentNotification = (order: Order, payments: PaymentNotificationDetails[], clientEmail: string) => {
        const formatCurrency = (value: number | null | undefined) => {
            if (value === null || value === undefined) return 'N/A';
            return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
        };
    
        const paymentDetailsText = payments.map((p, index) => {
            let details = `*Detalles de Notificación #${index + 1}:*\n\n` +
                          `Razón Social: ${p.businessName}\n` +
                          `NIT: ${p.taxId}\n` +
                          `Dirección: ${p.address}\n` +
                          `Descripción: ${p.description}\n\n`;
    
            let actions = '*Acciones Requeridas:*\n';
            let hasAction = false;
    
            if (p.invoiceAmount) {
                actions += `  - *Generar Factura:*\n    Monto: *${formatCurrency(p.invoiceAmount)}*\n`;
                hasAction = true;
            }
            if (p.paidAmount && p.date) {
                actions += `  - *Registrar Pago:*\n    Monto: *${formatCurrency(p.paidAmount)}*\n    Fecha: ${p.date}\n`;
                hasAction = true;
            }
    
            if (!hasAction) {
                actions = '*No se especificaron acciones monetarias.*\n';
            }
    
            return details + actions;
        }).join('\n---\n\n');
    
        const message = `El Director Comercial ha reportado la siguiente información para la orden *${order.orderNumber} (${order.client})*:\n\n` +
                        `*Correo del cliente para entrega:*\n${clientEmail}\n\n` +
                        `---\n\n` +
                        `${paymentDetailsText}\n\n` +
                        `Por favor, genere la factura y/o registre el pago según corresponda.`;
    
        const whatsappPaymentDetails = payments.map((p, index) => {
            let details = `*Notificación #${index + 1}:*\n` +
                          `Razón Social: ${p.businessName}\n` +
                          `NIT: ${p.taxId}\n`;
            if (p.invoiceAmount) {
                details += `Monto a Facturar: ${formatCurrency(p.invoiceAmount)}\n`;
            }
            if (p.paidAmount) {
                details += `Monto Pagado: ${formatCurrency(p.paidAmount)}\n`;
            }
            return details;
        }).join('\n');
    
        const whatsappMessage = `*[INFO FACTURA/PAGO: ${order.orderNumber} - ${order.client}]*\n\n` +
                               `El Dir. Comercial ha enviado información.\n` +
                               `Correo de entrega: ${clientEmail}\n\n` +
                               `${whatsappPaymentDetails}\n\n` +
                               `Favor revisar el tablero para más detalles y proceder.`;
    
        triggerNotification(
            `Info. Factura/Pago - ${order.orderNumber}`,
            message,
            whatsappMessage,
            { roleTarget: [UserRole.Finanzas, UserRole.Gerencia] }
        );
    
        setNotifyPaymentModalOpen(false);
        setOrderForPaymentNotification(null);
    };

    const handleAdjustBudgetClick = (order: Order) => {
        const subOrdersForOrder = subOrders.filter(so => so.orderId === order.id);
        setAdjustingBudgetContext({
            order: cleanOrder(order),
            subOrders: subOrdersForOrder.map(cleanSubOrder)
        });
        setAdjustBudgetModalOpen(true);
    };

    const handleUpdateBudgets = async (updatedOrder: Order, updatedSubOrders: SubOrder[]) => {
        try {
            const subOrdersPayload = updatedSubOrders.map(so => ({
                id: so.id,
                budgetedAmount: so.budgetedAmount || 0,
                amount: so.budgetedAmount || 0, // The new amount is the adjusted budget
            }));

            await db.updateOrderBudgets(updatedOrder.id, updatedOrder.quotedAmount || 0, subOrdersPayload);
            
            setAdjustBudgetModalOpen(false);
            setAdjustingBudgetContext(null);

            const affectedUnits = [...new Set(updatedSubOrders.map(so => so.unit))];

            const whatsappMessage = `*[AJUSTE DE PRESUPUESTO: ${updatedOrder.orderNumber}]*\n\nEl Dir. Comercial ha ajustado los presupuestos para el cliente *${updatedOrder.client}*. Se requiere que las siguientes unidades revisen sus nuevos montos asignados:\n${affectedUnits.map(u => `• *${u}*`).join('\n')}\n\nPor favor, revisar el tablero.`;

            triggerNotification(
                `Presupuesto Ajustado en Orden ${updatedOrder.orderNumber}`,
                `El Director Comercial ha ajustado los presupuestos para la orden ${updatedOrder.orderNumber}. Revisa los nuevos montos.`,
                whatsappMessage,
                { roleTarget: [UserRole.Unidad], unitTarget: affectedUnits }
            );

        } catch (error) {
            console.error("Error updating budgets:", error);
            triggerNotification("Error", "No se pudieron actualizar los presupuestos.", "Error al ajustar presupuestos.", {roleTarget: []});
        }
    };
    

    const subOrderFinancials = useMemo(() => {
        const invoicedMap = new Map<string, number>();
        const paidMap = new Map<string, number>();

        subOrders.forEach(so => {
            invoicedMap.set(so.id, 0);
            paidMap.set(so.id, 0);
        });

        financialMovements.forEach(m => {
            if (m.subOrderId) {
                if (m.invoiceAmount) {
                    invoicedMap.set(m.subOrderId, (invoicedMap.get(m.subOrderId) || 0) + Number(m.invoiceAmount));
                }
                if (m.paidAmount) {
                    paidMap.set(m.subOrderId, (paidMap.get(m.subOrderId) || 0) + Number(m.paidAmount));
                }
            }
        });

        const globalInvoicesByOrderId = new Map<string, number>();
        const globalPaymentsByOrderId = new Map<string, number>();
        financialMovements.forEach(m => {
            if (m.orderId && !m.subOrderId) {
                if (m.invoiceAmount) {
                    globalInvoicesByOrderId.set(m.orderId, (globalInvoicesByOrderId.get(m.orderId) || 0) + Number(m.invoiceAmount));
                }
                if (m.paidAmount) {
                    globalPaymentsByOrderId.set(m.orderId, (globalPaymentsByOrderId.get(m.orderId) || 0) + Number(m.paidAmount));
                }
            }
        });

        globalInvoicesByOrderId.forEach((totalGlobalInvoice, orderId) => {
            const subOrdersForOrder = subOrders.filter(so => so.orderId === orderId);
            if (subOrdersForOrder.length === 0) return;
            const totalSubOrderAmount = subOrdersForOrder.reduce((sum, so) => sum + Number(so.amount || 0), 0);
            if (totalSubOrderAmount > 0) {
                subOrdersForOrder.forEach(so => {
                    const proportion = Number(so.amount || 0) / totalSubOrderAmount;
                    const attributedInvoice = totalGlobalInvoice * proportion;
                    invoicedMap.set(so.id, (invoicedMap.get(so.id) || 0) + attributedInvoice);
                });
            }
        });

        globalPaymentsByOrderId.forEach((totalGlobalPayment, orderId) => {
            const subOrdersForOrder = subOrders.filter(so => so.orderId === orderId);
            if (subOrdersForOrder.length === 0) return;

            let totalOutstanding = 0;
            const outstandingBalances = new Map<string, number>();
            subOrdersForOrder.forEach(so => {
                const alreadyPaid = paidMap.get(so.id) || 0;
                const balance = Number(so.amount || 0) - alreadyPaid;
                if (balance > 0) {
                    totalOutstanding += balance;
                    outstandingBalances.set(so.id, balance);
                }
            });

            if (totalOutstanding > 0) {
                outstandingBalances.forEach((balance, subOrderId) => {
                    const proportion = balance / totalOutstanding;
                    const attributedPayment = totalGlobalPayment * proportion;
                    const paymentToAdd = Math.min(attributedPayment, balance); // Don't overpay
                    paidMap.set(subOrderId, (paidMap.get(subOrderId) || 0) + paymentToAdd);
                });
            }
        });

        return { invoicedPerSubOrder: invoicedMap, paidPerSubOrder: paidMap };
    }, [subOrders, financialMovements]);

    const processedData = useMemo(() => {
        const orderAggregates = new Map<string, { totalPaid: number; totalAmount: number; allMovements: FinancialMovement[] }>();
        orders.forEach(order => {
            const relevantSubOrders = subOrders.filter(so => so.orderId === order.id);
            const relevantSubOrderIds = relevantSubOrders.map(so => so.id);
            const allMovementsForOrder = financialMovements.filter(fm =>
                (fm.subOrderId && relevantSubOrderIds.includes(fm.subOrderId)) || fm.orderId === order.id
            );
            const totalAmount = relevantSubOrders.reduce((sum, so) => sum + (so.amount || 0), 0);
            const totalPaid = allMovementsForOrder.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
            orderAggregates.set(order.id, { totalPaid, totalAmount, allMovements: allMovementsForOrder });
        });
    
        const subOrdersWithCalculations = subOrders.map(so => {
            const parentOrder = orders.find(o => o.id === so.orderId);
            const parentOrderAggregates = orderAggregates.get(so.orderId);
            const allMovementsForOrder = parentOrderAggregates?.allMovements || [];

            const movementsForSubOrder = allMovementsForOrder.filter(fm => fm.subOrderId === so.id);
            const perTaskInvoiced = movementsForSubOrder.reduce((sum, m) => sum + (m.invoiceAmount || 0), 0);
            const perTaskPaid = movementsForSubOrder.reduce((sum, m) => sum + (m.paidAmount || 0), 0);

            let status = OrderStatus.Pendiente;
            const isTaskPaid = so.amount && so.amount > 0 && perTaskPaid >= so.amount;
            const isOrderFullyPaid = parentOrderAggregates && parentOrderAggregates.totalAmount > 0 && parentOrderAggregates.totalPaid >= parentOrderAggregates.totalAmount;
            const totalOrderInvoiced = allMovementsForOrder.reduce((sum, m) => sum + (m.invoiceAmount || 0), 0);
            const totalOrderPaid = parentOrderAggregates?.totalPaid || 0;

            if (isTaskPaid || isOrderFullyPaid) {
                status = OrderStatus.Cobrado;
            } else if (
                (parentOrder?.billingType === 'perTask' && (perTaskInvoiced > 0 || perTaskPaid > 0)) ||
                (parentOrder?.billingType === 'global' && (totalOrderInvoiced > 0 || totalOrderPaid > 0))
            ) {
                status = OrderStatus.Facturado;
            }
    
            return { ...so, status };
        });
    
        const ordersWithAggregates = new Map<string, Order>();
        orders.forEach(order => {
            const allMovementsForOrder = orderAggregates.get(order.id)?.allMovements || [];
    
            const totalInvoicedForOrder = allMovementsForOrder.reduce((sum, m) => sum + (m.invoiceAmount || 0), 0);
            const totalPaidForOrder = allMovementsForOrder.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
    
            const latestInvoice = [...allMovementsForOrder].filter(m => m.invoiceDate).sort((a, b) => new Date(b.invoiceDate!).getTime() - new Date(a.invoiceDate!).getTime())[0];
            const latestPayment = [...allMovementsForOrder].filter(m => m.paymentDate).sort((a, b) => new Date(b.paymentDate!).getTime() - new Date(a.paymentDate!).getTime())[0];
    
            ordersWithAggregates.set(order.id, {
                ...order,
                invoiceTotalAmount: totalInvoicedForOrder,
                paidAmount: totalPaidForOrder,
                invoiceNumber: latestInvoice?.invoiceNumber,
                invoiceDate: latestInvoice?.invoiceDate,
                paymentDate: latestPayment?.paymentDate,
            });
        });
    
        return subOrdersWithCalculations
            .map(so => {
                const updatedParent = ordersWithAggregates.get(so.orderId);
                if (!updatedParent) {
                    console.warn(`Sub-order ${so.id} with missing parent order ${so.orderId} will be ignored.`);
                    return null;
                }
                return { ...updatedParent, ...so };
            })
            .filter((item): item is FullOrderData => item !== null);
    
    }, [orders, subOrders, financialMovements]);
    
    const subOrdersForEditingOrder = useMemo(() => {
        return editingOrder ? subOrders.filter(so => so.orderId === editingOrder.id) : [];
    }, [editingOrder, subOrders]);

    const movementsForEditingOrder = useMemo(() => {
        if (!editingOrder) return [];
        const relevantSubOrderIds = subOrders
            .filter(so => so.orderId === editingOrder.id)
            .map(so => so.id);
        return financialMovements.filter(m => 
            (m.subOrderId && relevantSubOrderIds.includes(m.subOrderId)) || m.orderId === editingOrder.id
        );
    }, [editingOrder, subOrders, financialMovements]);

    const userNotifications = useMemo(() => {
        if (!currentUserRole) return [];
        return notifications.filter(n => {
            if (!n.roleTarget.includes(currentUserRole)) return false;
            
            if (currentUserRole === UserRole.Unidad && n.unitTarget && n.unitTarget.length > 0) {
                return n.unitTarget.includes(currentUserUnit!);
            }
            
            if (currentUserRole === UserRole.Comercial && n.directorTarget && n.directorTarget.length > 0) {
                if (!currentUserDirectorName) return false;
                return n.directorTarget.includes(currentUserDirectorName);
            }

            return true;
        });
    }, [notifications, currentUserRole, currentUserUnit, currentUserDirectorName]);
    
    const unreadCount = useMemo(() => userNotifications.filter(n => !n.read).length, [userNotifications]);

    const handleMarkAsRead = (notificationId: string) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    };

    const handleMarkAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleDeleteNotification = (notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };


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
                            <p className="font-semibold text-gray-800 dark:text-white">
                               {currentUserDirectorTeam ? currentUserDirectorTeam : currentUserRole}
                               {currentUserRole === UserRole.Unidad && currentUserUnit && ` - ${currentUserUnit}`}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {currentUserDirectorName ? currentUserDirectorName : 'Sesión Iniciada'}
                            </p>
                         </div>
                         <div className="relative">
                            <button
                                onClick={() => setNotificationsPanelOpen(prev => !prev)}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-300"
                                aria-label="Ver notificaciones"
                            >
                                <BellIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-brand-primary ring-2 ring-white dark:ring-gray-800 text-xs text-white flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            {isNotificationsPanelOpen && (
                                <NotificationsPanel
                                    notifications={userNotifications}
                                    onClose={() => setNotificationsPanelOpen(false)}
                                    onMarkAsRead={handleMarkAsRead}
                                    onMarkAllAsRead={handleMarkAllAsRead}
                                    onDelete={handleDeleteNotification}
                                />
                            )}
                         </div>
                         <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-300">
                           <LogoutIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                         </button>
                         {(currentUserRole === UserRole.Gerencia || currentUserRole === UserRole.Finanzas) && (
                            <ExportControls
                                filteredTableData={filteredDataForExport}
                                fullTableData={processedData}
                                allOrders={orders}
                                allSubOrders={subOrders}
                                allFinancialMovements={financialMovements}
                                allClients={clients}
                                allDirectors={directors.map(d => d.name)}
                                allExecutives={executives}
                                managementFilters={{
                                    unitFilter: managementUnitFilter,
                                    yearFilter: managementYearFilter,
                                    monthFilter: managementMonthFilter,
                                    dateRange: managementDateRange,
                                }}
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

                {currentUserRole === UserRole.Comercial && currentUserDirectorName && (
                     <CommercialDashboard
                        data={processedData}
                        subOrderFinancials={subOrderFinancials}
                        directorName={currentUserDirectorName}
                        onEdit={handleEditClick}
                        onAddSubOrder={handleAddSubOrderClick}
                        onNotifyPayment={handleNotifyPaymentClick}
                        onAdjustBudget={handleAdjustBudgetClick}
                        onFilteredDataChange={setFilteredDataForExport}
                        directors={directors.map(d => d.name)}
                        executives={executives}
                    />
                )}

                {(currentUserRole === UserRole.Gerencia || currentUserRole === UserRole.Finanzas) && (
                    <div>
                        <ManagementDashboard 
                            data={processedData} 
                            subOrders={subOrders}
                            financialMovements={financialMovements}
                            clients={clients}
                            directors={directors.map(d => d.name)}
                            executives={executives}
                            subOrderFinancials={subOrderFinancials}
                            filters={{
                                unitFilter: managementUnitFilter,
                                yearFilter: managementYearFilter,
                                monthFilter: managementMonthFilter,
                                dateRange: managementDateRange,
                            }}
                            setFilters={{
                                setUnitFilter: setManagementUnitFilter,
                                setYearFilter: setManagementYearFilter,
                                setMonthFilter: setManagementMonthFilter,
                                setDateRange: setManagementDateRange,
                            }}
                        />
                    </div>
                )}
                
                {currentUserRole !== UserRole.Comercial && (
                    <Dashboard 
                        data={processedData} 
                        onEdit={handleEditClick} 
                        currentUserRole={currentUserRole}
                        currentUserUnit={currentUserUnit}
                        currentUserDirectorName={currentUserDirectorName}
                        onAddSubOrder={handleAddSubOrderClick}
                        onFilteredDataChange={setFilteredDataForExport}
                        onNotifyPayment={handleNotifyPaymentClick}
                        subOrderFinancials={subOrderFinancials}
                        directors={directors.map(d => d.name)}
                        executives={executives}
                        onAdjustBudget={handleAdjustBudgetClick}
                    />
                )}
            </div>

            {isNewOrderModalOpen && (
                <NewOrderModal
                    onClose={() => setNewOrderModalOpen(false)}
                    onSubmit={handleCreateOrder}
                    clients={clients}
                    directors={directors.map(d => d.name)}
                    executives={executives}
                />
            )}
            {isEditSubOrderModalOpen && editingSubOrderContext && (
                <EditSubOrderModal
                    subOrder={editingSubOrderContext.subOrder}
                    parentOrder={editingSubOrderContext.parentOrder}
                    siblingSubOrders={editingSubOrderContext.siblingSubOrders}
                    onClose={() => {
                        setEditSubOrderModalOpen(false);
                        setEditingSubOrderContext(null);
                    }}
                    onSubmit={handleUpdateSubOrder}
                />
            )}
            {isEditOrderModalOpen && editingOrder && (
                <EditOrderModal
                    order={editingOrder}
                    subOrders={subOrdersForEditingOrder}
                    financialMovements={movementsForEditingOrder}
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
            {isNotifyPaymentModalOpen && orderForPaymentNotification && (
                <NotifyPaymentModal
                    order={orderForPaymentNotification}
                    onClose={() => setNotifyPaymentModalOpen(false)}
                    onSubmit={handleSendPaymentNotification}
                />
            )}
            {isAdjustBudgetModalOpen && adjustingBudgetContext && (
                <AdjustBudgetModal
                    order={adjustingBudgetContext.order}
                    subOrders={adjustingBudgetContext.subOrders}
                    onClose={() => {
                        setAdjustBudgetModalOpen(false);
                        setAdjustingBudgetContext(null);
                    }}
                    onSubmit={handleUpdateBudgets}
                />
            )}
            {toastNotification && (
                <NotificationToast
                    title={toastNotification.title}
                    message={toastNotification.message}
                    whatsappLink={toastNotification.whatsappLink}
                    onClose={() => setToastNotification(null)}
                />
            )}
        </div>
    );
};

export default App;