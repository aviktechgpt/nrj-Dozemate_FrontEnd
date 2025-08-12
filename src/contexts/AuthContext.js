import { createContext, useContext, useState, useEffect } from "react";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        // Load authentication data on initial render
        const raw = localStorage.getItem("token");
        const storedToken = raw && raw !== "undefined" && raw !== "null" ? raw : null;

        const storedUserRole = localStorage.getItem("userRole");
        const storedUserData = localStorage.getItem("userData");

        if (storedToken) {
            setToken(storedToken);

            // Set user data if available
            if (storedUserData) {
                try {
                    const parsed = JSON.parse(storedUserData);
                    setUser({ ...parsed, role: parsed.role || storedUserRole || "user" });
                } catch {
                    setUser({ role: storedUserRole || "user" });
                }
            } else if (storedUserRole) {
                // If only role is available (no user data)
                setUser({ role: storedUserRole });
            }
        }
        else {
            setToken(null);
            setUser(null);
        }

        setAuthChecked(true); // <-- mark ready
    }, []);

    const login = (newToken, userData, userRole) => {
        // Store token
        localStorage.setItem("token", newToken);
        setToken(newToken);

        localStorage.setItem('user', JSON.stringify(user));

        // Store role
        const role = userData?.role || userRole || "user";
        localStorage.setItem("userRole", role);


        // Store user data if provided
        if (userData) {
            const toStore = { ...userData, role };
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
            user,
            role: getRole(),
            isAuthenticated: !!token,
            authChecked,             // <-- expose
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);