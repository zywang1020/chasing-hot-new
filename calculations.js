// calculations.js (最終校驗版)

function calculateSurfaceTemperatures(latitude, forecastHigh, forecastLow) {
    // --- 物理常數 ---
    const GSC = 1367; // 太陽常數 W/m^2
    const SIGMA = 5.67e-8; // 史蒂芬-波茲曼常數 W/m^2K^4

    // --- 鋪面反照率資料 (使用符合體感的參數) ---
    const pavements = [
        { name: '柏油 (Asphalt)', albedo: 0.075 },
        { name: '水泥 (Concrete)', albedo: 0.25 },
        { name: '草地 (Grass)', albedo: 0.275 },
        { name: 'PU跑道 (PU Track)', albedo: 0.125 }
    ];

    // --- 開始執行公式計算 ---
    const toRadians = (deg) => deg * Math.PI / 180;
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const n = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));

    const delta = toRadians(23.45) * Math.sin(toRadians((360 / 365) * (n - 81)));
    const phi = toRadians(latitude);
    const alpha = toRadians(90) - Math.abs(phi - delta);
    const E0 = 1 + 0.033 * Math.cos(toRadians(360 * n / 365));
    const Rs_max = GSC * E0 * Math.sin(alpha);
    
    // --- 雲遮係數相關計算 ---
    // *** 絕對正確的關鍵修正：使用 0.005 係數以匹配 Rs_max 的單位 ***
    const delta_T_max = 0.005 * Rs_max + 6;
    const delta_T_observed = forecastHigh - forecastLow;
    
    let cloudCoefficient = delta_T_observed / delta_T_max;
    // 增加保護機制，確保雲遮係數最大為 1 (晴天)
    if (cloudCoefficient > 1) {
        cloudCoefficient = 1;
    }

    const Rs_observed = Rs_max * cloudCoefficient;
    
    // --- 公式5: 為每種鋪面計算表面溫度 ---
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
