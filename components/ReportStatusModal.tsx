import React, { useState, useEffect } from 'react';
import { Station } from '../types';
import { X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ReportStatusModalProps {
    station: Station;
    onClose: () => void;
    onSubmit: (available: number) => Promise<void>;
}

const ReportStatusModal: React.FC<ReportStatusModalProps> = ({ station, onClose, onSubmit }) => {
    const [available, setAvailable] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        // Initialize with current available count
        setAvailable(station.available.toString());
    }, [station]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAvailable(val);

        const numVal = parseInt(val);
        if (!isNaN(numVal) && numVal > station.capacity) {
            setError(`${t('capacity')} (${station.capacity}) aşılamaz!`);
        } else {
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numVal = parseInt(available);

        if (isNaN(numVal) || numVal < 0) {
            setError('Geçerli bir sayı giriniz.');
            return;
        }

        if (numVal > station.capacity) {
            setError(`${t('capacity')} (${station.capacity}) aşılamaz!`);
            return;
        }

        setLoading(true);
        try {
            await onSubmit(numVal);
            onClose();
        } catch (err) {
            // Error handling is done in parent or we can show it here if passed back
            // For now, we assume parent handles alerts, but we stop loading
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-800 dark:bg-slate-950 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        {t('reportStatus')}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-6">
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('station')}</div>
                        <div className="font-semibold text-slate-800 dark:text-white text-lg">{station.name}</div>
                        <div className="text-xs text-slate-400 mt-1">
                            {t('capacity')}: <span className="font-bold">{station.capacity}</span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            {t('currentAvailable')}
                        </label>
                        <input
                            type="number"
                            value={available}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all text-lg`}
                            placeholder="Örn: 5"
                            min="0"
                            max={station.capacity}
                            autoFocus
                        />
                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-sm mt-2 animate-pulse">
                                <AlertTriangle size={16} />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !!error || available === ''}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                t('send')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportStatusModal;
