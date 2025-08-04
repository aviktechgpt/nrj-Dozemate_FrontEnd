import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import "chartjs-adapter-date-fns";
import zoomPlugin from "chartjs-plugin-zoom";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { setupMqttMode } from "../../services/mqttMode";
import { setupDatabaseMode } from "../../services/databaseMode";
import { disconnectMQTT } from "../../mqtt/mqtt";
import "./Dashboard.css";

Chart.register(...registerables, zoomPlugin, ChartDataLabels);

const MAX_STORAGE_MINUTES = 1440; // 24 hours
const DISPLAY_WINDOW_MINUTES = 30; // Window size
const RIGHT_MARGIN_MINUTES = 2; // 2 minutes margin on the right when live

const UNIT_MAPPINGS = {
    temp: " °C",
    humidity: " %",
    iaq: "",  // IAQ is unitless (index)
    eco2: " ppm",
    tvoc: " ppb",
    etoh: " ppb",
    hrv: " ms",
    stress: "",  // Stress is unitless (index)
};

// Global connection state to persist across re-renders
let globalConnectionState = {
    isConnected: false,
    mode: "database",
    mqttClient: null
};

const Dashboard = React.memo(() => {
    console.log("Dashboard component rendering..."); // Debug log
    
    // Declare all hooks at the top
    const chartRef = useRef(null);
    const isInitializedRef = useRef(false);
    
    const [data, setData] = useState({
        temp: null,
        humidity: null,
        iaq: null,
        eco2: null,
        tvoc: null,
        etoh: null,
        hrv: null,
        stress: null,
    });
    
    const [isDark, setIsDark] = useState(() => document.body.classList.contains('dark'));
    
    // Memoize the getTextColor function
    const getTextColor = useCallback(() => {
        return isDark ? '#e0e0e0' : '#555555';
    }, [isDark]);

    const [chartData, setChartData] = useState(() => {
        const storedData = localStorage.getItem("chartData");
        return storedData
            ? JSON.parse(storedData)
            : {
                  labels: [],
                  datasets: [
                      {
                          label: "Respiration",
                          data: [],
                          borderColor: "rgba(54, 162, 235, 1)",
                          backgroundColor: "rgba(54, 162, 235, 0.2)",
                          fill: true,
                          tension: 0.4,
                          pointRadius: 0,
                          pointHoverRadius: 9,
                          borderWidth: 3,
                      },
                      {
                          label: "Heart Rate",
                          data: [],
                          borderColor: "rgba(255, 99, 132, 1)",
                          backgroundColor: "rgba(255, 99, 132, 0.2)",
                          fill: true,
                          tension: 0.4,
                          pointRadius: 0,
                          pointHoverRadius: 6,
                          borderWidth: 3,
                      },
                  ],
              };
    });

    const [mode, setMode] = useState(() => globalConnectionState.mode);
    const [isAutoScrolling, setIsAutoScrolling] = useState(true);

    // Initialize connection only once
    useEffect(() => {
        if (isInitializedRef.current) return;
        
        console.log("Initializing Dashboard connection..."); // Debug log
        isInitializedRef.current = true;

        const initializeConnection = async () => {
            if (mode === "mqtt") {
                try {
                    const client = await setupMqttMode(setData, setChartData, chartRef, isAutoScrolling);
                    globalConnectionState.mqttClient = client;
                    globalConnectionState.isConnected = true;
                    globalConnectionState.mode = "mqtt";
                } catch (error) {
                    console.error("Failed to setup MQTT:", error);
                }
            } else {
                setupDatabaseMode(setData, setChartData, chartRef);
                globalConnectionState.isConnected = true;
                globalConnectionState.mode = "database";
            }
        };

        initializeConnection();

        // Cleanup function that only runs on component unmount
        return () => {
            console.log("Dashboard component unmounting..."); // Debug log
            if (globalConnectionState.mqttClient) {
                disconnectMQTT();
                globalConnectionState.mqttClient = null;
            }
            globalConnectionState.isConnected = false;
            isInitializedRef.current = false;
        };
    }, []); // Empty dependency array - only run once

    // Handle mode changes separately
    useEffect(() => {
        if (!isInitializedRef.current) return;
        
        const handleModeChange = async () => {
            if (globalConnectionState.mode !== mode) {
                console.log(`Switching mode from ${globalConnectionState.mode} to ${mode}`); // Debug log
                
                // Disconnect existing connection
                if (globalConnectionState.mqttClient) {
                    disconnectMQTT();
                    globalConnectionState.mqttClient = null;
                }

                // Setup new connection
                if (mode === "mqtt") {
                    try {
                        const client = await setupMqttMode(setData, setChartData, chartRef, isAutoScrolling);
                        globalConnectionState.mqttClient = client;
                    } catch (error) {
                        console.error("Failed to setup MQTT:", error);
                    }
                } else {
                    setupDatabaseMode(setData, setChartData, chartRef);
                }
                
                globalConnectionState.mode = mode;
            }
        };

        handleModeChange();
    }, [mode, isAutoScrolling]);

    // Memoize scroll and zoom functions
    const scrollChart = useCallback((direction) => {
        if (!chartRef.current) return;

        const chart = chartRef.current;
        const currentMin = chart.scales.x.min;
        const currentMax = chart.scales.x.max;
        const timeRange = currentMax - currentMin;

        const scrollAmount = timeRange * 0.25;

        if (direction === "left") {
            chart.options.scales.x.min = new Date(currentMin - scrollAmount);
            chart.options.scales.x.max = new Date(currentMax - scrollAmount);
        } else {
            chart.options.scales.x.min = new Date(currentMin + scrollAmount);
            chart.options.scales.x.max = new Date(currentMax + scrollAmount);
        }

        setIsAutoScrolling(false);
        chart.update();
    }, []);

    const zoomChart = useCallback((direction) => {
        if (!chartRef.current) return;

        const chart = chartRef.current;
        const currentMin =
            typeof chart.scales.x.min === "object" ? chart.scales.x.min.getTime() : chart.scales.x.min;
        const currentMax =
            typeof chart.scales.x.max === "object" ? chart.scales.x.max.getTime() : chart.scales.x.max;

        const timeRange = currentMax - currentMin;

        const zoomFactor = direction === "in" ? 0.7 : 1.3;
        const newTimeRange = timeRange * zoomFactor;

        const centerTime = currentMin + timeRange / 2;

        const newMin = new Date(centerTime - newTimeRange / 2);
        const newMax = new Date(centerTime + newTimeRange / 2);

        chart.options.scales.x.min = newMin;
        chart.options.scales.x.max = newMax;

        setIsAutoScrolling(false);
        chart.update();
    }, []);

    // Memoize chart options
    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // Disable animations to prevent issues during re-renders
        elements: {
            line: { tension: 0.4 },
            point: {
                radius: (context) => {
                    const datasetIndex = context.datasetIndex;
                    const dataIndex = context.dataIndex;
                    const dataset = context.chart.data.datasets[datasetIndex];
                    return dataIndex === dataset.data.length - 1 ? 6 : 3;
                },
                hoverRadius: 6,
            },
        },
        plugins: {
            legend: {
                display: true,
                position: "bottom",
                align: "center",
                labels: {
                    font: { size: 16, weight: "bold" },
                    padding: 20,
                    boxWidth: 20,
                    boxHeight: 20,
                    color: getTextColor(),
                    usePointStyle: true,
                    pointStyle: 'circle',
                },
            },
            tooltip: {
                mode: "index",
                intersect: false,
                backgroundColor: "rgba(0,0,0,0.7)",
                titleColor: "#fff",
                bodyColor: "#ddd",
                titleFont: { size: 16, weight: "bold" },
                bodyFont: { size: 14 },
                padding: 12,
            },
            datalabels: {
                display: (context) => context.dataIndex === context.dataset.data.length - 1,
                align: "top",
                offset: 15,
                color: (context) => context.dataset.borderColor,
                font: { weight: "bold", size: 28 },
                formatter: (value) => (value !== null ? value : ""),
                backgroundColor: isDark 
                    ? 'rgba(45, 45, 45, 0.9)' 
                    : 'rgba(255, 255, 255, 0.9)',
                borderWidth: 2,
                borderColor: (context) => context.dataset.borderColor,
                borderRadius: 6,
                padding: 8,
            },
            zoom: {
                pan: {
                    enabled: true,
                    mode: "x",
                    speed: 10,
                    threshold: 10,
                    onPan: () => setIsAutoScrolling(false),
                },
                zoom: {
                    enabled: true,
                    mode: "x",
                    sensitivity: 0.1,
                    limits: { min: 1, max: MAX_STORAGE_MINUTES },
                    onZoom: () => setIsAutoScrolling(false),
                },
            },
        },
        scales: {
            y: {
                min: 0,
                max: 160,
                ticks: {
                    stepSize: 20,
                    color: getTextColor(),
                    font: { size: 14, weight: "bold" },
                },
                grid: { 
                    display: false,
                },
            },
            x: {
                type: "time",
                time: {
                    unit: "minute",
                    displayFormats: { minute: "HH:mm", hour: "HH:mm" },
                    tooltipFormat: "HH:mm:ss",
                },
                min: new Date(new Date().getTime() - DISPLAY_WINDOW_MINUTES * 60000),
                max: new Date(new Date().getTime() + RIGHT_MARGIN_MINUTES * 60000),
                ticks: {
                    autoSkip: true,
                    maxRotation: 90,
                    minRotation: 30,
                    color: getTextColor(),
                    font: { size: 14, weight: "bold" },
                },
                grid: { 
                    display: false,
                },
            },
        },
    }), [getTextColor, isDark]);

    // Update chart colors when theme changes
    useEffect(() => {
        const updateChartTheme = () => {
            const newIsDark = document.body.classList.contains('dark');
            setIsDark(newIsDark);
            
            if (!chartRef.current) return;
            
            const textColor = newIsDark ? '#e0e0e0' : '#555555';
            
            // Update legend colors
            chartRef.current.options.plugins.legend.labels.color = textColor;
            
            // Update axis colors
            chartRef.current.options.scales.x.ticks.color = textColor;
            chartRef.current.options.scales.y.ticks.color = textColor;
            
            // Update datalabel background
            chartRef.current.options.plugins.datalabels.backgroundColor = 
                newIsDark ? 'rgba(45, 45, 45, 0.9)' : 'rgba(255, 255, 255, 0.9)';
                
            chartRef.current.update();
        };
        
        // Create observer to watch for class changes on body
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    updateChartTheme();
                }
            });
        });
        
        // Start observing
        observer.observe(document.body, { attributes: true });
        
        // Call once to set initial colors
        updateChartTheme();
        
        return () => {
            observer.disconnect();
        };
    }, []);

    return (
        <div className="dashboard-container">
            <div className="cards-container">
                {Object.keys(data).map((key) => (
                    <div className="card" key={key}>
                        <div className="card-value">
                            {data[key] !== null ? data[key] : "-"} 
                            <span className="card-unit">{UNIT_MAPPINGS[key]}</span>
                        </div>
                        <div className="card-title">{key.toUpperCase()}</div>
                    </div>
                ))}
            </div>

            <div className="chart-container">
                <div className="chart-controls">
                    <button
                        className="toggle-mode"
                        onClick={() => setMode(mode === "mqtt" ? "database" : "mqtt")}
                    >
                        {mode === "mqtt" ? "Low Latency Mode" : "Normal Mode"}
                    </button>
                    <div className="chart-navigation">
                        <button
                            className="nav-button"
                            onClick={() => scrollChart("left")}
                            title="Scroll Left"
                        >
                            <i className="fas fa-chevron-left"></i>
                        </button>
                        <button
                            className="nav-button"
                            onClick={() => scrollChart("right")}
                            title="Scroll Right"
                        >
                            <i className="fas fa-chevron-right"></i>
                        </button>
                        <button className="nav-button" onClick={() => zoomChart("in")} title="Zoom In">
                            <i className="fas fa-search-plus"></i>
                        </button>
                        <button className="nav-button" onClick={() => zoomChart("out")} title="Zoom Out">
                            <i className="fas fa-search-minus"></i>
                        </button>
                        <button
                            className={`nav-button ${isAutoScrolling ? "active" : ""}`}
                            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                            title={isAutoScrolling ? "Auto-scroll On" : "Auto-scroll Off"}
                        >
                            <i className="fas fa-play"></i>
                        </button>
                    </div>
                </div>

                <Line
                    ref={chartRef}
                    data={chartData}
                    options={chartOptions}
                />
            </div>
        </div>
    );
});

// Add display name for debugging
Dashboard.displayName = 'Dashboard';

export default Dashboard;