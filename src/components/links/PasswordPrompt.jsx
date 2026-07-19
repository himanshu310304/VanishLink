import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Lock } from 'lucide-react';

export const PasswordPrompt = ({ onSubmit, isLoading }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Restricted Access</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">This link is encrypted.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <Input 
            type="password" 
            placeholder="Enter Password..." 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-center tracking-widest"
            autoFocus
            required
          />
          <Button className="mt-4" isLoading={isLoading}>Decrypt & Access</Button>
        </form>
      </Card>
    </div>
  );
};