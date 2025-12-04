import React, { useState, useEffect } from 'react';
import { User, UpdateRequest } from '../types';
import { fetchMyUpdateRequests } from '../services/api';
import { X, User as UserIcon, History, Clock, CheckCircle, XCircle } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

interface UserProfileModalProps {
    user: User;
    onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
    const [requests, setRequests] = useState<UpdateRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await fetchMyUpdateRequests();
            setRequests(data);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-xs font-bold"><Clock size={12} /> Bekliyor</span>;
            case 'APPROVED':
                return <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold"><CheckCircle size={12} /> Onaylandı</span>;
            case 'REJECTED':
                return <span className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-bold"><XCircle size={12} /> Reddedildi</span>;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <UserIcon size={20} className="text-blue-500" />
                        Kullanıcı Profili
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        Profil Bilgileri
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        Geçmiş İsteklerim
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'profile' ? (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 text-3xl font-bold mb-3">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{user.username}</h3>
                                <span className="text-sm text-slate-500 dark:text-slate-400">{user.email}</span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">Rol</span>
                                    <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full uppercase">{user.role}</span>
                                </div>
                                <button
                                    className="w-full py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                    onClick={() => setShowChangePasswordModal(true)}
                                >
                                    Şifre Değiştir
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-8 text-slate-500">Yükleniyor...</div>
                            ) : requests.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 flex flex-col items-center gap-2">
                                    <History size={32} className="opacity-20" />
                                    <p>Henüz bir güncelleme isteğiniz yok.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {requests.map((req) => (
                                        <div key={req.id} className="bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-slate-800 dark:text-white">{req.stationName}</span>
                                                {getStatusBadge(req.status)}
                                            </div>
                                            <div className="flex justify-between items-end text-sm">
                                                <div className="text-slate-500 dark:text-slate-400">
                                                    Talep: <span className="font-bold text-slate-700 dark:text-slate-300">{req.requestedAvailable}</span>
                                                </div>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(req.createdAt).toLocaleDateString('tr-TR')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {showChangePasswordModal && (
                <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />
            )}
        </div>
    );
};

export default UserProfileModal;
