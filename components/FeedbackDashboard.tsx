import React, { useEffect, useState } from 'react';
import { X, Trash2, Mail, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Feedback {
    id: string;
    message: string;
    email: string | null;
    ipAddress: string;
    createdAt: string;
}

interface FeedbackDashboardProps {
    onClose: () => void;
}

const FeedbackDashboard: React.FC<FeedbackDashboardProps> = ({ onClose }) => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (user?.token) {
            fetchFeedbacks();
        }
    }, [user]);

    const fetchFeedbacks = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/feedback`, {
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setFeedbacks(data);
            }
        } catch (error) {
            console.error("Failed to fetch feedbacks", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu geri bildirimi silmek istediğinize emin misiniz?")) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/feedback/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            });

            if (response.ok) {
                setFeedbacks(prev => prev.filter(f => f.id !== id));
            } else {
                alert("Silme işlemi başarısız oldu.");
            }
        } catch (error) {
            console.error("Failed to delete feedback", error);
            alert("Bir hata oluştu.");
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-fade-in-up">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                        <MessageSquare className="text-purple-600 dark:text-purple-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Geri Bildirimler</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Kullanıcılardan gelen mesajlar</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-10">
                        Henüz geri bildirim yok.
                    </div>
                ) : (
                    feedbacks.map(feedback => (
                        <div key={feedback.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="font-mono bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                                        {new Date(feedback.createdAt).toLocaleDateString('tr-TR')}
                                    </span>
                                    {feedback.email && (
                                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                            <Mail size={12} />
                                            {feedback.email}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(feedback.id)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                                    title="Sil"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <p className="text-slate-700 dark:text-slate-200 text-sm whitespace-pre-wrap">
                                {feedback.message}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FeedbackDashboard;
