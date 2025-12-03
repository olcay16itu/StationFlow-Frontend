import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { submitFeedback } from '../services/api';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!message.trim()) return;
        if (message.length < 10) {
            setError(t('feedbackTooShort') || 'Mesajınız çok kısa (en az 10 karakter).');
            return;
        }
        if (message.length > 500) {
            setError(t('feedbackTooLong') || 'Mesajınız çok uzun (en fazla 500 karakter).');
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError(t('invalidEmail') || 'Geçersiz e-posta adresi.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await submitFeedback(message, email);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setMessage('');
                setEmail('');
            }, 2000);
        } catch (err: any) {
            // Display backend error message if available
            setError(err.message || 'Geri bildirim gönderilirken bir hata oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {t('feedbackTitle') || 'Geri Bildirim'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                {t('feedbackSuccess') || 'Teşekkürler!'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {t('feedbackSent') || 'Geri bildiriminiz alındı.'}
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('feedbackMessage') || 'Mesajınız'}
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-32"
                                    placeholder={t('feedbackPlaceholder') || 'Görüş ve önerilerinizi yazın...'}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('emailOptional') || 'E-posta (İsteğe bağlı)'}
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="ornek@email.com"
                                />
                            </div>

                            {error && (
                                <p className="text-red-500 text-sm">{error}</p>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 mr-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    {t('cancel') || 'İptal'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !message.trim()}
                                    className={`px-6 py-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all transform 
                                        ${isSubmitting || !message.trim()
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:bg-blue-700 hover:scale-105'
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>{t('sending') || 'Gönderiliyor...'}</span>
                                        </div>
                                    ) : (t('send') || 'Gönder')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
