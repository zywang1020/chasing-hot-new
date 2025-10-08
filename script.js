// script.js (終極除錯版 - 印出所有過程)

// --- 1. 初始化 & 事件監聽 ---
const detectButton = document.getElementById('detect-button');
const statusMessage = document.getElementById('status-message');
const resultsContainer = document.getElementById('results-container');
const loader = document.getElementById('loader');

detectButton.addEventListener('click', () => {
    console.clear(); // 清空主控台，方便觀察
    console.log("--- 按下按鈕，開始執行 ---");
    loader.classList.remove('hidden');
    statusMessage.textContent = '正在獲取您的位置...';
    resultsContainer.classList.add('hidden');
    navigator.geolocation.getCurrentPosition(geolocationSuccess, geolocationError);
});

// --- 2. 地理定位成功後的主要流程 ---
async function geolocationSuccess(position) {
    const { latitude, longitude } = position.coords;
    console.log(`步驟 1: 地理定位成功。緯度: ${latitude}, 經度: ${longitude}`);
    statusMessage.textContent = `位置獲取成功 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})。`;
    
    try {
        const nearestStation = await findNearestStation(latitude, longitude);
        console.log("步驟 2: 找到最近的氣象站，回傳的物件:", nearestStation);

        const weatherData = await fetchCityForecastData(nearestStation.city);
        console.log("步驟 3: 取得縣市預報，回傳的物件:", weatherData);

        displayAllResults(weatherData, nearestStation);

    } catch (error) {
        console.error("執行過程中斷，錯誤發生在:", error);
        statusMessage.textContent = `錯誤：${error.message}`;
    } finally {
        loader.classList.add('hidden');
    }
}

function geolocationError(error) {
    console.error("地理定位失敗:", error);
    statusMessage.textContent = `無法獲取您的位置：${error.message}`;
    loader.classList.add('hidden');
}

// --- 核心功能區 ---

async function findNearestStation(userLat, userLon) {
    console.log("  -> 執行 findNearestStation...");
    const CWA_API_KEY = 'CWA-234F005B-7959-436C-A0FF-BD4225C0E339';
    const API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${CWA_API_KEY}`;
    
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('無法獲取站點列表');
    const data = await response.json();
    console.log("  -> 已從 O-A0001-001 取得原始站點資料。");

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
        const result = {
            name: closestStation.StationName,
            lat: parseFloat(closestStation.GeoInfo.Coordinates[0].StationLatitude),
            city: closestStation.GeoInfo.CountyName,
            distance: minDistance.toFixed(2),
            observedTemp: closestStation.WeatherElement.AirTemperature,
            observedHumidity: closestStation.WeatherElement.RelativeHumidity
        };
        return result;
    } else {
        throw new Error('找不到任何氣象站');
    }
}

async function fetchCityForecastData(cityName) {
    console.log(`  -> 執行 fetchCityForecastData，目標縣市: ${cityName}`);
    const CWA_API_KEY = 'CWA-234F005B-7959-436C-A0FF-BD4225C0E339';
    const API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=${encodeURI(cityName)}`;
    
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('API請求失敗');
    const data = await response.json();
    console.log(`  -> 已從 F-C0032-001 取得 ${cityName} 的原始預報資料。`);

    if (!data.records || !data.records.location || data.records.location.length === 0) {
        throw new Error(`找不到 ${cityName} 的縣市預報`);
    }
    
    const weatherElements = data.records.location[0].weatherElement;
    const maxTElement = weatherElements.find(el => el.elementName === 'MaxT');
    const minTElement = weatherElements.find(el => el.elementName === 'MinT');

    if (!maxTElement || !minTElement || maxTElement.time.length === 0 || minTElement.time.length === 0) {
        throw new Error('預報資料中缺少最高溫或最低溫資訊');
    }
    
    const maxT = parseFloat(maxTElement.time[0].parameter.parameterName);
    const minT = parseFloat(minTElement.time[0].parameter.parameterName);

    if (isNaN(maxT) || isNaN(minT)) throw new Error('預報資料格式不符');
    
    return { maxT, minT };
}

// --- 工具區 ---

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

function displayAllResults(weatherData, stationData) {
    console.log("步驟 4: 呼叫 calculateSurfaceTemperatures，傳入的緯度:", stationData.lat, "最高溫:", weatherData.maxT, "最低溫:", weatherData.minT);
    const calculatedData = calculateSurfaceTemperatures(stationData.lat, weatherData.maxT, weatherData.minT);
    console.log("步驟 5: 收到計算結果:", calculatedData);
    
    let resultsHTML = `
        <h3>估算表面溫度 (基於 ${stationData.city} 預報)</h3>
        <ul>
    `;
    calculatedData.forEach(pavement => {
        resultsHTML += `<li><strong>${pavement.name}：</strong> ${pavement.temperature} °C</li>`;
    });
    resultsHTML += `</ul>`;
    
    resultsHTML += `
        <h3 style="margin-top: 25px;">最近的氣象站觀測資料</h3>
        <ul>
            <li><strong>站點名稱：</strong> ${stationData.name}</li>
            <li><strong>與您距離：</strong> 約 ${stationData.distance} 公里</li>
            <li><strong>目前氣溫：</strong> ${stationData.observedTemp} °C</li>
            <li><strong>相對濕度：</strong> ${stationData.observedHumidity} %</li>
        </ul>
    `;
    
    resultsContainer.innerHTML = resultsHTML;
    resultsContainer.classList.remove('hidden');
    statusMessage.textContent = `計算完成！`;
    console.log("--- 執行結束 ---");
}
