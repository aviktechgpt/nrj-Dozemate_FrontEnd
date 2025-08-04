import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Load authentication data on initial render
        const storedToken = localStorage.getItem("token");
        const storedUserRole = localStorage.getItem("userRole");
        const storedUserData = localStorage.getItem("userData");
        
        if (storedToken) {
            setToken(storedToken);
            
            // Set user data if available
            if (storedUserData) {
                try {
                    setUser(JSON.parse(storedUserData));
                } catch (e) {
                    // If JSON parsing fails, create minimal user object with role
                    setUser({ role: storedUserRole || "user" });
                }
            } else if (storedUserRole) {
                // If only role is available (no user data)
                setUser({ role: storedUserRole });
            }
        }
    }, []);

    const login = (newToken, userData, userRole) => {
        // Store token
        localStorage.setItem("token", newToken);
        setToken(newToken);
        
        // Store role
        const role = userData?.role || userRole || "user";
        localStorage.setItem("userRole", role);
        
        // Store user data if provided
        if (userData) {
            localStorage.setItem("userData", JSON.stringify({
                ...userData,
                role // Ensure role is included in userData
            }));
            setUser({ ...userData, role });
        } else {
            setUser({ role });
        }
    };

    const logout = () => {
        // Clear all auth data
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userData");
        setToken(null);
        setUser(null);
    };

    const getRole = () => {
        return user?.role || localStorage.getItem("userRole") || "user";
    };

    return (
        <AuthContext.Provider value={{ 
            token, 
            login, 
            logout, 
            user,
            role: getRole(), 
            isAuthenticated: !!token
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);