import React from 'react';

interface NotificationToastProps {
  title: string;
  message: string;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ title, message, onClose }) => {
  const encodedMessage = encodeURIComponent(message);
  const mailtoLink = `mailto:?subject=${encodeURIComponent(title)}&body=${encodedMessage}`;
  const whatsappLink = `https://wa.me/?text=${encodedMessage}`;

  return (
    <div className="fixed bottom-5 right-5 w-full max-w-sm bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
            <div className="mt-3 flex space-x-4">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-green-600 hover:text-green-500">
                Notificar por WhatsApp
              </a>
              <a href={mailtoLink} className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Notificar por Correo
              </a>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button onClick={onClose} className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
