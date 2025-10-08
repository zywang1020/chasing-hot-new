// script.js (最終整合版：最鄰近分析 + 鋪面溫度計算)

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

// --- 2. 地理定位 ---
async function geolocationSuccess(position) {
    const { latitude, longitude } = position.coords;
    statusMessage.textContent = `位置獲取成功 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})。`;
    
    try {
        // 步驟一：找到最近氣象站的精確經緯度
        statusMessage.textContent = '正在尋找最近的氣象站...';
        const nearestStationCoords = await findNearestStationCoords(latitude, longitude);

        // 步驟二：用該站經緯度取得天氣「預報」資料
        statusMessage.textContent = `找到氣象站：${nearestStationCoords.name}。正在擷取預報資料...`;
        const weatherData = await fetchForecastData(nearestStationCoords.lat, nearestStationCoords.lon);

        // 步驟三：代入公式計算鋪面溫度
        statusMessage.textContent = '預報獲取完畢，正在計算表面溫度...';
        const surfaceTemperatures = calculateSurfaceTemperatures(nearestStationCoords.lat, weatherData.maxT, weatherData.minT);
        
        displayResults(surfaceTemperatures, nearestStationCoords.name);
        statusMessage.textContent = `計算完成！(基於 ${nearestStationCoords.name} 預報)`;

    } catch (error) {
        statusMessage.textContent = `錯誤：${error.message}`;
    } finally {
        loader.classList.add('hidden');
    }
}

function geolocationError(error) {
    statusMessage.textContent = `無法獲取您的位置：${error.message}`;
    loader.classList.add('hidden');
}

// --- 3A. 新功能：找到最近的氣象站「經緯度」 ---
async function findNearestStationCoords(userLat, userLon) {
    const CWA_API_KEY = 'CWA-234F005B-7959-436C-A0FF-BD4225C0E339';
    const API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${CWA_API_KEY}`;
    
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('無法從氣象署獲取站點列表。');
    const data = await response.json();

    if (!data.records || !data.records.Station || data.records.Station.length === 0) {
        throw new Error('無法取得氣象站列表資料。');
    }
    
    let closestStation = null;
    let minDistance = Infinity;

    data.records.Station.forEach(station => {
        const stationLon = parseFloat(station.GeoInfo.Coordinates[0].StationLongitude);
        const stationLat = parseFloat(station.GeoInfo.Coordinates[0].StationLatitude);
        const distance = getDistance(userLat, userLon, stationLat, stationLon);
        if (distance
