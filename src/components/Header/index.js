import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoLight from '../../assets/images/logo.png';
import logoDark from '../../assets/images/logo-dark.png';
import { MdMenuOpen, MdOutlineMenu, MdLightMode, MdNightlight, MdNotifications } from "react-icons/md";
import { IoMdMail } from "react-icons/io";
import Button from '@mui/material/Button';
import SearchBox from '../SearchBox';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import { FaLock } from "react-icons/fa";
import { IoShieldHalfSharp } from "react-icons/io5";
import { MyContext } from "../../App"; // Verify this path
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../../contexts/AuthContext'; // Ensure this path is correct
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get the appropriate logo based on the theme
    const getLogo = () => {
        return context.themeMode === 'dark' ? logoDark : logoLight;
    };


    const handleClickAccDrop = (event) => {
        setAnchorEl(event.currentTarget);
    };
    
    const handleCloseAccDrop = () => {
        setAnchorEl(null);
    };

    const navigate = useNavigate();
    const { logout, user, role } = useAuth();

    const handleLogout = () => {
        logout(); // Clears token, role, and user data
        navigate("/login");
    };

    // const handleLogout = () => {
    //     // Redirect to login page
    //     window.location.href = '/logout';
    // };

    // Fetch user data when component mounts
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('No authentication token found');
                    setLoading(false);
                    return;
                }

                const response = await fetch('https://admin.dozemate.com/api/user/profile', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user profile');
                }

                const data = await response.json();
                setUserData(data.data);
            } catch (err) {
                console.error('Error fetching user profile:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    const context = useContext(MyContext);
    if (!context) {
        console.error('MyContext is not provided. Check the import path or Provider setup.');
        return <div>Context not available - Please check the context provider.</div>;
    }

    // Get profile image URL
    const getProfileImageUrl = () => {
        if (!userData || !userData.profileImage) {
            return 'https://via.placeholder.com/40';
        }
        
        // Check if the profile image is a full URL or just a path
        if (userData.profileImage.startsWith('http')) {
            return userData.profileImage;
        }
        
        // Otherwise, prepend the backend URL
        return `https://admin.dozemate.com${userData.profileImage}`;
    };

    return (
        <header className="d-flex align-items-center">
            <div className="container-fluid w-300">
                <div className="row d-flex align-items-center w-300">
                    {/* Logo Wrapper with dynamic logo */}
                    <div className="col-sm-2 part1">
                        <Link to={'/'} className="d-flex align-items-center logo">
                            <img 
                                src={getLogo()} 
                                alt="Logo" 
                                className="header-logo"
                            />
                        </Link>
                    </div>

                    <div className="col-sm-3 d-flex align-items-center part2 pl-4">
                        <Button
                            className="rounded-circle mr-3"
                            onClick={() => context.setIsToggleSidebar(!context.isToggleSidebar)}
                        >
                            {context.isToggleSidebar === false ? <MdMenuOpen /> : <MdOutlineMenu />}
                        </Button>
                        {/* <SearchBox /> */}
                    </div>

                    <div className="col-sm-7 d-flex align-items-center justify-content-end part3">
                        <Button className="rounded-circle mr-3"><MdNotifications /></Button>
                        <Button className="rounded-circle mr-3"><IoMdMail /></Button>
                        {/* <Button 
                            className="rounded-circle mr-3"
                            onClick={() => {
                                const newTheme = context.themeMode === "light" ? "dark" : "light";
                                context.setThemeMode(newTheme);
                                localStorage.setItem('themeMode', newTheme);
                                console.log("Theme changed to:", newTheme); // Debug log
                            }}
                        >
                            {context.themeMode === "light" ? <MdLightMode /> : <MdNightlight />}
                        </Button> */}

                        <div className="myAccWrapper">
                            <Button
                                className="myAcc d-flex align-items-center"
                                onClick={handleClickAccDrop}
                                aria-controls={open ? 'account-menu' : undefined}
                                aria-haspopup="true"
                                aria-expanded={open ? 'true' : undefined}
                            >
                                <div className="userImg">
                                    <span className="rounded-circle">
                                        {loading ? (
                                            <CircularProgress size={24} />
                                        ) : (
                                            <img 
                                                src={getProfileImageUrl()} 
                                                alt="User" 
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'https://via.placeholder.com/40';
                                                }}
                                            />
                                        )}
                                    </span>
                                </div>
                                <div className="userInfo">
                                    {loading ? (
                                        <>
                                            <h6>Loading...</h6>
                                            <p className="mb-0">Please wait</p>
                                        </>
                                    ) : error ? (
                                        <>
                                            <h6>Error</h6>
                                            <p className="mb-0">Please login again</p>
                                        </>
                                    ) : (
                                        <>
                                            <h6>{userData?.name || 'User'}</h6>
                                            <p className="mb-0">{userData?.role || 'User'}</p>
                                        </>
                                    )}
                                </div>
                            </Button>
                            <Menu
                                anchorEl={anchorEl}
                                id="account-menu"
                                open={open}
                                onClose={handleCloseAccDrop}
                                slotProps={{
                                    paper: {
                                        elevation: 0,
                                        sx: {
                                            overflow: 'visible',
                                            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                            mt: 1.5,
                                            '& .MuiAvatar-root': {
                                                width: 32,
                                                height: 32,
                                                ml: -0.5,
                                                mr: 1,
                                            },
                                            '&::before': {
                                                content: '""',
                                                display: 'block',
                                                position: 'absolute',
                                                top: 0,
                                                right: 14,
                                                width: 10,
                                                height: 10,
                                                bgcolor: 'background.paper',
                                                transform: 'translateY(-50%) rotate(45deg)',
                                                zIndex: 0,
                                            },
                                        },
                                    },
                                }}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                <MenuItem onClick={handleCloseAccDrop} component={Link} to="/profile">
                                    <Avatar /> Profile
                                </MenuItem>
                                {/* <MenuItem onClick={handleCloseAccDrop} component={Link} to="/account">
                                    <Avatar /> My account
                                </MenuItem> */}
                                <Divider />
                                <MenuItem onClick={handleCloseAccDrop} component={Link} to="/reset-password">
                                    <ListItemIcon>
                                        <IoShieldHalfSharp fontSize="large" />
                                    </ListItemIcon>
                                    Reset Password
                                </MenuItem>
                                {/* <MenuItem onClick={handleCloseAccDrop} component={Link} to="/settings">
                                    <ListItemIcon>
                                        <Settings fontSize="small" />
                                    </ListItemIcon>
                                    Settings
                                </MenuItem> */}
                                <MenuItem onClick={handleLogout}>
                                    <ListItemIcon>
                                        <Logout fontSize="small" />
                                    </ListItemIcon>
                                    Logout
                                </MenuItem>
                            </Menu>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;