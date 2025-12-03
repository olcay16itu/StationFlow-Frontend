import React, { useEffect, useState } from 'react';
import { fetchUpdateRequests, approveUpdateRequest, rejectUpdateRequest } from '../services/api';

import { UpdateRequest } from '../types';

const AdminDashboard: React.FC = () => {
    const [requests, setRequests] = useState<UpdateRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const data = await fetchUpdateRequests();
            setRequests(data);
        } catch (err) {
            setError('İstekler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await approveUpdateRequest(id);
            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            alert('Onaylama başarısız');
        }
    };

    const handleReject = async (id: string) => {
        try {
            await rejectUpdateRequest(id);
            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            alert('Reddetme başarısız');
        }
    };

    if (loading) return <div className="p-4">Yükleniyor...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto mt-10">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Bekleyen İstasyon Güncellemeleri</h2>

            {requests.length === 0 ? (
                <p className="text-slate-500">Bekleyen istek yok.</p>
            ) : (
                <div className="space-y-4">
                    {requests.map(request => (
                        <div key={request.id} className="border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 gap-4 sm:gap-0">
                            <div>
                                <div className="font-semibold text-slate-700">İstasyon: {request.stationName}</div>
                                <div className="text-sm text-slate-500">Kullanıcı: {request.username}</div>
                                <div className="mt-1">
                                    Talep Edilen Doluluk: <span className="font-bold text-blue-600">{request.requestedAvailable}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {new Date(request.createdAt).toLocaleString('tr-TR')}
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => handleApprove(request.id)}
                                    className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors text-center"
                                >
                                    Onayla
                                </button>
                                <button
                                    onClick={() => handleReject(request.id)}
                                    className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors text-center"
                                >
                                    Reddet
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
