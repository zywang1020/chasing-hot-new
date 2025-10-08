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

    if (!data.records || !data.records.locations || data.records.locations.length === 0 || !data.records.locations[0].location || data.records.locations[0].location
