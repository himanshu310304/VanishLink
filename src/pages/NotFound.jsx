import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-9xl font-bold text-emerald-500/10 select-none">404</h1>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Signal Lost</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">The page you are looking for does not exist.</p>
        <Link to="/dashboard">
          <Button className="w-auto px-8 mx-auto">Return to Base</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;