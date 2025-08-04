import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart } from 'chart.js';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useContext } from 'react';
import { MyContext } from '../App';

import useMediaQuery from '@mui/material/useMediaQuery';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import TimelineIcon from '@mui/icons-material/Timeline';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FilterListIcon from '@mui/icons-material/FilterList';
import DateRangeIcon from '@mui/icons-material/DateRange';

import {
  Container,
  Paper,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  CircularProgress,
  Box,
  Alert,
  Card,
  CardContent,
  Divider,
  Fade
} from '@mui/material';
import './History.css';

import ChartDataLabels from 'chartjs-plugin-datalabels';
Chart.unregister(ChartDataLabels);

// Define colors and labels for each metric
const metricConfig = {
  temp: { 
    color: 'rgba(255, 99, 132, 1)', 
    bgColor: 'rgba(255, 99, 132, 0.2)', 
    label: 'Temperature',
    unit: '°C'
  },
  humidity: { 
    color: 'rgba(54, 162, 235, 1)', 
    bgColor: 'rgba(54, 162, 235, 0.2)', 
    label: 'Humidity',
    unit: '%'
  },
  iaq: { 
    color: 'rgba(255, 206, 86, 1)', 
    bgColor: 'rgba(255, 206, 86, 0.2)', 
    label: 'IAQ',
    unit: ''
  },
  eco2: { 
    color: 'rgba(75, 192, 192, 1)', 
    bgColor: 'rgba(75, 192, 192, 0.2)', 
    label: 'ECO2',
    unit: 'ppm'
  },
  tvoc: { 
    color: 'rgba(153, 102, 255, 1)', 
    bgColor: 'rgba(153, 102, 255, 0.2)', 
    label: 'TVOC',
    unit: 'ppb'
  },
  etoh: { 
    color: 'rgba(255, 159, 64, 1)', 
    bgColor: 'rgba(255, 159, 64, 0.2)', 
    label: 'ETOH',
    unit: 'ppb'
  },
  hrv: { 
    color: 'rgba(199, 0, 57, 1)', 
    bgColor: 'rgba(199, 0, 57, 0.2)', 
    label: 'HRV',
    unit: 'ms'
  },
  stress: { 
    color: 'rgba(144, 12, 63, 1)', 
    bgColor: 'rgba(144, 12, 63, 0.2)', 
    label: 'Stress',
    unit: ''
  },
  hr: { 
    color: 'rgba(88, 24, 69, 1)', 
    bgColor: 'rgba(88, 24, 69, 0.2)', 
    label: 'Heart Rate',
    unit: 'bpm'
  },
  resp: { 
    color: 'rgba(0, 128, 128, 1)', 
    bgColor: 'rgba(0, 128, 128, 0.2)', 
    label: 'Respiration',
    unit: 'bpm'
  }
};

// Calculate better Y-axis bounds for chart display
const calculateYAxisBounds = (values) => {
  const validValues = values.filter(v => v !== null && v !== undefined);
  if (validValues.length === 0) return { paddedMin: 0, paddedMax: 100 };
  
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const range = max - min;
  
  // Determine if values are mostly integers or decimals
  const isMainlyInteger = validValues.every(v => Math.abs(v - Math.round(v)) < 0.01);
  
  // Calculate better padding
  let paddedMin, paddedMax;
  
  if (isMainlyInteger) {
    // For integer-like values
    if (range < 10) {
      // Very small range, add fixed padding of 5
      paddedMin = Math.max(0, Math.floor(min) - 5);
      paddedMax = Math.ceil(max) + 5;
    } else if (range < 50) {
      // Medium range, add fixed padding of 10
      paddedMin = Math.max(0, Math.floor(min) - 10);
      paddedMax = Math.ceil(max) + 10;
    } else {
      // Large range, use percentage (15%)
      paddedMin = Math.max(0, min - range * 0.15);
      paddedMax = max + range * 0.15;
    }
  } else {
    // For decimal values
    if (range < 0.1) {
      // Very small decimal range
      paddedMin = Math.max(0, min - 0.05);
      paddedMax = max + 0.05;
    } else if (range < 1) {
      // Medium decimal range
      paddedMin = Math.max(0, min - 0.2);
      paddedMax = max + 0.2;
    } else {
      // Larger decimal range
      paddedMin = Math.max(0, min - range * 0.15);
      paddedMax = max + range * 0.15;
    }
  }
  
  return { paddedMin, paddedMax, min, max };
};

// Individual MetricChart component
const MetricChart = ({ metric, data, timePeriod, onExpandChart }) => {
  const context = useContext(MyContext);
  const isDarkMode = context?.themeMode === 'dark';
  if (!data || data.length === 0) return null;
  
  // Get correct values for this metric
  const getMetricValue = (item, metricKey) => {
    switch(metricKey) {
      case 'hr':
        return item.heartRate !== undefined ? item.heartRate : item.hr;
      case 'resp':
        return item.respiration !== undefined ? item.respiration : (item.respiratoryRate !== undefined ? item.respiratoryRate : item.resp);
      case 'hrv':
        return item.hrv;
      case 'stress':
        return item.stress;
      default:
        return item[metricKey];
    }
  };
  
  // Extract data for this metric
  const values = data.map(item => getMetricValue(item, metric));
  const timestamps = data.map(item => new Date(item.timestamp));
  
  // Calculate min/max for custom scaling with padding
  const validValues = values.filter(v => v !== null && v !== undefined);
  
  // Handle empty data case
  if (validValues.length === 0) {
    return (
      <Card 
        className={isDarkMode ? "metric-card dark" : "metric-card"}
        elevation={3}
        onClick={() => onExpandChart(metric)}
      >
        <CardContent>
          <Typography variant="h6" className="metric-title" style={{ color: metricConfig[metric].color }}>
            {metricConfig[metric].label}
          </Typography>
          <Divider className="card-divider" />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <Typography variant="body2" color="text.secondary" className="metric-stat">
    Min: {min !== Infinity ? min.toFixed(2) : 'N/A'} {metricConfig[metric].unit}
  </Typography>
  <IconButton 
    size="small" 
    className="fullscreen-button"
    onClick={(e) => {
      e.stopPropagation();
      onExpandChart(metric);
    }}
  >
    <FullscreenIcon fontSize="small" />
  </IconButton>
  <Typography variant="body2" color="text.secondary" className="metric-stat">
    Max: {max !== -Infinity ? max.toFixed(2) : 'N/A'} {metricConfig[metric].unit}
  </Typography>
</Box>
        </CardContent>
      </Card>
    );
  }
  
  // Use the improved Y-axis bounds calculation
  const { paddedMin, paddedMax, min, max } = calculateYAxisBounds(validValues);
  
  // Configure chart data
  const chartData = {
    labels: timestamps,
    datasets: [{
      label: metricConfig[metric].label,
      data: values,
      borderColor: metricConfig[metric].color,
      backgroundColor: metricConfig[metric].bgColor,
      fill: true,
      tension: 0.1, // Lower tension for sharper lines
      pointRadius: 0,
      pointHoverRadius: 6,
      borderWidth: 2
    }]
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
    display: false
  },
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const value = context.raw !== null ? context.raw.toFixed(2) : 'No data';
            return `${metricConfig[metric].label}: ${value} ${metricConfig[metric].unit}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timePeriod === '24h' ? 'hour' : timePeriod === '7d' || timePeriod === '30d' ? 'day' : 'hour',
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM d'
          },
          tooltipFormat: 'MMM d, yyyy HH:mm'
        },
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
          color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)'
        },
        // Focus on most recent data in grid view
        min: timestamps.length > 0 ? 
          (timePeriod === '24h' ? 
            new Date(Math.max(timestamps[timestamps.length - 1].getTime() - 24 * 60 * 60 * 1000, timestamps[0].getTime())) : 
            timestamps[0]) : undefined,
        max: timestamps.length > 0 ? 
          new Date(timestamps[timestamps.length - 1].getTime() + 60 * 60 * 1000) : undefined // Add 1 hour buffer to show latest data
      },
      y: {
        min: paddedMin,
        max: paddedMax,
        grid: {
          display: false // Remove gridlines
        },
        ticks: {
          maxTicksLimit: 5,
          color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)',
          callback: function(value) {
            // Round to integer for cleaner display
            const roundedValue = Math.round(value);
            return roundedValue + (metricConfig[metric].unit ? ' ' + metricConfig[metric].unit : '');
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2
      }
    },
    animation: {
      duration: 1000
    }
  };
  
  return (
    <Card 
      className={isDarkMode ? "metric-card dark" : "metric-card"}
      elevation={3}
      onClick={() => onExpandChart(metric)}
    >
      <CardContent>
        <Typography variant="h6" className="metric-title" style={{ color: metricConfig[metric].color }}>
          {metricConfig[metric].label}
        </Typography>
        <Divider className="card-divider" />
        <div className="chart-container">
          <Line data={chartData} plugins={[]} options={chartOptions} height={200} />
        </div>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Min: {min !== Infinity ? min.toFixed(2) : 'N/A'} {metricConfig[metric].unit}
          </Typography>
          <IconButton 
            size="small" 
            className="fullscreen-button"
            onClick={(e) => {
              e.stopPropagation();
              onExpandChart(metric);
            }}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            Max: {max !== -Infinity ? max.toFixed(2) : 'N/A'} {metricConfig[metric].unit}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// Create a new component for the expanded chart view
const ExpandedMetricChart = ({ metric, data, timePeriod, isOpen, onClose }) => {
  const context = useContext(MyContext);
  const isDarkMode = context?.themeMode === 'dark';
  if (!isOpen || !metric) return null;

  const getMetricValue = (item, metricKey) => {
    switch(metricKey) {
      case 'hr':
        return item.heartRate !== undefined ? item.heartRate : item.hr;
      case 'resp':
        return item.respiration !== undefined ? item.respiration : (item.respiratoryRate !== undefined ? item.respiratoryRate : item.resp);
      case 'hrv':
        return item.hrv;
      case 'stress':
        return item.stress;
      default:
        return item[metricKey];
    }
  };
  
  const values = data.map(item => getMetricValue(item, metric));
  const timestamps = data.map(item => new Date(item.timestamp));
  
  const validValues = values.filter(v => v !== null && v !== undefined);
  if (validValues.length === 0) return null;
  
  // Use the improved Y-axis bounds calculation
  const { paddedMin, paddedMax, min, max } = calculateYAxisBounds(validValues);
  
  const chartData = {
    labels: timestamps,
    datasets: [{
      label: metricConfig[metric].label,
      data: values,
      borderColor: metricConfig[metric].color,
      backgroundColor: metricConfig[metric].bgColor,
      fill: true,
      tension: 0.1, // Lower tension for sharper lines
      pointRadius: 1,  // Show points in expanded view
      pointHoverRadius: 8,
      borderWidth: 3    // Thicker line for better visibility
    }]
  };
  
  // Enhanced options for the expanded view
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      datalabels: {
    display: false
  },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const value = context.raw !== null ? context.raw.toFixed(2) : 'No data';
            return `${metricConfig[metric].label}: ${value} ${metricConfig[metric].unit}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timePeriod === '24h' ? 'hour' : timePeriod === '7d' || timePeriod === '30d' ? 'day' : 'hour',
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM d'
          },
          tooltipFormat: 'MMM d, yyyy HH:mm'
        },
        grid: {
          display: true,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
          color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)'
        },
        // In expanded view, show full date range
        min: timestamps.length > 0 ? timestamps[0] : undefined,
        max: timestamps.length > 0 ? 
          new Date(timestamps[timestamps.length - 1].getTime() + 60 * 60 * 1000) : undefined // Add buffer to show all data
      },
      y: {
        min: paddedMin,
        max: paddedMax,
        grid: {
          display: true,  // Show gridlines in expanded view
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          maxTicksLimit: 10,  // More ticks for expanded view
          callback: function(value) {
            const roundedValue = Math.round(value);
            return roundedValue + (metricConfig[metric].unit ? ' ' + metricConfig[metric].unit : '');
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 3
      }
    },
    animation: {
      duration: 800
    }
  };

  return (
    <Dialog
  open={isOpen}
  onClose={onClose}
  maxWidth="lg"
  fullWidth
  className={isDarkMode ? 'dark-dialog' : ''}
  PaperProps={{ className: 'dialog-paper' }}
>
  <DialogTitle className="dialog-title" style={{ borderLeft: `4px solid ${metricConfig[metric].color}` }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h6" sx={{ color: metricConfig[metric].color, fontWeight: 600 }}>
        {metricConfig[metric].label} Data
      </Typography>
      <IconButton
        edge="end"
        color="inherit"
        onClick={onClose}
        aria-label="close"
        className="close-button"
      >
        <CloseIcon />
      </IconButton>
    </Box>
  </DialogTitle>
  <DialogContent dividers className="dialog-content">
        <Box className="expanded-chart-container">
          <Line data={chartData} options={chartOptions} />
        </Box>
        
        <Box sx={{ mt: 3 }} className="stats-container">
          <Paper elevation={2} className="stats-paper">
            <Typography variant="body1" className="stats-label">
              Min
            </Typography>
            <Typography variant="h6" className="stats-value" style={{ color: metricConfig[metric].color }}>
              {min.toFixed(2)} {metricConfig[metric].unit}
            </Typography>
          </Paper>
          
          <Paper elevation={2} className="stats-paper">
            <Typography variant="body1" className="stats-label">
              Average
            </Typography>
            <Typography variant="h6" className="stats-value" style={{ color: metricConfig[metric].color }}>
              {(validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(2)} {metricConfig[metric].unit}
            </Typography>
          </Paper>
          
          <Paper elevation={2} className="stats-paper">
            <Typography variant="body1" className="stats-label">
              Max
            </Typography>
            <Typography variant="h6" className="stats-value" style={{ color: metricConfig[metric].color }}>
              {max.toFixed(2)} {metricConfig[metric].unit}
            </Typography>
          </Paper>
        </Box>
        
        <Typography variant="body2" color="text.secondary" className="data-info">
          Showing {validValues.length} data points over {timePeriod === '24h' ? 'last 24 hours' : 
            timePeriod === '48h' ? 'last 2 days' : 
            timePeriod === '72h' ? 'last 3 days' : 
            timePeriod === '7d' ? 'last 7 days' : 'last 30 days'}
        </Typography>
      </DialogContent>
    </Dialog>
  );
};

const History = () => {
  // Get theme mode from context
  const context = useContext(MyContext);
  const isDarkMode = context?.themeMode === 'dark';
  
  // State variables
  const [activeMetrics, setActiveMetrics] = useState({
    temp: true,
    humidity: true,
    iaq: true,
    eco2: false,
    tvoc: false,
    etoh: false,
    hrv: true,
    stress: true,
    hr: true,
    resp: true
  });
  
  const [timePeriod, setTimePeriod] = useState('24h');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  
  // Add state for expanded chart
  const [expandedMetric, setExpandedMetric] = useState(null);
  
  // Add expanded chart handler
  const handleExpandChart = (metric) => {
    console.log("Expanding chart for metric:", metric);
    setExpandedMetric(metric);
  };
  
  // Add handler to close expanded chart
  const handleCloseExpandedChart = () => {
    setExpandedMetric(null);
  };
  
  // Fetch device ID on component mount
  useEffect(() => {
    const getActiveDeviceId = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication token not found");
          setLoading(false);
          return;
        }
        
        const response = await fetch("https://admin.dozemate.com/api/devices/user", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch user devices");
        }
        
        const data = await response.json();
        let id = null;
        
        if (data.activeDevice) {
          // Handle either object or id reference
          if (typeof data.activeDevice === 'object' && data.activeDevice.deviceId) {
            id = data.activeDevice.deviceId;
          } else {
            const device = data.devices.find(d => d._id === data.activeDevice);
            if (device) id = device.deviceId;
          }
        }
        
        // Fallback to first device
        if (!id && data.devices && data.devices.length > 0) {
          id = data.devices[0].deviceId;
        }
        
        if (id) {
          setDeviceId(id);
          fetchHistoryData(id, timePeriod);
        } else {
          setError("No devices found");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching device:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    getActiveDeviceId();
  }, []);
  
  // Fetch history data when time period or device changes
  useEffect(() => {
    if (deviceId) {
      fetchHistoryData(deviceId, timePeriod);
    }
  }, [timePeriod, deviceId]);
  
  // Force charts to update with latest data
  useEffect(() => {
    if (historyData.length > 0) {
      // Sort data by timestamp to ensure proper rendering
      const sortedData = [...historyData].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setHistoryData(sortedData);
    }
  }, []);
  
  // Function to fetch historical data
  const fetchHistoryData = async (deviceId, period) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found");
        setLoading(false);
        return;
      }
      
      const response = await fetch(`https://admin.dozemate.com/api/data/history/${deviceId}?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch historical data");
      }
      
      const result = await response.json();
      
      // Sort data by timestamp to ensure proper rendering
      const sortedData = (result.data || []).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setHistoryData(sortedData);
    } catch (err) {
      console.error("Error fetching history data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle metric toggle
  const handleMetricToggle = (metric) => {
    setActiveMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };
  
  // Handle time period change
  const handleTimePeriodChange = (event) => {
    setTimePeriod(event.target.value);
  };

  return (
    <Container className={isDarkMode ? "history-container dark" : "history-container"} maxWidth="xl">
      <Box className="page-header">
        <Typography variant="h4" component="h1" className="page-title">
          <TimelineIcon className="page-icon" /> 
          Historical Data
        </Typography>
        <Typography variant="subtitle1" className="subtitle">
          View and analyze your health and environmental metrics over time
        </Typography>
      </Box>
      
      <Card elevation={3} className="filter-card">
        <CardContent>
          <Typography variant="h6" className="card-title">
            <FilterListIcon className="card-icon" />
            Data Filters
          </Typography>
          <Divider className="card-divider" />
          
          <Grid container spacing={3} alignItems="center">
            {/* Time period selector */}
            <Grid item xs={12} md={4}>
              <FormControl 
                fullWidth 
                variant="outlined"
                className="time-select"
              >
                <InputLabel>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DateRangeIcon fontSize="small" />
                    Time Period
                  </Box>
                </InputLabel>
                <Select
                  value={timePeriod}
                  onChange={handleTimePeriodChange}
                  label="⏱ Time Period"
                  className={isDarkMode ? 'dark-select' : ''}
                >
                  <MenuItem value="24h">Last 24 Hours</MenuItem>
                  <MenuItem value="48h">Last 2 Days</MenuItem>
                  <MenuItem value="72h">Last 3 Days</MenuItem>
                  <MenuItem value="7d">Last 7 Days</MenuItem>
                  <MenuItem value="30d">Last 30 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Metric toggles */}
            <Grid item xs={12} md={8}>
              <Typography variant="subtitle1" gutterBottom className="metrics-header">
                Select Metrics to Display:
              </Typography>
              <Paper elevation={0} className="metrics-container">
                <FormGroup row className="metrics-group">
                  {Object.keys(metricConfig).map(metric => (
                    <FormControlLabel
                      key={metric}
                      control={
                        <Checkbox
                          checked={activeMetrics[metric]}
                          onChange={() => handleMetricToggle(metric)}
                          style={{ color: metricConfig[metric].color }}
                          className="metric-checkbox"
                        />
                      }
                      label={metricConfig[metric].label}
                      className="metric-label"
                    />
                  ))}
                </FormGroup>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Loading or error states */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }} className="loading-container">
          <CircularProgress className="loading-spinner" />
          <Typography variant="body1" sx={{ mt: 2 }}>Loading your health data...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" className="error-alert" sx={{ my: 3 }}>{error}</Alert>
      ) : historyData.length === 0 ? (
        <Alert severity="info" className="info-alert" sx={{ my: 3 }}>No data available for the selected period</Alert>
      ) : (
        /* Individual metric charts grid */
        <Fade in={!loading}>
          <Grid container spacing={3} className="charts-grid">
            {Object.keys(activeMetrics).map(metric => 
              activeMetrics[metric] ? (
                <Grid item xs={12} md={6} lg={4} key={metric}>
                  <MetricChart 
                    metric={metric} 
                    data={historyData} 
                    timePeriod={timePeriod}
                    onExpandChart={handleExpandChart}
                  />
                </Grid>
              ) : null
            )}
          </Grid>
        </Fade>
      )}
      
      {/* Expanded chart dialog */}
      <ExpandedMetricChart
        metric={expandedMetric}
        data={historyData}
        timePeriod={timePeriod}
        isOpen={expandedMetric !== null}
        onClose={handleCloseExpandedChart}
      />
    </Container>
  );
};

export default History;