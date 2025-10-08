// calculations.js (帶有診斷訊息的最終除錯版)

function calculateSurfaceTemperatures(latitude, forecastHigh, forecastLow) {
    console.log("--- 開始進行鋪面溫度計算 ---");
    console.log(`輸入緯度: ${latitude}, 預報最高溫: ${forecastHigh}, 預報最低溫: ${forecastLow}`);

    const GSC = 1367;
    const SIGMA = 5.67e-8;

    const pavements = [
        { name: '柏油 (Asphalt)', albedo: 0.075 },
        { name: '水泥 (Concrete)', albedo: 0.25 },
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
    console.log(`步驟1: 理論最大太陽輻射量 (Rs_max) = ${Rs_max.toFixed(2)} W/m²`);

    const delta_T_max = 0.005 * Rs_max + 6;
    const delta_T_observed = forecastHigh - forecastLow;
    console.log(`步驟2: 理論最大溫差 (delta_T_max) = ${delta_T_max.toFixed(2)} °C`);
    console.log(`       預報溫差 (delta_T_observed) = ${delta_T_observed.toFixed(2)} °C`);
    
    let cloudCoefficient = delta_T_observed / delta_T_max;
    if (cloudCoefficient > 1) {
        cloudCoefficient = 1;
    }
    console.log(`步驟3: 雲遮係數 (cloudCoefficient) = ${cloudCoefficient.toFixed(2)}`);

    const Rs_observed = Rs_max * cloudCoefficient;
    console.log(`步驟4: 實際太陽入射輻射量 (Rs_observed) = ${Rs_observed.toFixed(2)} W/m²`);
    
    console.log("--- 步驟5: 計算各種鋪面溫度 ---");
    return pavements.map(pavement => {
        const emissivity = 1 - pavement.albedo;
        const T_kelvin = Math.pow((emissivity * Rs_observed) / SIGMA, 0.25);
        const T_celsius = T_kelvin - 273.15;
        
        console.log(`  - ${pavement.name}: 計算出的攝氏溫度 = ${T_celsius.toFixed(2)} °C`);
        
        return {
            name: pavement.name,
            temperature: T_celsius.toFixed(1)
        };
    });
}
