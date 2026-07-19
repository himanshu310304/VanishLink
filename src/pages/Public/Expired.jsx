import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Card } from '../../components/ui/Card';

const Expired = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center border-red-500/20 bg-white dark:bg-slate-900">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Link Expired</h1>
        <p className="text-slate-600 dark:text-slate-400">
          This VanishLink link has self-destructed due to time limits or view counts.
        </p>
      </Card>
    </div>
  );
};
export default Expired;