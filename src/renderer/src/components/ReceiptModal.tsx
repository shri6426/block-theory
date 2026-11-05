import React, { useState, useEffect } from 'react';
import { X, Printer, RefreshCw, FileText, Check } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

interface Props {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ orderId, isOpen, onClose }) => {
  const [width, setWidth] = useState<'58mm' | '80mm'>('80mm');
  const [receiptHtml, setReceiptHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [printing, setPrinting] = useState<boolean>(false);
  const { success, error } = useNotification();

  useEffect(() => {
    if (isOpen && orderId) {
      loadReceipt();
    }
  }, [isOpen, orderId, width]);

  const loadReceipt = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await window.api.getReceiptHtml({ orderId, width });
      if (res.success && res.data) {
        setReceiptHtml(res.data.html);
      } else {
        error('Receipt Error', res.error || 'Failed to load receipt.');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!orderId) return;
    setPrinting(true);
    try {
      const res = await window.api.printReceipt({ orderId, width });
      if (res.success) {
        success('Print Success', 'Receipt sent to thermal printer.');
      } else {
        error('Print Failed', res.error || 'Check printer connection.');
      }
    } catch (err: any) {
      error('Print Error', err.message);
    } finally {
      setPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-bt-charcoal w-full max-w-xl h-[85vh] flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-4 border-b border-bt-border flex items-center justify-between bg-bt-bg">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-bt-brick" />
            <h3 className="font-mono font-bold text-sm text-bt-charcoal uppercase tracking-wider">
              Thermal Receipt Preview
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex border border-bt-border bg-white text-xs font-mono">
              <button
                onClick={() => setWidth('80mm')}
                className={`px-3 py-1 font-semibold ${width === '80mm' ? 'bg-bt-brick text-white' : 'text-bt-charcoal hover:bg-bt-bg'}`}
              >
                80mm
              </button>
              <button
                onClick={() => setWidth('58mm')}
                className={`px-3 py-1 font-semibold ${width === '58mm' ? 'bg-bt-brick text-white' : 'text-bt-charcoal hover:bg-bt-bg'}`}
              >
                58mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white text-bt-muted hover:text-bt-charcoal transition-colors border border-transparent hover:border-bt-border"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content: IFrame or Sandboxed Preview */}
        <div className="flex-1 bg-[#242424] p-6 overflow-y-auto flex justify-center items-start">
          {loading ? (
            <div className="flex items-center gap-2 text-white font-mono text-xs my-auto">
              <RefreshCw className="w-4 h-4 animate-spin text-bt-brick" />
              <span>Formatting thermal ticket...</span>
            </div>
          ) : (
            <div 
              className={`bg-white shadow-2xl p-2 border border-gray-300 transition-all ${width === '58mm' ? 'w-[250px]' : 'w-[320px]'}`}
            >
              <iframe
                title="Receipt Preview"
                srcDoc={receiptHtml}
                className="w-full h-[520px] border-none bg-white"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-bt-border bg-bt-bg flex items-center justify-between">
          <button
            onClick={loadReceipt}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-bt-border text-bt-charcoal font-mono text-xs uppercase hover:bg-bt-border transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-bt-border text-bt-charcoal font-mono text-xs uppercase font-semibold hover:bg-bt-border transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              disabled={printing || loading}
              className="flex items-center gap-2 px-5 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white font-mono text-xs uppercase font-bold tracking-wider shadow-sm transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{printing ? 'Printing...' : 'Print Ticket'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

