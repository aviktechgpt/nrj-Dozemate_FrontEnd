import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import "chartjs-adapter-date-fns";
import zoomPlugin from "chartjs-plugin-zoom";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { setupMqttMode } from "../../services/mqttMode";
import { setupDatabaseMode } from "../../services/databaseMode";
import { disconnectMQTT } from "../../mqtt/mqtt";
import "./Dashboard.css";
import ParameterChart from "../../components/ParameterChart";
import { fetchHealthData } from "../../services/healthDataService";

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


    const [labels, setLabels] = useState([]);
    const [heartRate, setHeartRate] = useState([]);
    const [respiration, setRespiration] = useState([]);
    const [temperature, setTemperature] = useState([]);
    const [humidity, setHumidity] = useState([]);
    const [iaq, setIaq] = useState([]);
    const [eco2, setEco2] = useState([]);
    const [tvoc, setTvoc] = useState([]);
    const [etoh, setEtoh] = useState([]);
    const [hrv, setHrv] = useState([]);
    const [stress, setStress] = useState([]);


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

    const loadLiveChartData = async () => {
        const token = localStorage.getItem("token");
        const deviceId = "2"; // Replace with dynamic ID if needed

        const now = new Date();
        const dummyData = Array.from({ length: 10 }, (_, i) => {
            const timestamp = new Date(now.getTime() - (9 - i) * 3 * 60 * 1000);
            return {
                timestamp: timestamp.toISOString(),
                heartRate: 60 + Math.floor(Math.random() * 40),
                respiration: 12 + Math.floor(Math.random() * 8),
                temperature: 97 + Math.random() * 2,
                eco2: 400 + Math.floor(Math.random() * 200),
                humidity: 30 + Math.floor(Math.random() * 30),
                iaq: 50 + Math.floor(Math.random() * 100),
                tvoc: parseFloat((0.1 + Math.random() * 0.3).toFixed(2)),
                etoh: parseFloat((0.05 + Math.random() * 0.1).toFixed(2)),
                hrv: 50 + Math.floor(Math.random() * 20),
                stress: 10 + Math.floor(Math.random() * 10),
            };
        });

        try {
            const newLabels = dummyData.map(item => new Date(item.timestamp));
            const newHeartRate = dummyData.map(item => item.heartRate);
            const newRespiration = dummyData.map(item => item.respiration);
            const newTemperature = dummyData.map(item => item.temperature);
            const newHumidity = dummyData.map(item => item.humidity);
            const newIaq = dummyData.map(item => item.iaq);
            const newEco2 = dummyData.map(item => item.eco2);
            const newTvoc = dummyData.map(item => item.tvoc);
            const newEtoh = dummyData.map(item => item.etoh);
            const newHrv = dummyData.map(item => item.hrv);
            const newStress = dummyData.map(item => item.stress);

            // Update all states
            setLabels(newLabels);
            setHeartRate(newHeartRate);
            setRespiration(newRespiration);
            setTemperature(newTemperature);
            setHumidity(newHumidity);
            setIaq(newIaq);
            setEco2(newEco2);
            setTvoc(newTvoc);
            setEtoh(newEtoh);
            setHrv(newHrv);
            setStress(newStress);

            // Set the chart data using local variables
            setChartData({
                labels: newLabels,
                datasets: [
                    {
                        label: "Respiration",
                        data: newRespiration,
                        borderColor: "rgba(54, 162, 235, 1)",
                        backgroundColor: "rgba(54, 162, 235, 0.2)",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        borderWidth: 3,
                    },
                    {
                        label: "Heart Rate",
                        data: newHeartRate,
                        borderColor: "rgba(255, 99, 132, 1)",
                        backgroundColor: "rgba(255, 99, 132, 0.2)",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        borderWidth: 3,
                    },
                    {
                        label: "Temperature",
                        data: newTemperature,
                        borderColor: "rgba(255, 165, 0, 1)",
                        backgroundColor: "rgba(255, 165, 0, 0.2)",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        borderWidth: 3,
                    },
                ],
            });

        } catch (error) {
            console.error("Live chart data fetch failed:", error);
        }
    };


    const COLOR_CLASSES = {
        temp: 'rose-pink',
        humidity: 'light-apricot',
        iaq: 'soft-yellow',
        eco2: 'cool-mint',
        tvoc: 'sky-mist',
        etoh: 'lavender-fog',
        hrv: 'light-steel',
        stress: 'coral-peach',
    };

    const UNIT_MAPPINGS = {
        temp: "°C",
        humidity: "%",
        iaq: "",
        eco2: "ppm",
        tvoc: "ppb",
        etoh: "ppb",
        hrv: "ms",
        stress: "",
    };


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

    useEffect(() => {
        loadLiveChartData();
        const interval = setInterval(loadLiveChartData, 6000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="dashboard-container">
            <div className="dashboard-wrapper">
                <div className="metrics-table">
                    <div className="metric-cell eco2">
                        <div className="label">EcO2 (ppm)</div>
                        <div className="value">{data.eco2 !== null ? data.eco2 : "-"}</div>
                    </div>

                    <div className="metric-cell humidity">
                        <div className="label">Humidity (%)</div>
                        <div className="value">{data.humidity !== null ? data.humidity : "-"}</div>
                    </div>

                    <div className="metric-cell temp">
                        <div className="label">Temperature (°C)</div>
                        <div className="value">{data.temp !== null ? data.temp.toFixed(2) : "-"}</div>
                    </div>

                    <div className="metric-cell iaq">
                        <div className="label">IAQ</div>
                        <div className="value">{data.iaq !== null ? data.iaq : "-"}</div>
                    </div>

                    <div className="metric-cell tvoc">
                        <div className="label">TVOC (ppb)</div>
                        <div className="value">{data.tvoc !== null ? data.tvoc.toFixed(2) : "-"}</div>
                    </div>

                    <div className="metric-cell etoh">
                        <div className="label">EtOH (ppb)</div>
                        <div className="value">{data.etoh !== null ? data.etoh.toFixed(2) : "-"}</div>
                    </div>

                    <div className="metric-cell hrv">
                        <div className="label">HRV (ms)</div>
                        <div className="value">{data.hrv !== null ? data.hrv : "-"}</div>
                    </div>

                    <div className="metric-cell stress">
                        <div className="label">Stress</div>
                        <div className="value">{data.stress !== null ? data.stress : "-"}</div>
                    </div>

                    <div className="metric-cell respiration">
                        <div className="label">Respiration (rpm)</div>
                        <div className="value">{respiration.length ? respiration.at(-1) : "-"}</div>
                    </div>

                    <div className="metric-cell heart">
                        <div className="label">Heart Rate (bpm)</div>
                        <div className="value">{heartRate.length ? heartRate.at(-1) : "-"}</div>
                    </div>
                </div>

            </div>
            <div className="param-chart-grid">
                <ParameterChart title="Heart Rate" unit="bpm" labels={labels} dataPoints={heartRate} min={40} max={120} borderColor="rgba(255, 99, 132, 1)" backgroundColor="rgba(255, 99, 132, 0.1)" />

                <ParameterChart title="Respiration Rate" unit="rpm" labels={labels} dataPoints={respiration} min={10} max={60} borderColor="rgba(54, 162, 235, 1)" backgroundColor="rgba(54, 162, 235, 0.1)" />

                <ParameterChart title="Temperature" unit="°F" labels={labels} dataPoints={temperature} min={95} max={105} borderColor="rgba(255, 165, 0, 1)" backgroundColor="rgba(255, 165, 0, 0.1)" />

                <ParameterChart title="Humidity" unit="%" labels={labels} dataPoints={humidity} min={20} max={100} borderColor="rgba(75, 192, 192, 1)" backgroundColor="rgba(75, 192, 192, 0.1)" />

                <ParameterChart title="IAQ" unit="" labels={labels} dataPoints={iaq} min={0} max={500} borderColor="rgba(153, 102, 255, 1)" backgroundColor="rgba(153, 102, 255, 0.1)" />

                <ParameterChart title="eCO2" unit="ppm" labels={labels} dataPoints={eco2} min={350} max={1000} borderColor="rgba(0, 128, 0, 1)" backgroundColor="rgba(0, 128, 0, 0.1)" />

                <ParameterChart title="TVOC" unit="ppb" labels={labels} dataPoints={tvoc} min={0} max={1} borderColor="rgba(255, 206, 86, 1)" backgroundColor="rgba(255, 206, 86, 0.1)" />

                <ParameterChart title="EtOH" unit="ppb" labels={labels} dataPoints={etoh} min={0} max={1} borderColor="rgba(255, 159, 64, 1)" backgroundColor="rgba(255, 159, 64, 0.1)" />

                <ParameterChart title="HRV" unit="ms" labels={labels} dataPoints={hrv} min={40} max={100} borderColor="rgba(54, 162, 100, 1)" backgroundColor="rgba(54, 162, 100, 0.1)" />

                <ParameterChart title="Stress" unit="" labels={labels} dataPoints={stress} min={0} max={100} borderColor="rgba(199, 21, 133, 1)" backgroundColor="rgba(199, 21, 133, 0.1)" />
            </div>
        </div>
    );
});

// Add display name for debugging
Dashboard.displayName = 'Dashboard';

export default Dashboard;