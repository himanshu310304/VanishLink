import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { X, Download } from 'lucide-react';
import { Button } from '../ui/Button';

export const QRPopup = ({ isOpen, onClose, url }) => {
  const svgRef = useRef(null);

  if (!isOpen) return null;
  if (!url) return null;

  const handleDownload = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      // white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = 'deadman-link-qr.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const svgBase64 =
      'data:image/svg+xml;base64,' +
      window.btoa(unescape(encodeURIComponent(svgString)));

    img.src = svgBase64;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-slate-900 dark:text-white transition-colors"
          aria-label="Close QR popup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Deadman-Link
          </p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
            Share via QR Code
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Scan on another device to open this secure link.
          </p>
        </div>

        {/* QR code box */}
        <div className="bg-white rounded-2xl p-4 mx-auto w-fit shadow-inner">
          <div className="bg-white rounded-xl p-2">
            <QRCode
              ref={svgRef}
              value={url}
              size={220}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            />
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-500 break-all text-center">
          {url}
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
