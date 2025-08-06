import React from "react";
import { Button, Typography, Box, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { RxDashboard } from "react-icons/rx";
import { FaAngleRight, FaUsers } from "react-icons/fa6";
import { TbLibraryPlus, TbReportAnalytics } from "react-icons/tb";
import { MdHistory, MdDevicesOther, MdOutlineContactSupport, MdLocalPostOffice, MdSettingsInputComponent } from "react-icons/md";
import { HiOutlineDocumentReport, HiOutlineUserCircle } from "react-icons/hi";
import { IoMdInformationCircleOutline, IoMdAnalytics } from "react-icons/io";
import { BiLogOut, BiSolidUserCircle } from "react-icons/bi";
import { MdAdminPanelSettings, MdSettings } from "react-icons/md";
import { FaDatabase } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import './Sidebar.css';

const Sidebar = () => {
    const navigate = useNavigate();
    const { logout, user, role } = useAuth();

    const handleLogout = () => {
        logout(); // Clears token, role, and user data
        navigate("/login");
    };

    // User sidebar (original)
    const renderUserSidebar = () => (
        <ul type="none">
            <li>
                <Button className="w-100" onClick={() => navigate("/dashboard")}>
                    <span className="icon"><RxDashboard/></span>
                    Dashboard
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/history")}>
                    <span className="icon"><MdHistory/></span>
                    History
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/my-devices")}>
                    <span className="icon"><MdDevicesOther/></span>
                    Devices
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/add-device")}>
                    <span className="icon"><TbLibraryPlus/></span>
                    Add Device
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/profile")}>
                    <span className="icon"><HiOutlineUserCircle/></span>
                    Profile
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/support")}>
                    <span className="icon"><MdOutlineContactSupport /></span>
                    Support  
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/about")}>
                    <span className="icon"><IoMdInformationCircleOutline/></span>
                    About Us 
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={handleLogout} color="error">
                    <span className="icon"><BiLogOut /></span>
                    Logout
                </Button>
            </li>
        </ul>
    );

    // Admin sidebar
    const renderAdminSidebar = () => (
        <ul type="none">
            <li>
                <Button className="w-100" onClick={() => navigate("/admin/dashboard")}>
                    <span className="icon"><RxDashboard/></span>
                    Admin Dashboard
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/admin/users")}>
                    <span className="icon"><FaUsers/></span>
                    User Management
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/admin/devices")}>
                    <span className="icon"><MdDevicesOther/></span>
                    Device Management
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/admin/history")}>
                    <span className="icon"><IoMdAnalytics/></span>
                    User History
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/admin/report")}>
                    <span className="icon"><HiOutlineDocumentReport/></span>
                    Download Report
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/admin/profile")}>
                    <span className="icon"><BiSolidUserCircle/></span>
                    Profile
                </Button>
            </li>
            {/* <li>
                <Button className="w-100" onClick={() => navigate("/admin/settings")}>
                    <span className="icon"><MdSettings /></span>
                    Settings
                </Button>
            </li> */}

                        <li>
                <Button className="w-100" onClick={() => navigate("/support")}>
                    <span className="icon"><MdOutlineContactSupport /></span>
                    Support  
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/about")}>
                    <span className="icon"><IoMdInformationCircleOutline/></span>
                    About Us 
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={handleLogout} color="error">
                    <span className="icon"><BiLogOut /></span>
                    Logout
                </Button>
            </li>
        </ul>
    );

    // Super Admin sidebar
    const renderSuperAdminSidebar = () => (
        <ul type="none">
            <li>
                <Button className="w-100" onClick={() => navigate("/superadmin/dashboard")}>
                    <span className="icon"><RxDashboard/></span>
                    Master Dashboard
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/superadmin/organizations")}>
                    <span className="icon"><MdSettingsInputComponent/></span>
                    Organizations
                </Button>
            </li>

            <li>
                <Button className="w-100" onClick={() => navigate("/superadmin/admins")}>
                    <span className="icon"><MdAdminPanelSettings/></span>
                    Admin Management
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/superadmin/users")}>
                    <span className="icon"><FaUsers/></span>
                    User Management
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/superadmin/devices")}>
                    <span className="icon"><MdDevicesOther/></span>
                    Device Management
                </Button>
            </li>
            {/* <li>
                <Button className="w-100" onClick={() => navigate("/superadmin/reports")}>
                    <span className="icon"><TbReportAnalytics/></span>
                    Reports
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={() => navigate("/superadmin/database")}>
                    <span className="icon"><FaDatabase /></span>
                    Database
                </Button>
            </li> */}
            <li>
                <Button className="w-100" onClick={() => navigate("/superadmin/profile")}>
                    <span className="icon"><HiOutlineUserCircle/></span>
                    Profile
                </Button>
            </li>
            <li>
                <Button className="w-100" onClick={handleLogout} color="error">
                    <span className="icon"><BiLogOut /></span>
                    Logout
                </Button>
            </li>
        </ul>
    );

    return (
        <div className="sidebar">
            {role === "admin" && (
                <Box sx={{ p: 1, mb: 1 }}>
                    <Typography variant="subtitle2" color="primary" align="center" sx={{ fontWeight: 'bold' }}>
                        Administrator Panel
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                </Box>
            )}
            
            {role === "superadmin" && (
                <Box sx={{ p: 1, mb: 1 }}>
                    <Typography variant="subtitle2" color="primary" align="center" sx={{ fontWeight: 'bold' }}>
                        Super Administrator
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                </Box>
            )}
            
            {!role || role === "user" && renderUserSidebar()}
            {role === "admin" && renderAdminSidebar()}
            {role === "superadmin" && renderSuperAdminSidebar()}
        </div>
    );
};

export default Sidebar;