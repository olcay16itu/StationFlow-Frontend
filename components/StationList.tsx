import React from 'react';
import Logo from './Logo';
import { Station, TransportType, User } from '../types';
import {
    Bus, Train, Bike, Zap, MapPin, Trash2, PlusCircle, LogIn, LogOut,
    CheckCircle, AlertCircle, Ban, Wrench, ChevronLeft, ShieldCheck, Navigation,
    Moon, Sun, Globe
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface StationListProps {
    stations: Station[];
    selectedStation: Station | null;
    onSelect: (s: Station) => void;
    onDelete: (id: string) => void;
    onAddClick: () => void;
    onLoginClick: () => void;
    onLogoutClick: () => void;
    filter: TransportType | 'all';
    setFilter: (t: TransportType | 'all') => void;
    isLoading: boolean;
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
}

const getIcon = (type: string, size = 18) => {
    const normalizedType = type.toLowerCase();
    switch (normalizedType) {
        case 'bus': return <Bus size={size} className="text-red-500" />;
        case 'metro': return <Train size={size} className="text-indigo-600" />;
        case 'bike': return <Bike size={size} className="text-green-600" />;
        case 'scooter': return <Zap size={size} className="text-yellow-600" />;
        default: return <MapPin size={size} className="text-slate-500" />;
    }
};

const StationList: React.FC<StationListProps> = ({
    stations,
    selectedStation,
    onSelect,
    onDelete,
    onAddClick,
    onLoginClick,
    onLogoutClick,
    filter,
    setFilter,
    isLoading,
    user,
    isOpen,
    onClose
}) => {
    const { darkMode, toggleDarkMode } = useTheme();
    const { language, setLanguage, t } = useLanguage();

    const categories: { id: TransportType | 'all'; label: string; icon: React.ReactNode }[] = [
        { id: 'all', label: t('all'), icon: <MapPin size={16} /> },
        { id: 'bus', label: t('bus'), icon: <Bus size={16} /> },
        { id: 'metro', label: t('metro'), icon: <Train size={16} /> },
        { id: 'bike', label: t('bike'), icon: <Bike size={16} /> },
        { id: 'scooter', label: t('scooter'), icon: <Zap size={16} /> },
    ];

    const isAdmin = user?.role === 'admin';

    const getStatusStyle = (status: string) => {
        const normalizedStatus = status.toLowerCase();
        switch (normalizedStatus) {
            case 'active': return {
                badge: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
                border: 'border-l-green-500',
                icon: CheckCircle,
                label: t('active')
            };
            case 'full': return {
                badge: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
                border: 'border-l-red-500',
                icon: AlertCircle,
                label: t('full')
            };
            case 'empty': return {
                badge: 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
                border: 'border-l-orange-500',
                icon: Ban,
                label: t('empty')
            };
            case 'maintenance': return {
                badge: 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
                border: 'border-l-gray-400',
                icon: Wrench,
                label: t('maintenance')
            };
            default: return {
                badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
                border: 'border-l-slate-300',
                icon: CheckCircle,
                label: status
            };
        }
    };

    return (
        <div className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-900 shadow-2xl z-40 w-[85vw] max-w-sm sm:w-96 transform transition-transform duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>

            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center z-10 relative shrink-0 gap-1 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                        title={t('close')}
                    >
                        <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
                    </button>
                    <div className="scale-75 sm:scale-90 origin-left">
                        <Logo />
                    </div>
                </div>


                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button
                        onClick={toggleDarkMode}
                        className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        {darkMode ? <Sun size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Moon size={16} className="sm:w-[18px] sm:h-[18px]" />}
                    </button>

                    <button
                        onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
                        className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors font-bold text-[10px] w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border border-slate-200 dark:border-slate-700"
                    >
                        {language === 'tr' ? 'EN' : 'TR'}
                    </button>

                    {user ? (
                        <div className="flex items-center gap-1 ml-0.5 sm:ml-1">
                            {isAdmin && (
                                <button
                                    onClick={onAddClick}
                                    className="p-1.5 sm:p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                    title={t('addStation')}
                                >
                                    <PlusCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
                                </button>
                            )}
                            <button
                                onClick={onLogoutClick}
                                className="p-1.5 sm:p-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title={t('logout')}
                            >
                                <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className="ml-0.5 sm:ml-1 flex items-center gap-1.5 bg-slate-800 dark:bg-slate-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm whitespace-nowrap"
                        >
                            <LogIn size={14} />
                            <span className="hidden sm:inline">{t('login')}</span>
                        </button>
                    )}
                </div>
            </div>

            {
                user && (
                    <div className={`px-4 py-2 text-xs font-medium flex justify-between items-center shadow-inner shrink-0 ${isAdmin ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300' : 'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'
                        }`}>
                        <span className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${isAdmin ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                            {user.username}
                        </span>
                        <span className="opacity-90 flex items-center gap-1">
                            {isAdmin ? <><ShieldCheck size={12} /> Admin</> : t('user')}
                        </span>
                    </div>
                )
            }

            {/* Filters */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 shrink-0 touch-pan-x">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setFilter(cat.id)}
                        className={`flex-none flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${filter === cat.id
                            ? 'bg-blue-600 text-white shadow-md scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                    >
                        {cat.icon}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/50 overscroll-contain">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm animate-pulse flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between">
                                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                    <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                </div>
                                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : stations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-center p-4 animate-fade-in-up">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                            <MapPin size={32} className="opacity-40" />
                        </div>
                        <p className="font-medium">{t('noStations')}</p>
                        {isAdmin && (
                            <button onClick={onAddClick} className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-bold hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                                {t('firstStation')}
                            </button>
                        )}
                    </div>
                ) : (
                    stations.map((station) => {
                        let statusStyle = getStatusStyle(station.status);

                        // Override color based on percentage logic requested by user
                        // Bus/Metro: >80% Orange, 100% Red
                        if (['bus', 'metro'].includes(station.type.toLowerCase())) {
                            const occupancy = Math.round(((station.capacity - station.available) / station.capacity) * 100);
                            if (occupancy === 100) {
                                statusStyle = {
                                    badge: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
                                    border: 'border-l-red-500',
                                    icon: AlertCircle,
                                    label: t('full')
                                };
                            } else if (occupancy >= 80) {
                                statusStyle = {
                                    badge: 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
                                    border: 'border-l-orange-500',
                                    icon: AlertCircle,
                                    label: t('busy')
                                };
                            }
                        }

                        const StatusIcon = statusStyle.icon;
                        const canDelete = isAdmin;

                        return (
                            <div
                                key={station.id}
                                onClick={() => onSelect(station)}
                                className={`group relative p-3.5 rounded-xl border-t border-b border-r cursor-pointer transition-all duration-200 hover:shadow-md animate-fade-in-up border-l-4 active:scale-[0.99]
                        ${statusStyle.border}
                        ${selectedStation?.id === station.id
                                        ? 'bg-blue-50 border-t-blue-200 border-b-blue-200 border-r-blue-200 ring-1 ring-blue-200/50 dark:bg-blue-900/20 dark:border-blue-800 dark:ring-blue-800'
                                        : 'bg-white dark:bg-slate-800 border-t-slate-100 dark:border-t-slate-700 border-b-slate-100 dark:border-b-slate-700 border-r-slate-100 dark:border-r-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                                    }`}
                                style={{ animationFillMode: 'both' }}
                            >
                                {/* Delete Button - Increased touch target */}
                                {canDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(t('deleteConfirm'))) {
                                                onDelete(station.id);
                                            }
                                        }}
                                        className="absolute top-2 right-2 p-2.5 -mr-1 -mt-1 bg-white/50 dark:bg-slate-800/50 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all z-30"
                                        title={t('delete')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}

                                <div className="flex justify-between items-start mb-2.5 pr-8">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-lg shadow-sm ${station.type === 'bus' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                            station.type === 'metro' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                                                station.type === 'bike' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                                            }`}>
                                            {getIcon(station.type, 20)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                                                <span className="truncate max-w-[120px] sm:max-w-[160px]">{station.name}</span>
                                                {station.isCustom && <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[9px] px-1.5 py-0.5 rounded font-bold border border-purple-200 dark:border-purple-800 shrink-0">YENİ</span>}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                                                {station.type.toLowerCase() === 'bike' ? t('bikeStation') :
                                                    station.type.toLowerCase() === 'scooter' ? t('scooterStation') :
                                                        station.type.toLowerCase() === 'bus' ? t('busStation') : t('metroStation')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm pl-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wide shadow-sm ${statusStyle.badge}`}>
                                            <StatusIcon size={10} strokeWidth={3} />
                                            {statusStyle.label}
                                        </div>
                                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 text-xs font-medium">
                                            <span className={`font-bold text-sm ${['bus', 'metro'].includes(station.type.toLowerCase())
                                                ? (Math.round(((station.capacity - station.available) / station.capacity) * 100) === 100 ? 'text-red-600 dark:text-red-400' : Math.round(((station.capacity - station.available) / station.capacity) * 100) >= 80 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-slate-100')
                                                : (station.status.toLowerCase() === 'full' ? 'text-red-600 dark:text-red-400' : station.status.toLowerCase() === 'empty' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-slate-100')
                                                }`}>
                                                {['bike', 'scooter'].includes(station.type) ? `${Math.round((station.available / station.capacity) * 100)}%` : `${Math.round(((station.capacity - station.available) / station.capacity) * 100)}%`}
                                            </span>
                                            {['bike', 'scooter'].includes(station.type) ? t('vehicle') : t('occupancy')}
                                        </span>
                                    </div>

                                    {selectedStation?.id === station.id && (
                                        <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs font-bold gap-1 animate-pulse mr-2">
                                            Seçildi <Navigation size={12} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div >
    );
};

export default StationList;