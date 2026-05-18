import React from 'react';
import { Shield } from 'lucide-react';
import { AdminLoginForm } from '../components/AdminLoginForm';

const AdminLogin = ({ onLoginSuccess }) => {
  return (
    <div className="bg-slate-50 flex min-h-screen flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="bg-blue-600 text-white flex size-8 items-center justify-center rounded-md">
            <Shield className="size-4" />
          </div>
          <span className="text-lg font-semibold text-gray-900">
            Go Live Admin
          </span>
        </div>

        {/* Login Form */}
        <AdminLoginForm onLoginSuccess={onLoginSuccess} />
      </div>
    </div>
  );
};

export default AdminLogin;