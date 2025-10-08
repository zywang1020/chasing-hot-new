// script.js (最鄰近分析最終版)

// --- 1. 初始化 & 事件監聽 ---
const detectButton = document.getElementById('detect-button');
const statusMessage = document.getElementById('status-message');
const resultsContainer = document.getElementById('results-container');

detectButton.addEventListener('click', () => {
    statusMessage.textContent = '正在獲取您的位置...';
    resultsContainer.classList.add('hidden'); // 隱藏舊結果
    navigator.geolocation.getCurrentPosition(geolocationSuccess, geolocationError);
});

// --- 2. 地理定位 ---
async function geolocationSuccess(position) {
    const { latitude, longitude } = position.coords;
    statusMessage.textContent = `位置獲取成功 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})。正在尋找最近的氣象站...`;
    
    try {
        const nearestStationData = await fetchNearestStationData(latitude, longitude);
        displayResults(nearestStationData);
        statusMessage.textContent = `成功找到最近的氣象站！`;

    } catch (error) {
        statusMessage.textContent = `錯誤：${error.message}`;
    }
}

function geolocationError(error) {
    statusMessage.textContent = `無法獲取您的位置：${error.message}`;
}

// --- 3. 核心功能：抓取全台站點資料並找到最近的站點 ---
async function fetchNearestStationData(userLat, userLon) {
    const CWA_API_KEY = 'CWA-234F005B-7959-436C-A0FF-BD4225C0E339';
    // 使用「自動氣象站-觀測資料」API，一次取得所有站點的觀測資料
    const API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${CWA_API_KEY}`;
    
    statusMessage.textContent = '正在下載全台氣象站資料...';
    const response = await fetch(API_URL);
    if (!response.ok) {
        throw new Error('無法從氣象署獲取站點列表。');
    }
    const data = await response.json();

    if (!data.records || !data.records.Station || data.records.Station.length === 0) {
        throw new Error('無法取得氣象站列表資料。');
    }
    
    statusMessage.textContent = '正在進行最鄰近分析...';
    
    let closestStation = null;
    let minDistance = Infinity;

    data.records.Station.forEach(station => {
        const stationLat = parseFloat(station.ObsTime.DateTime);
        const stationLon = parseFloat(station.GeoInfo.Coordinates[0].StationLongitude);
        const stationLat2 = parseFloat(station.GeoInfo.Coordinates[0].StationLatitude);

        const distance = getDistance(userLat, userLon, stationLat2, stationLon);

        if (distance < minDistance) {
            minDistance = distance;
            closestStation = station;
        }
    });

    if (closestStation) {
        return {
            stationName: closestStation.StationName,
            town: closestStation.GeoInfo.TownName,
            distance: minDistance.toFixed(2), // 距離，單位公里
            temperature: closestStation.WeatherElement.AirTemperature,
            humidity: closestStation.WeatherElement.RelativeHumidity
        };
    } else {
        throw new Error('找不到任何氣象站。');
    }
}

// --- 4. 數學工具：計算兩個經緯度之間的距離（哈佛森公式）---
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半徑（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        0.5 - Math.cos(dLat) / 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// --- 5. 顯示結果 ---
function displayResults(data) {
    resultsContainer.innerHTML = `
        <h3>最近的氣象站資料</h3>
        <ul>
            <li><strong>站點名稱：</strong> ${data.stationName} (${data.town})</li>
            <li><strong>與您距離：</strong> 約 ${data.distance} 公里</li>
            <li><strong>目前氣溫：</strong> ${data.temperature} °C</li>
            <li><strong>相對濕度：</strong> ${data.humidity} %</li>
        </ul>
    `;
    resultsContainer.classList.remove('hidden');
}
