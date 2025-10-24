import React, { useState } from 'react';
import { UserRole } from '../types';
import { Logo } from './Logo';

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
}

// NOTE: Hardcoding passwords like this is insecure and for demonstration purposes only.
// In a real application, use a proper authentication backend.
const rolePasswords: { [key: string]: UserRole } = {
  'comercial123': UserRole.Comercial,
  'unidad123': UserRole.Unidad,
  'finanzas123': UserRole.Finanzas,
  'gerencia123': UserRole.Gerencia,
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const role = rolePasswords[password];
    if (role) {
      onLogin(role);
    } else {
      setError('Contraseña incorrecta. Por favor, intente de nuevo.');
      setPassword('');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-light dark:bg-brand-secondary">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="flex justify-center">
          <Logo className="h-16 text-brand-secondary dark:text-white" />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Acceso al Tablero de Órdenes
        </h2>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Contraseña de Acceso
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Ingrese su contraseña"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          )}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition duration-300"
            >
              Iniciar Sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;