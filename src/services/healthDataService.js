// healthDataService.js
export const fetchHealthData = async (deviceId, token, minutes = 5) => {
    const endDate = new Date("2025-07-12T19:00:52.173Z");// new Date();
    const startDate = new Date("2025-07-12T23:59:52.173Z");//new Date(endDate.getTime() - minutes * 60 * 1000);
    deviceId = 2;
    const url = `https://admin.dozemate.com/api/data/health/${deviceId}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;


    console.log("HealthData fetch URL:", url);

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error("Failed to fetch health data");
    }

    return await response.json(); // returns array
};
