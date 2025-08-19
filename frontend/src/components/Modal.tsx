import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        '2xl': 'max-w-6xl',
        '3xl': 'max-w-7xl'
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
                    onClick={onClose}
                ></div>

                {/* Modal panel */}
                <div
                    className={`inline-block align-bottom rounded-lg text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} sm:w-full border border-accent`}
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        boxShadow: 'var(--shadow-lg)'
                    }}
                >
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-primary">
                                {title}
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-muted hover:text-secondary transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;