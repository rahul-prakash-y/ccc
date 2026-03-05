import { create } from 'zustand';

export const useConfirm = create((set) => ({
    isOpen: false,
    message: '',
    title: 'Confirm Action',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    isDanger: false,
    onConfirm: null,
    onCancel: null,
    showConfirm: (options) => set({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure?',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        isDanger: options.isDanger || false,
        onConfirm: options.onConfirm || null,
        onCancel: options.onCancel || null,
    }),
    closeConfirm: () => set({ isOpen: false })
}));
