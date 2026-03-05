import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (token) {
            fetchCurrentUser(token);
        } else {
            setIsLoaded(true);
        }
    }, [token]);

    const fetchCurrentUser = async (t) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${t}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                logout();
            }
        } catch (err) {
            console.error('Failed to fetch user:', err);
            // Don't logout on network error if we have a token, maybe? 
            // Better to logout if we can't verify.
            logout();
        } finally {
            setIsLoaded(true);
        }
    };

    const login = (newToken, userData) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const getToken = async () => token;

    return (
        <AuthContext.Provider value={{ user, setUser, token, login, logout, isLoaded, isSignedIn: !!user, getToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => useContext(AuthContext);
