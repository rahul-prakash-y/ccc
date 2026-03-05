import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info } from 'lucide-react';
import { useConfirm } from '../store/confirmStore';

const ConfirmModal = () => {
    const { isOpen, title, message, confirmLabel, cancelLabel, isDanger, onConfirm, onCancel, closeConfirm } = useConfirm();

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        closeConfirm();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        closeConfirm();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-sm overflow-hidden bg-white rounded-2xl shadow-xl border border-slate-200"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`shrink-0 p-3 rounded-xl ${isDanger ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {isDanger ? <AlertTriangle size={24} /> : <Info size={24} />}
                                </div>
                                <div className="flex-1 pt-1">
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2">
                                        {title}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium whitespace-pre-wrap leading-relaxed">
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-all shadow-sm active:scale-95"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-white ${isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                    }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
