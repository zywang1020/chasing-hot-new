<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta http-equiv="Content-Style-Type" content="text/css">
  <title></title>
  <meta name="Generator" content="Cocoa HTML Writer">
  <meta name="CocoaVersion" content="2575.7">
  <style type="text/css">
    p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px Helvetica}
    p.p2 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px Helvetica; min-height: 14.0px}
    p.p3 {margin: 0.0px 0.0px 0.0px 0.0px; font: 20.0px 'PingFang TC'; color: #fb0007; -webkit-text-stroke: #fb0007}
    span.s1 {font: 12.0px Helvetica; color: #000000; -webkit-text-stroke: 0px #000000}
    span.s2 {font-kerning: none; background-color: #ffffff}
  </style>
</head>
<body>
<p class="p1">// script.js</p>
<p class="p2"><br></p>
<p class="p1">// --- 1. 初始化 &amp; 事件監聽 ---</p>
<p class="p1">const detectButton = document.getElementById('detect-button');</p>
<p class="p1">const statusMessage = document.getElementById('status-message');</p>
<p class="p1">const resultsContainer = document.getElementById('results-container');</p>
<p class="p2"><br></p>
<p class="p1">detectButton.addEventListener('click', () =&gt; {</p>
<p class="p1"><span class="Apple-converted-space">    </span>statusMessage.textContent = '正在獲取您的位置...';</p>
<p class="p1"><span class="Apple-converted-space">    </span>navigator.geolocation.getCurrentPosition(geolocationSuccess, geolocationError);</p>
<p class="p1">});</p>
<p class="p2"><br></p>
<p class="p1">// --- 2. 地理定位 ---</p>
<p class="p1">async function geolocationSuccess(position) {</p>
<p class="p1"><span class="Apple-converted-space">    </span>const { latitude, longitude } = position.coords;</p>
<p class="p1"><span class="Apple-converted-space">    </span>statusMessage.textContent = `位置獲取成功 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})。正在擷取氣象資料...`;</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">    </span>try {</p>
<p class="p1"><span class="Apple-converted-space">        </span>const weatherData = await fetchWeatherData(latitude, longitude);</p>
<p class="p1"><span class="Apple-converted-space">        </span>statusMessage.textContent = '氣象資料獲取完畢，正在計算表面溫度...';</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">        </span>const surfaceTemperatures = calculateSurfaceTemperatures(latitude, weatherData.maxT, weatherData.minT);</p>
<p class="p1"><span class="Apple-converted-space">        </span>displayResults(surfaceTemperatures);</p>
<p class="p1"><span class="Apple-converted-space">        </span>statusMessage.textContent = '計算完成！';</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">    </span>} catch (error) {</p>
<p class="p1"><span class="Apple-converted-space">        </span>statusMessage.textContent = `錯誤：${error.message}`;</p>
<p class="p1"><span class="Apple-converted-space">    </span>}</p>
<p class="p1">}</p>
<p class="p2"><br></p>
<p class="p1">function geolocationError(error) {</p>
<p class="p1"><span class="Apple-converted-space">    </span>statusMessage.textContent = `無法獲取您的位置：${error.message}`;</p>
<p class="p1">}</p>
<p class="p2"><br></p>
<p class="p1">// --- 3. 氣象資料擷取 (CWA API) ---</p>
<p class="p1">async function fetchWeatherData(lat, lon) {</p>
<p class="p1"><span class="Apple-converted-space">    </span>// !!重要!! 請至中央氣象署開放資料平台申請您自己的 API KEY</p>
<p class="p3"><span class="s1"><span class="Apple-converted-space">    </span>const CWA_API_KEY = '</span><span class="s2">CWA-234F005B-7959-436C-A0FF-BD4225C0E339</span><span class="s1">';</span></p>
<p class="p1"><span class="Apple-converted-space">    </span>const API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${CWA_API_KEY}&amp;limit=1&amp;format=JSON&amp;geocode=${lon},${lat}`;</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">    </span>const response = await fetch(API_URL);</p>
<p class="p1"><span class="Apple-converted-space">    </span>if (!response.ok) {</p>
<p class="p1"><span class="Apple-converted-space">        </span>throw new Error('無法從氣象署獲取資料。');</p>
<p class="p1"><span class="Apple-converted-space">    </span>}</p>
<p class="p1"><span class="Apple-converted-space">    </span>const data = await response.json();</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">    </span>const tempElements = data.records.locations[0].location[0].weatherElement;</p>
<p class="p1"><span class="Apple-converted-space">    </span>const maxT = parseFloat(tempElements.find(el =&gt; el.elementName === 'MaxT').time[0].elementValue[0].value);</p>
<p class="p1"><span class="Apple-converted-space">    </span>const minT = parseFloat(tempElements.find(el =&gt; el.elementName === 'MinT').time[0].elementValue[0].value);</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">    </span>if (isNaN(maxT) || isNaN(minT)) {</p>
<p class="p1"><span class="Apple-converted-space">        </span>throw new Error('氣象資料格式不符，無法解析溫度。');</p>
<p class="p1"><span class="Apple-converted-space">    </span>}</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">    </span>return { maxT, minT };</p>
<p class="p1">}</p>
<p class="p2"><br></p>
<p class="p1">// --- 4. 核心物理運算 ---</p>
<p class="p1">function calculateSurfaceTemperatures(latitude, forecastHigh, forecastLow) {</p>
<p class="p1"><span class="Apple-converted-space">    </span>const GSC = 1367;</p>
<p class="p1"><span class="Apple-converted-space">    </span>const SIGMA = 5.67e-8;</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">    </span>const pavements = [</p>
<p class="p1"><span class="Apple-converted-space">        </span>{ name: '柏油 (Asphalt)', albedo: 0.075 },</p>
<p class="p1"><span class="Apple-converted-space">        </span>{ name: '水泥 (Concrete)', albedo: 0.395 },</p>
<p class="p1"><span class="Apple-converted-space">        </span>{ name: '草地 (Grass)', albedo: 0.275 },</p>
<p class="p1"><span class="Apple-converted-space">        </span>{ name: 'PU跑道 (PU Track)', albedo: 0.125 }</p>
<p class="p1"><span class="Apple-converted-space">    </span>];</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">    </span>const toRadians = (deg) =&gt; deg * Math.PI / 180;</p>
<p class="p1"><span class="Apple-converted-space">    </span>const today = new Date();</p>
<p class="p1"><span class="Apple-converted-space">    </span>const startOfYear = new Date(today.getFullYear(), 0, 0);</p>
<p class="p1"><span class="Apple-converted-space">    </span>const n = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">    </span>const delta = toRadians(23.45) * Math.sin(toRadians((360 / 365) * (n - 81)));</p>
<p class="p1"><span class="Apple-converted-space">    </span>const phi = toRadians(latitude);</p>
<p class="p1"><span class="Apple-converted-space">    </span>const alpha = toRadians(90) - Math.abs(phi - delta);</p>
<p class="p1"><span class="Apple-converted-space">    </span>const E0 = 1 + 0.033 * Math.cos(toRadians(360 * n / 365));</p>
<p class="p1"><span class="Apple-converted-space">    </span>const Rs_max = GSC * E0 * Math.sin(alpha);</p>
<p class="p1"><span class="Apple-converted-space">    </span>const delta_T_max = 0.3 * Rs_max + 6;</p>
<p class="p1"><span class="Apple-converted-space">    </span>const delta_T_observed = forecastHigh - forecastLow;</p>
<p class="p1"><span class="Apple-converted-space">    </span>const cloudCoefficient = delta_T_observed / delta_T_max;</p>
<p class="p1"><span class="Apple-converted-space">    </span>const Rs_observed = Rs_max * cloudCoefficient;</p>
<p class="p2"><br></p>
<p class="p1"><span class="Apple-converted-space">    </span>return pavements.map(pavement =&gt; {</p>
<p class="p1"><span class="Apple-converted-space">        </span>const emissivity = 1 - pavement.albedo;</p>
<p class="p1"><span class="Apple-converted-space">        </span>const T_kelvin = Math.pow((emissivity * Rs_observed) / SIGMA, 0.25);</p>
<p class="p1"><span class="Apple-converted-space">        </span>const T_celsius = T_kelvin - 273.15;</p>
<p class="p1"><span class="Apple-converted-space">        </span>return {</p>
<p class="p1"><span class="Apple-converted-space">            </span>name: pavement.name,</p>
<p class="p1"><span class="Apple-converted-space">            </span>temperature: T_celsius.toFixed(1)</p>
<p class="p1"><span class="Apple-converted-space">        </span>};</p>
<p class="p1"><span class="Apple-converted-space">    </span>});</p>
<p class="p1">}</p>
<p class="p2"><br></p>
<p class="p1">// --- 5. 顯示結果 ---</p>
<p class="p1">function displayResults(results) {</p>
<p class="p1"><span class="Apple-converted-space">    </span>resultsContainer.innerHTML = '&lt;h3&gt;估算表面溫度：&lt;/h3&gt;';</p>
<p class="p1"><span class="Apple-converted-space">    </span>const ul = document.createElement('ul');</p>
<p class="p1"><span class="Apple-converted-space">    </span>results.forEach(result =&gt; {</p>
<p class="p1"><span class="Apple-converted-space">        </span>const li = document.createElement('li');</p>
<p class="p1"><span class="Apple-converted-space">        </span>li.textContent = `${result.name}: ${result.temperature}°C`;</p>
<p class="p1"><span class="Apple-converted-space">        </span>ul.appendChild(li);</p>
<p class="p1"><span class="Apple-converted-space">    </span>});</p>
<p class="p1"><span class="Apple-converted-space">    </span>resultsContainer.appendChild(ul);</p>
<p class="p1"><span class="Apple-converted-space">    </span>resultsContainer.classList.remove('hidden');</p>
<p class="p1">}</p>
</body>
</html>
