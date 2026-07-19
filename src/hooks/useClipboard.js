import { useState } from 'react';
import toast from 'react-hot-toast';

export const useClipboard = () => {
  const [copied, setCopied] = useState(false);

  const copy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    
    setTimeout(() => setCopied(false), 2000);
  };

  return { copied, copy };
};