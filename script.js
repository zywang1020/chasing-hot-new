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
        throw new Error('找不到任何氣象站。');
    }
}

// --- 3B. 舊功能：用指定經緯度取得「預報」資料 ---
async function fetchForecastData(lat, lon) {
    const CWA_API_KEY = 'CWA-234F005B-7959-436C-A0FF-BD4225C0E339';
    const API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${CWA_API_KEY}&limit=1&format=JSON&geocode=${lon},${lat}`;
    
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('無法獲取天氣預報。');
    const data = await response.json();

    if (!data.records || !data.records.locations || data.records.locations.length === 0 || !data.records.locations[0].location || data.records.locations[0].location.length === 0) {
        throw new Error('該氣象站位置不在鄉鎮預報範圍內。');
    }
    
    const tempElements = data.records.locations[0].location[0].weatherElement;
    const maxT = parseFloat(tempElements.find(el => el.elementName === 'MaxT').time[0].elementValue[0].value);
    const minT = parseFloat(tempElements.find(el => el.elementName === 'MinT').time[0].elementValue[0].value);

    if (isNaN(maxT) || isNaN(minT)) throw new Error('預報資料格式不符，無法解析溫度。');
    
    return { maxT, minT };
}


// --- 4. 核心物理運算 (源自您的作品說明書) ---
function calculateSurfaceTemperatures(latitude, forecastHigh, forecastLow) {
    const GSC = 1367; // 太陽常數 W/m^2 [cite: 105]
    const SIGMA = 5.67e-8; // 史蒂芬-波茲曼常數 W/m^2K^4 [cite: 112]

    const pavements = [
        { name: '柏油 (Asphalt)', albedo: 0.075 }, // [cite: 83]
        { name: '水泥 (Concrete)', albedo: 0.395 }, // [cite: 83]
        { name: '草地 (Grass)', albedo: 0.275 }, // [cite: 83]
        { name: 'PU跑道 (PU Track)', albedo: 0.125 } // [cite: 83]
    ];

    const toRadians = (deg) => deg * Math.PI / 180;
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const n = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));

    const delta = toRadians(23.45) * Math.sin(toRadians((360 / 365) * (n - 81))); // [cite: 100]
    const phi = toRadians(latitude);
    const alpha = toRadians(90) - Math.abs(phi - delta); // [cite: 103]
    const E0 = 1 + 0.033 * Math.cos(toRadians(360 * n / 365)); // [cite: 106]
    const Rs_max = GSC * E0 * Math.sin(alpha); // [cite: 107]
    const delta_T_max = 0.3 * Rs_max + 6; // [cite: 78]
    const delta_T_observed = forecastHigh - forecastLow;
    const cloudCoefficient = delta_T_observed / delta_T_max; // [cite: 109]
    const Rs_observed = Rs_max * cloudCoefficient; // [cite: 110]
    
    return pavements.map(pavement => {
        const emissivity = 1 - pavement.albedo;
        const T_kelvin = Math.pow((emissivity * Rs_observed) / SIGMA, 0.25); // [cite: 113]
        const T_celsius = T_kelvin - 273.15; // [cite: 112]
        return {
            name: pavement.name,
            temperature: T_celsius.toFixed(1)
        };
    });
}

// --- 5. 數學工具：計算距離 ---
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// --- 6. 顯示結果 (更新為顯示鋪面溫度) ---
function displayResults(data, stationName) {
    let resultsHTML = `
        <h3>估算表面溫度 (基於${stationName}預報)</h3>
        <ul>
    `;
    data.forEach(pavement => {
        resultsHTML += `<li><strong>${pavement.name}：</strong> ${pavement.temperature} °C</li>`;
    });
    resultsHTML += `</ul>`;
    
    resultsContainer.innerHTML = resultsHTML;
    resultsContainer.classList.remove('hidden');
}
