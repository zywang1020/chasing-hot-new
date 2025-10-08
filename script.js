// script.js (應用程式主要邏輯 - 簡化版)

// --- 1. 初始化 & 事件監聽 ---
const detectButton = document.getElementById('detect-button');
const statusMessage = document.getElementById('status-message');
const resultsContainer = document.getElementById('results-container');
const loader = document.getElementById('loader');

detectButton.addEventListener('click', () => {
    loader.classList.remove('hidden');
    statusMessage.textContent = '正在獲取您的位置...';
    resultsContainer.classList.add('hidden');
    navigator.geolocation.getCurrentPosition(geolocationSuccess, geolocationError);
});

// --- 2. 地理定位成功後的主要流程 ---
async function geolocationSuccess(position) {
    const { latitude, longitude } = position.coords;
    statusMessage.textContent = `位置獲取成功 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})。`;
    
    try {
        // Plan A: 優先嘗試直接用使用者位置取得預報
        statusMessage.textContent = '正在嘗試直接獲取您的區域預報... (Plan A)';
        const weatherData = await fetchForecastData(latitude, longitude);
        processAndDisplay(latitude, weatherData, "您的區域");

    } catch (error) {
        // Plan B: 如果 Plan A 失敗，啟動備用計畫
        console.warn("Plan A failed:", error.message, "Activating Plan B.");
        statusMessage.textContent = '區域預報獲取失敗，啟動備用計畫... (Plan B)';
        
        try {
            const nearestStation = await findNearestStation(latitude, longitude);
            statusMessage.textContent = `找到氣象站：${nearestStation.name}。正在重新獲取預報...`;
            const weatherDataFromStation = await fetchForecastData(nearestStation.lat, nearestStation.lon);
            processAndDisplay(nearestStation.lat, weatherDataFromStation, nearestStation.name);

        } catch (finalError) {
            statusMessage.textContent = `錯誤：備用計畫也無法取得預報資料。(${finalError.message})`;
        }
    } finally {
        loader.classList.add('hidden');
    }
}

// 獲取位置失敗的處理
function geolocationError(error) {
    statusMessage.textContent = `無法獲取您的位置：${error.message}`;
    loader.classList.add('hidden');
}

// --- 核心功能區 ---

// 功能 A: 用指定經緯度取得「預報」資料
async function fetchForecastData(lat, lon) {
    const CWA_API_KEY = 'CWA-234F005B-7959-436C-A0FF-BD4225C0E339';
    const API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${CWA_API_KEY}&limit=1&format=JSON&geocode=${lon},${lat}`;
    
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('API請求失敗');
    const data = await response.json();

    if (!data.records || !data.records.locations || data.records.locations.length === 0 || !data.records.locations[0].location || data.records.locations[0].location.length === 0) {
        throw new Error('此位置不在鄉鎮預報範圍內');
    }
    
    const tempElements = data.records.locations[0].location[0].weatherElement;
    const maxT = parseFloat(tempElements.find(el => el.elementName === 'MaxT').time[0].elementValue[0].value);
    const minT = parseFloat(tempElements.find(el => el.elementName === 'MinT').time[0].elementValue[0].value);

    if (isNaN(maxT) || isNaN(minT)) throw new Error('預報資料格式不符');
    
    return { maxT, minT };
}

// 功能 B: 找到最近的氣象站
async function findNearestStation(userLat, userLon) {
    const CWA_API_KEY = 'CWA-234F005B-7959-436C-A0FF-BD4225C0E339';
    const API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${CWA_API_KEY}`;
    
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('無法獲取站點列表');
    const data = await response.json();

    if (!data.records || !data.records.Station || data.records.Station.length === 0) {
        throw new Error('無法取得氣象站列表');
    }
    
    let closestStation = null;
    let minDistance = Infinity;

    data.records.Station.forEach(station => {
        const stationLon = parseFloat(station.GeoInfo.Coordinates[0].StationLongitude);
        const stationLat = parseFloat(station.GeoInfo.Coordinates[0].StationLatitude);
        const distance = getDistance(userLat, userLon, stationLat, stationLon);
        if (distance < minDistance) {
            minDistance = distance;
            closestStation = station;
        }
    });

    if (closestStation) {
        return {
            name: closestStation.StationName,
            lat: parseFloat(closestStation.GeoInfo.Coordinates[0].StationLatitude),
            lon: parseFloat(closestStation.GeoInfo.Coordinates[0].StationLongitude)
        };
    } else {
        throw new Error('找不到任何氣象站');
    }
}

// --- 工具區 ---

// 工具 A: 計算距離
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// 工具 B: 處理資料並顯示結果
function processAndDisplay(latitude, weatherData, dataSourceName) {
    // ***注意：這裡現在呼叫的是來自 calculations.js 的函式***
    const surfaceTemperatures = calculateSurfaceTemperatures(latitude, weatherData.maxT, weatherData.minT);
    
    let resultsHTML = `
        <h3>估算表面溫度 (基於 ${dataSourceName} 預報)</h3>
        <ul>
    `;
    surfaceTemperatures.forEach(pavement => {
        resultsHTML += `<li><strong>${pavement.name}：</strong> ${pavement.temperature} °C</li>`;
    });
    resultsHTML += `</ul>`;
    
    resultsContainer.innerHTML = resultsHTML;
    resultsContainer.classList.remove('hidden');
    statusMessage.textContent = `計算完成！(資料來源：${dataSourceName} 預報)`;
}
