// script.js

// --- 1. 初始化 & 事件監聽 ---
const detectButton = document.getElementById('detect-button');
const statusMessage = document.getElementById('status-message');
const resultsContainer = document.getElementById('results-container');

detectButton.addEventListener('click', () => {
    statusMessage.textContent = '正在獲取您的位置...';
    navigator.geolocation.getCurrentPosition(geolocationSuccess, geolocationError);
});

// --- 2. 地理定位 ---
async function geolocationSuccess(position) {
    const { latitude, longitude } = position.coords;
    statusMessage.textContent = `位置獲取成功 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})。正在擷取氣象資料...`;
    
    try {
        const weatherData = await fetchWeatherData(latitude, longitude);
        statusMessage.textContent = '氣象資料獲取完畢，正在計算表面溫度...';

        const surfaceTemperatures = calculateSurfaceTemperatures(latitude, weatherData.maxT, weatherData.minT);
        displayResults(surfaceTemperatures);
        statusMessage.textContent = '計算完成！';

    } catch (error) {
        statusMessage.textContent = `錯誤：${error.message}`;
    }
}

function geolocationError(error) {
    statusMessage.textContent = `無法獲取您的位置：${error.message}`;
}

// --- 3. 氣象資料擷取 (CWA API) ---
async function fetchWeatherData(lat, lon) {
    // !!重要!! 已將您的 API KEY 填入
    const CWA_API_KEY = 'CWA-234F005B-7959-436C-A0FF-BD4225C0E339';
    const API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${CWA_API_KEY}&limit=1&format=JSON&geocode=${lon},${lat}`;
    
    const response = await fetch(API_URL);
    if (!response.ok) {
        throw new Error('無法從氣象署獲取資料。請確認API Key是否有效。');
    }
    const data = await response.json();
    
    const tempElements = data.records.locations[0].location[0].weatherElement;
    const maxT = parseFloat(tempElements.find(el => el.elementName === 'MaxT').time[0].elementValue[0].value);
    const minT = parseFloat(tempElements.find(el => el.elementName === 'MinT').time[0].elementValue[0].value);

    if (isNaN(maxT) || isNaN(minT)) {
        throw new Error('氣象資料格式不符，無法解析溫度。');
    }
    
    return { maxT, minT };
}

// --- 4. 核心物理運算 ---
function calculateSurfaceTemperatures(latitude, forecastHigh, forecastLow) {
    const GSC = 1367;
    const SIGMA = 5.67e-8;

    const pavements = [
        { name: '柏油 (Asphalt)', albedo: 0.075 },
        { name: '水泥 (Concrete)', albedo: 0.395 },
        { name: '草地 (Grass)', albedo: 0.275 },
        { name: 'PU跑道 (PU Track)', albedo: 0.125 }
    ];

    const toRadians = (deg) => deg * Math.PI / 180;
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const n = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));

    const delta = toRadians(23.45) * Math.sin(toRadians((360 / 365) * (n - 81)));
    const phi = toRadians(latitude);
    const alpha = toRadians(90) - Math.abs(phi - delta);
    const E0 = 1 + 0.033 * Math.cos(toRadians(360 * n / 365));
    const Rs_max = GSC * E0 * Math.sin(alpha);
    const delta_T_max = 0.3 * Rs_max + 6;
    const delta_T_observed = forecastHigh - forecastLow;
    const cloudCoefficient = delta_T_observed / delta_T_max;
    const Rs_observed = Rs_max * cloudCoefficient;
    
    return pavements.map(pavement => {
        const emissivity = 1 - pavement.albedo;
        const T_kelvin = Math.pow((emissivity * Rs_observed) / SIGMA, 0.25);
        const T_celsius = T_kelvin - 273.15;
        return {
            name: pavement.name,
            temperature: T_celsius.toFixed(1)
        };
    });
}

// --- 5. 顯示結果 ---
function displayResults(results) {
    resultsContainer.innerHTML = '<h3>估算表面溫度：</h3>';
    const ul = document.createElement('ul');
    results.forEach(result => {
        const li = document.createElement('li');
        li.textContent = `${result.name}: ${result.temperature}°C`;
        ul.appendChild(li);
    });
    resultsContainer.appendChild(ul);
    resultsContainer.classList.remove('hidden');
}
