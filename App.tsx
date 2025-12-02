import React, { useState, useEffect, useMemo, useRef } from 'react';
import MapView from './components/MapView';
import StationList from './components/StationList';
import AuthView from './components/AuthView';
import AddStationModal from './components/AddStationModal';
import AdminDashboard from './components/AdminDashboard';
import ReportStatusModal from './components/ReportStatusModal';
import { Station, UserLocation, TransportType, User, Location } from './types';
import { fetchStations, createStation, deleteStation, requestStationUpdate } from './services/api';
import { Navigation, X, MapPin, Menu, XCircle, ShieldAlert, ChevronLeft } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [routeDestination, setRouteDestination] = useState<Station | null>(null);
  const [filter, setFilter] = useState<TransportType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showRoute, setShowRoute] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 640);

  // Auth & Management States
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [reportStation, setReportStation] = useState<Station | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Adding Station States
  const [showAddStation, setShowAddStation] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<Location | null>(null);

  const dataFetchedRef = useRef(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('urbanmove_user_session');
    if (savedUser) setUser(JSON.parse(savedUser));

    let watchId: number;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });

          if (!dataFetchedRef.current) {
            loadStations();
            dataFetchedRef.current = true;
          }
        },
        (error) => {
          console.error("Location error:", error);
          if (!dataFetchedRef.current) {
            loadStations();
            dataFetchedRef.current = true;
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    } else {
      loadStations();
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const loadStations = async () => {
    setIsLoading(true);
    try {
      const data = await fetchStations();
      setStations(data);
    } catch (e) {
      console.error("Failed to fetch stations", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('urbanmove_user_session', JSON.stringify(newUser));
    setShowAuth(false);
    loadStations();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('urbanmove_user_session');
    setShowAddStation(false);
    setIsPickingLocation(false);
    setStations([]);
    loadStations();
  };

  const handleAddStation = async (newStationData: Omit<Station, 'id' | 'lastUpdate'>) => {
    try {
      const station = await createStation({
        ...newStationData,
        ownerId: user?.id
      });

      setStations(prev => [...prev, station]);
      setShowAddStation(false);
      setPickedLocation(null);
      setSelectedStation(station);
    } catch (error: any) {
      alert("Durak eklenemedi: " + error.message);
    }
  };

  const handleDeleteStation = async (id: string) => {
    if (user?.role !== 'admin') return;

    try {
      await deleteStation(id);
      setStations(prev => prev.filter(s => s.id !== id));

      if (selectedStation?.id === id) {
        setSelectedStation(null);
      }

      if (routeDestination?.id === id) {
        setRouteDestination(null);
        setShowRoute(false);
      }
    } catch (error: any) {
      alert("Durak silinemedi: " + error.message);
    }
  };

  const startPickingLocation = () => {
    setShowAddStation(false);
    setIsSidebarOpen(false);
    setIsPickingLocation(true);
  };

  const handleLocationPicked = (loc: Location) => {
    setPickedLocation(loc);
    setIsPickingLocation(false);
    setShowAddStation(true);
    setIsSidebarOpen(window.innerWidth > 640);
  };

  const filteredStations = useMemo(() => {
    if (filter === 'all') return stations;
    return stations.filter(s => s.type.toLowerCase() === filter.toLowerCase());
  }, [stations, filter]);

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    if (window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
  };

  const handleCreateRoute = () => {
    if (!userLocation || !selectedStation) {
      alert("Konum bilgisi veya istasyon seçimi eksik.");
      return;
    }
    setRouteDestination(selectedStation);
    setShowRoute(true);
    if (window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
  };

  const handleRemoveRoute = () => {
    setRouteDestination(null);
    setShowRoute(false);
  };

  const handleReportStatus = (stationId: string) => {
    if (!user) {
      alert("Lütfen önce giriş yapın.");
      setShowAuth(true);
      return;
    }

    const station = stations.find(s => s.id === stationId);
    if (station) {
      setReportStation(station);
      setShowReportModal(true);
    }
  };

  const handleSubmitReport = async (available: number) => {
    if (!reportStation) return;

    try {
      await requestStationUpdate(reportStation.id, available);
      alert("Güncelleme isteği gönderildi. Admin onayı bekleniyor.");
      setShowReportModal(false);
      setReportStation(null);
    } catch (error: any) {
      alert("İstek gönderilemedi: " + error.message);
      throw error;
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-900 transition-colors duration-300">

      {showAuth && (
        <AuthView onAuthSuccess={handleLogin} onCancel={() => setShowAuth(false)} />
      )}

      {showAddStation && (
        <AddStationModal
          userLocation={userLocation}
          onAdd={handleAddStation}
          onClose={() => {
            setShowAddStation(false);
            setPickedLocation(null);
          }}
          onRequestPickLocation={startPickingLocation}
          pickedLocation={pickedLocation}
        />
      )}

      {/* Picking Location Banner */}
      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[90%] sm:w-auto flex justify-center">
          <div className="bg-slate-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-xl animate-bounce flex flex-col sm:flex-row items-center gap-3 border border-slate-700">
            <div className="flex items-center gap-2">
              <MapPin size={20} className="text-yellow-400 shrink-0" />
              <span className="font-bold text-sm text-center">Haritada konumu seçin</span>
            </div>
            <button
              onClick={() => { setIsPickingLocation(false); setShowAddStation(true); }}
              className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-slate-600 w-full sm:w-auto"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Toggle Button */}
      {!isSidebarOpen && !isPickingLocation && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-30 p-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors animate-fade-in-up hover:scale-105 active:scale-95 border border-slate-100 dark:border-slate-700"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Mobile Backdrop for Sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-30 sm:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <StationList
        stations={filteredStations}
        selectedStation={selectedStation}
        onSelect={handleStationSelect}
        onDelete={handleDeleteStation}
        onAddClick={() => setShowAddStation(true)}
        onLoginClick={() => setShowAuth(true)}
        onLogoutClick={handleLogout}
        filter={filter}
        setFilter={setFilter}
        isLoading={isLoading}
        user={user}
        isOpen={isSidebarOpen && !isPickingLocation}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="absolute inset-0 z-0">
        <MapView
          stations={filteredStations}
          userLocation={userLocation}
          selectedStation={selectedStation}
          routeDestination={routeDestination}
          onStationSelect={handleStationSelect}
          showRoute={showRoute}
          isPickingLocation={isPickingLocation}
          onLocationPicked={handleLocationPicked}
          onCreateRoute={handleCreateRoute}
          onRemoveRoute={handleRemoveRoute}
          onReportStatus={handleReportStatus}
        />

        {/* Floating End Route Button */}
        {showRoute && routeDestination && (
          <div className="absolute bottom-8 sm:bottom-10 left-0 right-0 z-[500] flex justify-center px-4 pointer-events-none pb-safe">
            <button
              onClick={handleRemoveRoute}
              className="pointer-events-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-full shadow-[0_10px_40px_-10px_rgba(220,38,38,0.5)] transform transition-all hover:scale-105 active:scale-95 flex items-center gap-2 animate-fade-in-up border-2 border-white/20 max-w-[90%] truncate"
            >
              <XCircle size={24} className="shrink-0" />
              <span className="truncate">Rotayı Bitir ({routeDestination.name})</span>
            </button>
          </div>
        )}

        {/* Admin Dashboard Toggle */}
        {user?.role === 'admin' && (
          <div className="absolute top-4 right-4 z-[500]">
            <button
              onClick={() => setShowAdminDashboard(!showAdminDashboard)}
              className="bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
              title="Admin Paneli"
            >
              <ShieldAlert size={24} />
            </button>
          </div>
        )}

        {/* Admin Dashboard Modal */}
        {showAdminDashboard && (
          <div className="absolute inset-0 z-[600] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto">
              <button
                onClick={() => setShowAdminDashboard(false)}
                className="absolute top-4 right-4 z-10 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
              >
                <X size={24} />
              </button>
              <AdminDashboard />
            </div>
          </div>
        )}

        {/* Report Status Modal */}
        {showReportModal && reportStation && (
          <ReportStatusModal
            station={reportStation}
            onClose={() => { setShowReportModal(false); setReportStation(null); }}
            onSubmit={handleSubmitReport}
          />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;