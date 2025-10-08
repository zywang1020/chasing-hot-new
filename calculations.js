// calculations.js (物理公式運算專用檔案)

/**
 * 根據氣象預報資料和地理位置，計算不同鋪面的表面溫度。
 * @param {number} latitude - 緯度
 * @param {number} forecastHigh - 預報最高溫 (°C)
 * @param {number} forecastLow - 預報最低溫 (°C)
 * @returns {Array<Object>} 包含各種鋪面名稱與其估算溫度的陣列
 */
function calculateSurfaceTemperatures(latitude, forecastHigh, forecastLow) {
    // --- 物理常數 ---
    const GSC = 1367; // 太陽常數 W/m^2
    const SIGMA = 5.67e-8; // 史蒂芬-波茲曼常數 W/m^2K^4

    // --- 鋪面反照率資料 ---
    const pavements = [
        { name: '柏油 (Asphalt)', albedo: 0.075 },
        { name: '水泥 (Concrete)', albedo: 0.395 },
        { name: '草地 (Grass)', albedo: 0.275 },
        { name: 'PU跑道 (PU Track)', albedo: 0.125 }
    ];

    // --- 開始執行公式計算 ---
    const toRadians = (deg) => deg * Math.PI / 180;
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    // n 為當天是今年的第 n 天
    const n = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));

    // 公式1: 計算太陽赤緯 (δ)
    const delta = toRadians(23.45) * Math.sin(toRadians((360 / 365) * (n - 81)));
    
    // 公式2: 計算正午太陽高度角 (α)
    const phi = toRadians(latitude);
    const alpha = toRadians(90) - Math.abs(phi - delta);

    // 公式3: 計算理論最大太陽輻射量 (Rs_max)
    const E0 = 1 + 0.005 * Math.cos(toRadians(360 * n / 365));
    const Rs_max = GSC * E0 * Math.sin(alpha);
    
    // 雲遮係數相關計算
    const delta_T_max = 0.00003 * Rs_max + 6;
    const delta_T_observed = forecastHigh - forecastLow;
    const cloudCoefficient = delta_T_observed / delta_T_max; // 雲遮係數

    // 公式4: 計算實際太陽入射輻射量 (Rs_observed)
    const Rs_observed = Rs_max * cloudCoefficient;
    
    // 公式5: 為每種鋪面計算表面溫度
    return pavements.map(pavement => {
        // 假設 emissivity (放射率) ε = 1 - albedo
        const emissivity = 1 - pavement.albedo;
        
        const T_kelvin = Math.pow((emissivity * Rs_observed) / SIGMA, 0.25);
        
        // 將克氏溫標轉換為攝氏溫標
        const T_celsius = T_kelvin - 273.15;
        
        return {
            name: pavement.name,
            temperature: T_celsius.toFixed(1)
        };
    });
}
