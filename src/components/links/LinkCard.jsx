import React from 'react';
import { Copy, ExternalLink, BarChart2, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

export const LinkCard = ({ link }) => {
  const shortUrl = `${window.location.origin}/${link.slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shortUrl);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:border-slate-700 transition-colors group">
      <div className="flex items-start justify-between">
        
        {/* Left Side: Icon & Info */}
        <div className="flex gap-4 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <ExternalLink className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-slate-900 dark:text-white font-medium truncate pr-4" title={link.title || link.targetUrl}>
              {link.title || 'Untitled Link'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
               <a 
                 href={shortUrl} 
                 target="_blank" 
                 rel="noreferrer"
                 className="text-emerald-400 text-sm font-mono hover:underline truncate"
               >
                 /{link.slug}
               </a>
               <button onClick={copyToClipboard} className="text-slate-500 hover:text-slate-900 dark:text-white transition-colors" title="Copy">
                 <Copy className="w-3 h-3" />
               </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 truncate">{link.targetUrl}</p>
          </div>
        </div>

        {/* Right Side: Stats & Actions */}
        <div className="flex items-center gap-4 pl-4 shrink-0">
           <div className="text-right hidden sm:block">
             <div className="flex items-center justify-end gap-1 text-slate-700 dark:text-slate-300 text-sm font-medium">
               <BarChart2 className="w-4 h-4" />
               {link.clicks}
             </div>
             <p className="text-xs text-slate-500">clicks</p>
           </div>
           
           <button className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors">
             <MoreVertical className="w-5 h-5" />
           </button>
        </div>
      </div>
    </div>
  );
};