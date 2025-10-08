// script.js (最終校驗版)

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
        // 步驟一：找到最近的氣象站，取得所有觀測與位置資料
        statusMessage.textContent = '正在尋找最近的氣象站...';
        const nearestStation = await findNearestStation(latitude, longitude);

        // 步驟二：用縣市名稱取得可靠的「縣市預報」資料
        statusMessage.textContent = `找到氣象站：${nearestStation.name}。正在擷取 ${nearestStation.city} 的預報...`;
        const weatherData = await fetchCityForecastData(nearestStation.city);

        // 步驟三：將「計算結果」和「觀測結果」一起顯示出來
        displayAllResults(weatherData, nearestStation);

    } catch (error) {
        statusMessage.textContent = `錯誤：${error.message}`;
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

// 功能 A: 找到最近的氣象站 (回傳所有需要的資料)
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
            city: closestStation.GeoInfo.CountyName,
            distance: minDistance.toFixed(2),
            observedTemp: closestStation.WeatherElement.AirTemperature,
            observedHumidity: closestStation.WeatherElement.RelativeHumidity
        };
    } else {
        throw new Error('找不到任何氣象站');
    }
}

// 功能 B: 用「縣市名稱」取得可靠的「預報」資料
async function fetchCityForecastData(cityName) {
    const CWA_API_KEY = 'CWA-234F005B-7959-436C-A0FF-BD4225C0E339';
    const API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=${encodeURI(cityName)}`;
    
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('API請求失敗');
    const data = await response.json();

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

// 工具 A: 計算距離
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// 工具 B: 顯示所有結果
function displayAllResults(weatherData, stationData) {
    const calculatedData = calculateSurfaceTemperatures(stationData.lat, weatherData.maxT, weatherData.minT);
    
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
}
