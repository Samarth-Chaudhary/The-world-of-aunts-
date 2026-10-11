/**
 * @file components/QRCodeModal.tsx
 * @description Accessible QR Code and Join URL modal for classroom student onboarding.
 * Allows instructor to display session code, QR code, and customize LAN IP for local Wi-Fi phones.
 */

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, Laptop, Smartphone, Info } from 'lucide-react';

interface QRCodeModalProps {
  sessionCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ sessionCode, isOpen, onClose }) => {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const currentPort = typeof window !== 'undefined' ? window.location.port : '5173';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';

  // Allow instructor to customize host if testing from a phone on local Wi-Fi (e.g. 192.168.1.X)
  const [customHost, setCustomHost] = useState<string>(currentHost);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const joinUrl = `${protocol}//${customHost}${currentPort ? `:${currentPort}` : ''}/?room=${encodeURIComponent(
    sessionCode
  )}&role=student`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden font-mono text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <QrCode className="w-5 h-5 text-cyan-400" />
            <span>CLASSROOM JOIN INVITATION</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            title="Close Invitation Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="text-xs text-slate-400">
            Have students scan this QR code with their mobile device camera to join the active network simulation.
          </div>

          {/* Session Code Display */}
          <div className="bg-slate-950 border border-cyan-800/80 px-4 py-2 rounded-lg shadow-inner">
            <span className="text-xs text-slate-400 uppercase tracking-widest block">SESSION CODE</span>
            <span className="text-2xl font-bold font-mono tracking-widest text-cyan-300">
              {sessionCode}
            </span>
          </div>

          {/* Rendered SVG QR Code */}
          <div className="p-3 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center">
            <QRCodeSVG
              value={joinUrl}
              size={210}
              level="M"
              includeMargin={true}
            />
          </div>

          {/* Host / URL Configuration */}
          <div className="w-full text-left space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <label htmlFor="custom-host-input" className="flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                <span>Host / LAN IP:</span>
              </label>
              {customHost === 'localhost' && (
                <span className="text-[10px] text-amber-400">Note: 'localhost' only works on this laptop</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="custom-host-input"
                type="text"
                value={customHost}
                onChange={(e) => setCustomHost(e.target.value.trim())}
                placeholder="e.g. 192.168.1.50 or domain"
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors flex-shrink-0"
                title="Copy Full Join Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-start gap-1.5 text-slate-300">
                <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Classroom Tip:</strong> On a local Wi-Fi router, enter your laptop's LAN IP (e.g. <code className="text-cyan-300">192.168.1.x</code>). Students' phones cannot reach <code className="text-amber-300">localhost</code> because localhost refers to the student's phone.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
