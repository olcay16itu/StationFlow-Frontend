import { Station, User, TransportType, Location } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Helper to get auth header
const getAuthHeader = () => {
    const userStr = localStorage.getItem('urbanmove_user_session');
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user.token) {
            return { 'Authorization': `Bearer ${user.token}` };
        }
    }
    return {};
};

export const login = async (username: string, password: string): Promise<User & { token: string }> => {
    const response = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object' && !errorData.message) {
            const messages = Object.values(errorData).join('\n');
            throw new Error(messages || 'Giriş başarısız');
        }
        throw new Error(errorData.message || 'Giriş başarısız');
    }

    const data = await response.json();
    // Map backend response to frontend User type
    return {
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.roles.includes('ROLE_ADMIN') ? 'admin' : 'user',
        token: data.token
    };
};

export const register = async (username: string, email: string, password: string, recaptchaToken: string): Promise<void> => {
    const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role: ['user'], recaptchaToken }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Handle validation errors (Map<String, String>)
        if (errorData && typeof errorData === 'object' && !errorData.message) {
            const messages = Object.values(errorData).join('\n');
            throw new Error(messages || 'Kayıt başarısız');
        }
        throw new Error(errorData.message || 'Kayıt başarısız');
    }
};

export const fetchStations = async (): Promise<Station[]> => {
    const response = await fetch(`${API_URL}/stations`, {
        headers: { ...getAuthHeader() }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch stations');
    }

    return response.json();
};

export const createStation = async (station: Omit<Station, 'id' | 'lastUpdate'>): Promise<Station> => {
    const response = await fetch(`${API_URL}/stations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify(station),
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Format validation errors
        if (typeof errorData === 'object') {
            const messages = Object.values(errorData).join(', ');
            throw new Error(messages || 'Failed to create station');
        }
        throw new Error('Failed to create station');
    }

    return response.json();
};

export const deleteStation = async (id: string) => {
    const response = await fetch(`${API_URL}/stations/${id}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeader()
        }
    });

    if (!response.ok) {
        throw new Error('Failed to delete station');
    }
};

// --- Update Requests ---

export const requestStationUpdate = async (stationId: string, available: number) => {
    const response = await fetch(`${API_URL}/stations/${stationId}/request-update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify({ available })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'İstek gönderilemedi');
    }
    return response.json();
};

export const fetchUpdateRequests = async () => {
    const response = await fetch(`${API_URL}/stations/requests`, {
        headers: {
            ...getAuthHeader()
        }
    });

    if (!response.ok) {
        throw new Error('İstekler alınamadı');
    }
    return response.json();
};

export const fetchMyUpdateRequests = async () => {
    const response = await fetch(`${API_URL}/stations/my-requests`, {
        headers: {
            ...getAuthHeader()
        }
    });

    if (!response.ok) {
        throw new Error('Geçmiş istekler alınamadı');
    }
    return response.json();
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Şifre değiştirilemedi');
    }
    return data;
};

export const approveUpdateRequest = async (requestId: string) => {
    const response = await fetch(`${API_URL}/stations/requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
            ...getAuthHeader()
        }
    });

    if (!response.ok) {
        throw new Error('İstek onaylanamadı');
    }
    return response.json();
};

export const rejectUpdateRequest = async (requestId: string) => {
    const response = await fetch(`${API_URL}/stations/requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
            ...getAuthHeader()
        }
    });

    if (!response.ok) {
        throw new Error('İstek reddedilemedi');
    }
    return response.json();
};

export const submitFeedback = async (message: string, email?: string) => {
    const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Feedback can be anonymous, so auth header is optional but good if available
            ...getAuthHeader()
        },
        body: JSON.stringify({ message, email })
    });

    if (!response.ok) {
        throw new Error('Geri bildirim gönderilemedi');
    }
    return response.json();
};

export const fetchFeedbacks = async () => {
    const response = await fetch(`${API_URL}/feedback`, {
        headers: {
            ...getAuthHeader()
        }
    });

    if (!response.ok) {
        throw new Error('Geri bildirimler alınamadı');
    }
    return response.json();
};
