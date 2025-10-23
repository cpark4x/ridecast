'use client';

import { useState } from 'react';
import { LoginForm } from './auth/login-form';
import { RegisterForm } from './auth/register-form';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Ridecast</h1>
          <p className="text-gray-600">Transform books into audio for your commute</p>
        </div>

        {/* Auth Form */}
        {mode === 'login' ? (
          <LoginForm
            onSuccess={() => {
              // Will be redirected by app
            }}
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterForm
            onSuccess={() => {
              // Will be redirected by app
            }}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
}
