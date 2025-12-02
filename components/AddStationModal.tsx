import React, { useState, useEffect } from 'react';
import { Station, TransportType, UserLocation, Location } from '../types';
import { X, MapPin, Navigation, Crosshair, Map as MapIcon, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AddStationModalProps {
    userLocation: UserLocation | null;
    onAdd: (s: Omit<Station, 'id' | 'lastUpdate'>) => void;
    onClose: () => void;
    onRequestPickLocation: () => void;
    pickedLocation: Location | null;
}

const AddStationModal: React.FC<AddStationModalProps> = ({
    userLocation,
    onAdd,
    onClose,
    onRequestPickLocation,
    pickedLocation
}) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<TransportType>('scooter');
    const [capacity, setCapacity] = useState(10);
    const { t } = useLanguage();

    // Input Modes: 'gps' | 'manual' | 'map'
    const [mode, setMode] = useState<'gps' | 'manual' | 'map'>('gps');

    // Manual Coordinates
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');

    const [error, setError] = useState<string | null>(null);

    // If we came back from picking a location, switch to 'map' mode and set coords
    useEffect(() => {
        if (pickedLocation) {
            setMode('map');
            setManualLat(pickedLocation.lat.toFixed(6));
            setManualLng(pickedLocation.lng.toFixed(6));
        }
    }, [pickedLocation]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!name.trim()) {
            setError(t('stationName') + " boş olamaz.");
            return;
        }
        if (capacity <= 0) {
            setError(t('capacity') + " 0'dan büyük olmalıdır.");
            return;
        }

        let finalLat: number = 0;
        let finalLng: number = 0;

        if (mode === 'gps') {
            if (!userLocation) {
                setError("GPS verisi alınamadı. Lütfen harita veya koordinat modunu deneyin.");
                return;
            }
            finalLat = userLocation.lat;
            finalLng = userLocation.lng;
        } else if (mode === 'manual' || mode === 'map') {
            const lat = parseFloat(manualLat);
            const lng = parseFloat(manualLng);
            if (isNaN(lat) || isNaN(lng)) {
                setError("Geçersiz koordinat.");
                return;
            }
            finalLat = lat;
            finalLng = lng;
        }

        onAdd({
            name,
            type,
            location: {
                lat: finalLat,
                lng: finalLng
            },
            capacity,
            available: Math.floor(capacity / 2),
            status: 'active',
            isCustom: true
        });
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[90%] sm:w-full max-w-sm overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{t('addStation')}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"><X size={20} /></button>
                </div>

                <div className="overflow-y-auto p-4 flex-1">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-800 flex items-center gap-2">
                                <AlertTriangle size={16} />
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('stationName')}</label>
                            <input required value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="Örn: Ev Önü İstasyonu" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('stationType')}</label>
                            <select value={type} onChange={e => setType(e.target.value as TransportType)} className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                                <option value="bus">{t('bus')}</option>
                                <option value="metro">{t('metro')}</option>
                                <option value="bike">{t('bike')}</option>
                                <option value="scooter">{t('scooter')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('capacity')}</label>
                            <input type="number" min="1" max="500" required value={capacity} onChange={e => setCapacity(Number(e.target.value))} className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
                        </div>

                        {/* Location Mode Selector */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('pickLocation')}</label>
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3">
                                <button
                                    type="button"
                                    onClick={() => setMode('gps')}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-all ${mode === 'gps' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    <Navigation size={14} /> {t('gps')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('manual')}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-all ${mode === 'manual' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    <Crosshair size={14} /> {t('coords')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('map')}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-all ${mode === 'map' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    <MapIcon size={14} /> {t('map')}
                                </button>
                            </div>

                            {mode === 'gps' && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-center gap-2 text-blue-800 dark:text-blue-300 text-xs border border-blue-100 dark:border-blue-800">
                                    <Navigation size={16} />
                                    {userLocation ? t('gpsFound') : t('gpsSearching')}
                                </div>
                            )}

                            {mode === 'manual' && (
                                <div className="flex gap-2">
                                    <input type="number" step="any" placeholder="Enlem (Lat)" value={manualLat} onChange={e => setManualLat(e.target.value)} required className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors" />
                                    <input type="number" step="any" placeholder="Boylam (Lng)" value={manualLng} onChange={e => setManualLng(e.target.value)} required className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors" />
                                </div>
                            )}

                            {mode === 'map' && (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input readOnly type="text" placeholder="Lat" value={manualLat} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 transition-colors" />
                                        <input readOnly type="text" placeholder="Lng" value={manualLng} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 transition-colors" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onRequestPickLocation}
                                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors active:scale-95"
                                    >
                                        <MapIcon size={16} /> {t('pickOnMap')}
                                    </button>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">{t('pickOnMapDesc')}</p>
                                </div>
                            )}
                        </div>

                        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-200 dark:shadow-none mt-2 active:scale-95 transition-transform">
                            {t('save')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddStationModal;