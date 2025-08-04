// Database mode for fetching historical data and continuous polling

export const setupDatabaseMode = (setData, setChartData, chartRef, isAutoScrolling = true) => {
  console.log("Database mode selected - setting up continuous polling");
  
  const POLL_INTERVAL = 6000; // 6 seconds
  const DISPLAY_WINDOW_MINUTES = 30;
  const RIGHT_MARGIN_MINUTES = 2;
  
  // Function to get active device ID
  const getActiveDeviceId = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        return null;
      }

      const userResponse = await fetch("https://admin.dozemate.com/api/devices/user", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        console.error("Failed to fetch user devices");
        return null;
      }

      const userData = await userResponse.json();
      
      // Handle different response structures
      let deviceId = null;
      
      if (userData.activeDevice) {
        // If activeDevice is an object with deviceId
        if (typeof userData.activeDevice === 'object' && userData.activeDevice.deviceId) {
          deviceId = userData.activeDevice.deviceId;
        }
        // If activeDevice is an ID, find matching device
        else {
          const activeDevice = userData.devices?.find(d => d._id === userData.activeDevice);
          if (activeDevice) deviceId = activeDevice.deviceId;
        }
      }
      
      // Fallback to first device if no active device
      if (!deviceId && userData.devices && userData.devices.length > 0) {
        deviceId = userData.devices[0].deviceId;
      }
      
      console.log("Active device ID for polling:", deviceId);
      return deviceId;
    } catch (error) {
      console.error("Error getting active device:", error);
      return null;
    }
  };

  // Function to fetch latest data
  const fetchLatestData = async (deviceId) => {
    if (!deviceId) return null;
    
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;

      // Get last 5 minutes of data (to have some new points)
      const endDate = new Date();
      const startDate = new Date(endDate - 5 * 60 * 1000); // 5 minutes ago
      
      console.log(`Polling data for device ${deviceId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      const healthResponse = await fetch(
        `https://admin.dozemate.com/api/data/health/${deviceId}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log(`Received ${healthData.length} data points from server`);
        return healthData;
      } else {
        console.error("Failed to fetch health data:", await healthResponse.text());
        return null;
      }
    } catch (error) {
      console.error("Error fetching latest data:", error);
      return null;
    }
  };
  
// Function to process and update data
const processAndUpdateData = (healthData) => {
  if (!healthData || healthData.length === 0) return;
  
  // Update sensor values with the most recent data
  const latestData = healthData[0]; // First item is newest due to sort order
  setData(prevData => ({
    temp: latestData.temperature ?? prevData.temp,
    humidity: latestData.humidity ?? prevData.humidity,
    iaq: latestData.iaq ?? prevData.iaq,
    eco2: latestData.eco2 ?? prevData.eco2,
    tvoc: latestData.tvoc ?? prevData.tvoc,
    etoh: latestData.etoh ?? prevData.etoh,
    hrv: latestData.hrv ?? prevData.hrv,
    stress: latestData.stress ?? prevData.stress
  }));
  
  // Update chart data - handle properly to avoid duplicates
  setChartData(prevChartData => {
    // Get existing timestamps for comparison - convert strings to Date objects if needed
    const existingTimestamps = new Set(
      prevChartData.labels.map(dateLabel => {
        // Handle both Date objects and ISO string dates
        if (dateLabel instanceof Date) {
          return dateLabel.getTime();
        } else if (typeof dateLabel === 'string') {
          return new Date(dateLabel).getTime();
        } else {
          // If it's already a timestamp or something else
          return dateLabel;
        }
      })
    );
    
    // Filter new data points that don't exist in the chart yet
    const newDataPoints = healthData.filter(item => 
      !existingTimestamps.has(new Date(item.timestamp).getTime())
    );
    
    // Rest of your function remains the same...
      
      if (newDataPoints.length === 0) {
        console.log("No new data points to add to chart");
        return prevChartData;
      }
      
      console.log(`Adding ${newDataPoints.length} new data points to chart`);
      
      // Add new labels and data points
      let updatedLabels = [...prevChartData.labels];
      let updatedRespData = [...prevChartData.datasets[0].data];
      let updatedHeartData = [...prevChartData.datasets[1].data];
      
      // Process data in reverse to maintain chronological order
      newDataPoints.reverse().forEach(point => {
        const timestamp = new Date(point.timestamp);
        
        // Insert the new point in the correct chronological position
        let inserted = false;
        for (let i = 0; i < updatedLabels.length; i++) {
          if (timestamp < updatedLabels[i]) {
            updatedLabels.splice(i, 0, timestamp);
            updatedRespData.splice(i, 0, point.respiration);
            updatedHeartData.splice(i, 0, point.heartRate);
            inserted = true;
            break;
          }
        }
        
        // If not inserted, add to the end (it's newer than all existing points)
        if (!inserted) {
          updatedLabels.push(timestamp);
          updatedRespData.push(point.respiration);
          updatedHeartData.push(point.heartRate);
        }
      });
      
      // Limit data length to prevent performance issues (keep last 24 hours max)
      const MAX_DATA_POINTS = 1440; // 24 hours × 60 minutes
      if (updatedLabels.length > MAX_DATA_POINTS) {
        updatedLabels = updatedLabels.slice(-MAX_DATA_POINTS);
        updatedRespData = updatedRespData.slice(-MAX_DATA_POINTS);
        updatedHeartData = updatedHeartData.slice(-MAX_DATA_POINTS);
      }
      
      // Update chart
      const updatedChartData = {
        labels: updatedLabels,
        datasets: [
          {
            ...prevChartData.datasets[0],
            data: updatedRespData,
          },
          {
            ...prevChartData.datasets[1],
            data: updatedHeartData,
          }
        ]
      };
      
      // Update chart view for auto-scrolling
      if (isAutoScrolling && chartRef.current && updatedLabels.length > 0) {
        const chart = chartRef.current;
        const visibleRange = DISPLAY_WINDOW_MINUTES * 60 * 1000;
        const latestTime = updatedLabels[updatedLabels.length - 1].getTime();
        
        chart.options.scales.x.min = new Date(latestTime - visibleRange);
        chart.options.scales.x.max = new Date(latestTime + (RIGHT_MARGIN_MINUTES * 60 * 1000));
        chart.update('none'); // Update without animation for smoother scrolling
      }
      
      return updatedChartData;
    });
  };

  // Initial fetch and continuous polling setup
  const setupPolling = async () => {
    // Get initial device ID
    const deviceId = await getActiveDeviceId();
    if (!deviceId) {
      console.error("No device ID available for database mode");
      return null;
    }
    
    // Do initial fetch for historical data (last 24 hours)
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const endDate = new Date();
      const startDate = new Date(endDate - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const initialResponse = await fetch(
        `https://admin.dozemate.com/api/data/health/${deviceId}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (initialResponse.ok) {
        const initialData = await initialResponse.json();
        console.log(`Loaded initial ${initialData.length} data points`);
        processAndUpdateData(initialData);
      }
    } catch (error) {
      console.error("Error fetching initial historical data:", error);
    }
    
    // Set up polling interval
    console.log(`Starting database polling with ${POLL_INTERVAL}ms interval`);
    const intervalId = setInterval(async () => {
      try {
        const currentDeviceId = await getActiveDeviceId();
        if (!currentDeviceId) return;
        
        const latestData = await fetchLatestData(currentDeviceId);
        if (latestData) {
          processAndUpdateData(latestData);
        }
      } catch (error) {
        console.error("Error during polling:", error);
      }
    }, POLL_INTERVAL);
    
    // Return cleanup function
    return () => {
      console.log("Cleaning up database polling");
      clearInterval(intervalId);
    };
  };
  
  // Start polling and return the cleanup function
  return setupPolling();
};

export default setupDatabaseMode;