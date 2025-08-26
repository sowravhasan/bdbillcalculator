// Advanced Bangladesh Electricity Bill Calculator Logic
const form = document.getElementById("appliance-form");
const list = document.getElementById("appliance-list");
const totalKwhEl = document.getElementById("total-kwh");
const totalCostEl = document.getElementById("total-cost");
const totalAppliancesEl = document.getElementById("total-appliances");
const unitPriceInput = document.getElementById("unit-price");

// Advanced UI Elements
const darkModeToggle = document.getElementById("dark-mode-toggle");
const sunIcon = document.getElementById("sun-icon");
const moonIcon = document.getElementById("moon-icon");
const exportBtn = document.getElementById("export-btn");
const viewToggle = document.getElementById("view-toggle");
const resultsDefault = document.getElementById("results-default");
const resultsDetailed = document.getElementById("results-detailed");

let appliances = [];
let isDarkMode = localStorage.getItem("darkMode") === "true";
let currentView = "summary"; // 'summary' or 'chart'

// Bangladesh Electricity Slab Rates (BPDB)
const ELECTRICITY_SLABS = [
  { min: 0, max: 75, rate: 3.5 },
  { min: 76, max: 200, rate: 4.75 },
  { min: 201, max: 300, rate: 5.5 },
  { min: 301, max: 400, rate: 6.5 },
  { min: 401, max: Infinity, rate: 9.9 },
];

// Initialize App
document.addEventListener("DOMContentLoaded", function () {
  initializeDarkMode();
  setupEventListeners();
  renderList();
  loadSampleData();
  if (form && form.name) form.name.focus();
});

// Dark Mode Functions
function initializeDarkMode() {
  if (isDarkMode) {
    document.documentElement.classList.add("dark");
    
    // Desktop icons
    if (sunIcon) sunIcon.classList.add("hidden");
    if (moonIcon) moonIcon.classList.remove("hidden");
    
    // Mobile icons
    const darkModeToggleMobile = document.getElementById("dark-mode-toggle-mobile");
    if (darkModeToggleMobile) {
      const mobileSunIcon = darkModeToggleMobile.querySelector("svg:first-child");
      const mobileMoonIcon = darkModeToggleMobile.querySelector("svg:last-child");
      
      if (mobileSunIcon && mobileMoonIcon) {
        mobileSunIcon.classList.add("hidden");
        mobileMoonIcon.classList.remove("hidden");
      }
    }
  }
}

function setupEventListeners() {
  // Dark Mode Toggle - Desktop
  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", toggleDarkMode);
  }

  // Dark Mode Toggle - Mobile
  const darkModeToggleMobile = document.getElementById("dark-mode-toggle-mobile");
  if (darkModeToggleMobile) {
    darkModeToggleMobile.addEventListener("click", toggleDarkMode);
  }

  // Quick Add Buttons - Use event delegation since buttons are added dynamically
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("quick-add-btn")) {
      handleQuickAdd(e);
    }
  });

  // Export Button - Desktop
  if (exportBtn) {
    exportBtn.addEventListener("click", exportResults);
  }

  // Export Button - Mobile
  const exportBtnMobile = document.getElementById("export-btn-mobile");
  if (exportBtnMobile) {
    exportBtnMobile.addEventListener("click", exportResults);
  }

  // View Toggle
  if (viewToggle) {
    viewToggle.addEventListener("click", toggleResultsView);
  }

  // Form Submission
  if (form) {
    form.addEventListener("submit", handleFormSubmission);
  }

  // Real-time unit price updates
  if (unitPriceInput) {
    unitPriceInput.addEventListener("input", handleUnitPriceChange);
  }

  // Enhanced keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts);
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  localStorage.setItem("darkMode", isDarkMode.toString());

  // Update document class
  if (isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Update desktop icons
  if (sunIcon) {
    if (isDarkMode) {
      sunIcon.classList.add("hidden");
    } else {
      sunIcon.classList.remove("hidden");
    }
  }
  if (moonIcon) {
    if (isDarkMode) {
      moonIcon.classList.remove("hidden");
    } else {
      moonIcon.classList.add("hidden");
    }
  }

  // Update mobile icons
  const darkModeToggleMobile = document.getElementById("dark-mode-toggle-mobile");
  if (darkModeToggleMobile) {
    const mobileSunIcon = darkModeToggleMobile.querySelector("svg:first-child");
    const mobileMoonIcon = darkModeToggleMobile.querySelector("svg:last-child");
    
    if (mobileSunIcon && mobileMoonIcon) {
      if (isDarkMode) {
        mobileSunIcon.classList.add("hidden");
        mobileMoonIcon.classList.remove("hidden");
      } else {
        mobileSunIcon.classList.remove("hidden");
        mobileMoonIcon.classList.add("hidden");
      }
    }
  }

  showNotification(`${isDarkMode ? "Dark" : "Light"} mode enabled`, "info");
}

function handleQuickAdd(e) {
  const btn = e.target;
  const name = btn.dataset.name;
  const power = parseFloat(btn.dataset.power);
  const hours = parseFloat(btn.dataset.hours);
  const days = parseFloat(btn.dataset.days);

  // Check for duplicate appliance names
  if (appliances.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
    showNotification(`${name} already added`, "warning");
    return;
  }

  const unitPrice = parseFloat(unitPriceInput.value);
  const kwh = calculateKwh(power, hours, days);
  const cost = calculateCost(kwh, unitPrice);

  appliances.push({ name, power, hours, days, kwh, cost });
  renderList();

  // Add visual feedback
  btn.classList.add("animate-bounce-in");
  showNotification(`${name} added successfully!`, "success");

  setTimeout(() => {
    btn.classList.remove("animate-bounce-in");
  }, 600);
}

function calculateSlabBill(totalKwh) {
  let remainingKwh = totalKwh;
  let totalCost = 0;
  const slabBreakdown = [];

  for (const slab of ELECTRICITY_SLABS) {
    if (remainingKwh <= 0) break;

    const slabMin = slab.min;
    const slabMax =
      slab.max === Infinity ? slabMin + remainingKwh - 1 : slab.max;
    const slabRange = Math.min(remainingKwh, slabMax - slabMin + 1);
    const slabCost = slabRange * slab.rate;

    if (slabRange > 0) {
      slabBreakdown.push({
        range: `${slabMin}-${
          slabMax === Infinity ? slabMin + remainingKwh - 1 : slabMax
        }`,
        kwh: slabRange,
        rate: slab.rate,
        cost: slabCost,
      });

      totalCost += slabCost;
      remainingKwh -= slabRange;
    }
  }

  return { totalCost, slabBreakdown };
}

function updateSlabBreakdown() {
  if (appliances.length === 0) return;

  const totalKwh = appliances.reduce((sum, a) => sum + a.kwh, 0);
  const { totalCost, slabBreakdown } = calculateSlabBill(totalKwh);

  // Update slab breakdown display
  const slabElements = [
    document.getElementById("slab-1-cost"),
    document.getElementById("slab-2-cost"),
    document.getElementById("slab-3-cost"),
    document.getElementById("slab-4-cost"),
    document.getElementById("slab-5-cost"),
  ];

  slabElements.forEach((el, i) => {
    if (el) {
      if (slabBreakdown[i]) {
        el.textContent = `৳${slabBreakdown[i].cost.toFixed(2)}`;
      } else {
        el.textContent = "৳0.00";
      }
    }
  });

  const slabTotalEl = document.getElementById("slab-total");
  if (slabTotalEl) {
    slabTotalEl.textContent = `৳${totalCost.toFixed(2)}`;
  }

  // Update summary elements
  const summaryKwh = document.getElementById("summary-kwh");
  const summaryCost = document.getElementById("summary-cost");
  const summaryDaily = document.getElementById("summary-daily");

  if (summaryKwh) summaryKwh.textContent = totalKwh.toFixed(2);
  if (summaryCost) summaryCost.textContent = `৳${totalCost.toFixed(2)}`;
  if (summaryDaily)
    summaryDaily.textContent = `৳${(totalCost / 30).toFixed(2)}`;
}

function renderList() {
  if (!list) return;

  list.innerHTML = "";

  if (appliances.length === 0) {
    list.innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-gray-400 dark:text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-dark-200 mb-2">No appliances added yet</h3>
                <p class="text-gray-500 dark:text-dark-400">Add your first appliance above to start calculating your electricity bill.</p>
            </div>
        `;
    showDefaultResults();
    updateTotals();
    return;
  }

  const container = document.createElement("div");
  container.className = "space-y-4";

  appliances.forEach((appliance, idx) => {
    const applianceCard = document.createElement("div");
    applianceCard.className =
      "bg-white dark:bg-dark-800 border border-blue-200 dark:border-dark-600 rounded-xl p-4 hover:shadow-lg hover:border-blue-400 transition-all duration-300 animate-slide-up";
    applianceCard.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div class="flex-1 min-w-0">
                    <div class="flex items-start sm:items-center mb-3 sm:mb-2">
                        <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg flex-shrink-0">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-semibold text-gray-800 dark:text-dark-200 text-base sm:text-lg truncate">${
                              appliance.name
                            }</h4>
                            <p class="text-xs sm:text-sm text-gray-600 dark:text-dark-400 break-words">${
                              appliance.power
                            }W • ${appliance.hours}hrs/day • ${
      appliance.days
    } days/month</p>
                        </div>
                        <button 
                            aria-label="Remove ${appliance.name}" 
                            class="ml-2 sm:hidden p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-lg flex-shrink-0" 
                            data-idx="${idx}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 pl-0 sm:pl-13">
                        <div class="bg-blue-50 dark:bg-dark-700 rounded-lg p-2 sm:p-3 border border-blue-200 dark:border-dark-600">
                            <p class="text-xs text-gray-500 dark:text-dark-400 uppercase tracking-wide">Monthly Consumption</p>
                            <p class="text-sm sm:text-lg font-bold text-blue-600 dark:text-blue-400">${appliance.kwh.toFixed(
                              2
                            )} kWh</p>
                        </div>
                        <div class="bg-blue-50 dark:bg-dark-700 rounded-lg p-2 sm:p-3 border border-blue-200 dark:border-dark-600">
                            <p class="text-xs text-gray-500 dark:text-dark-400 uppercase tracking-wide">Monthly Cost</p>
                            <p class="text-sm sm:text-lg font-bold text-blue-600 dark:text-blue-400">৳${appliance.cost.toFixed(
                              2
                            )}</p>
                        </div>
                    </div>
                </div>
                <button 
                    aria-label="Remove ${appliance.name}" 
                    class="hidden sm:block ml-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transform hover:scale-110 transition-all duration-200 shadow-lg flex-shrink-0" 
                    data-idx="${idx}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `;
    container.appendChild(applianceCard);
  });

  list.appendChild(container);

  // Add remove listeners with animation
  list.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(btn.getAttribute("data-idx"));
      const card =
        btn.closest(".bg-white") || btn.closest(".dark\\:bg-dark-800");

      // Add removal animation
      if (card) {
        card.style.transform = "translateX(100%)";
        card.style.opacity = "0";
      }

      setTimeout(() => {
        appliances.splice(idx, 1);
        renderList();
        showNotification("Appliance removed", "info");
      }, 300);
    });
  });

  showDetailedResults();
  updateTotals();
  updateSlabBreakdown();
  generateEnergyTips();
}

function showDefaultResults() {
  if (resultsDefault) resultsDefault.classList.remove("hidden");
  if (resultsDetailed) resultsDetailed.classList.add("hidden");
}

function showDetailedResults() {
  if (resultsDefault) resultsDefault.classList.add("hidden");
  if (resultsDetailed) resultsDetailed.classList.remove("hidden");
}

function generateEnergyTips() {
  const tipsContainer = document.getElementById("tips-content");
  const efficiencySection = document.getElementById("efficiency-tips");

  if (!tipsContainer || !efficiencySection) return;

  if (appliances.length === 0) {
    efficiencySection.classList.add("hidden");
    return;
  }

  efficiencySection.classList.remove("hidden");

  const tips = [];
  const totalKwh = appliances.reduce((sum, a) => sum + a.kwh, 0);
  const avgCost = appliances.reduce((sum, a) => sum + a.cost, 0);

  // High consumption warning
  if (totalKwh > 300) {
    tips.push(
      "⚡ Your consumption is high (300+ kWh). Consider energy-efficient appliances to reduce costs."
    );
  }

  // AC-specific tips
  const acAppliances = appliances.filter(
    (a) =>
      a.name.toLowerCase().includes("ac") ||
      a.name.toLowerCase().includes("air") ||
      a.name.toLowerCase().includes("conditioner")
  );
  if (acAppliances.length > 0) {
    tips.push(
      "❄️ Set AC temperature to 24-26°C to save 20-30% on cooling costs."
    );
  }

  // High-wattage appliance tips
  const highWattageAppliances = appliances.filter((a) => a.power > 1000);
  if (highWattageAppliances.length > 0) {
    tips.push(
      `🔥 Your ${highWattageAppliances[0].name} uses significant power. Consider reducing usage hours.`
    );
  }

  // General efficiency tip
  if (avgCost > 2000) {
    tips.push(
      "💡 Switch to LED bulbs and energy star appliances to save ৳500-800/month."
    );
  }

  // Load shedding tip
  if (totalKwh > 200) {
    tips.push(
      "⏰ During load shedding hours, your actual consumption may be lower. Consider this in your planning."
    );
  }

  if (tips.length === 0) {
    tips.push(
      "✅ Your electricity usage looks efficient! Keep up the good energy-saving habits."
    );
  }

  tipsContainer.innerHTML = tips
    .map((tip) => `<p class="mb-1">${tip}</p>`)
    .join("");
}

function updateTotals() {
  let totalKwh = 0,
    totalCost = 0;
  appliances.forEach((a) => {
    totalKwh += a.kwh;
    totalCost += a.cost;
  });

  // Direct update for optimal performance
  if (totalKwhEl) {
    totalKwhEl.textContent = totalKwh.toFixed(2);
  }
  if (totalCostEl) {
    totalCostEl.textContent = "৳" + totalCost.toFixed(2);
  }
  if (totalAppliancesEl) {
    totalAppliancesEl.textContent = appliances.length.toString();
  }

  // Update results section summary cards
  const summaryKwh = document.getElementById("summary-kwh");
  const summaryCost = document.getElementById("summary-cost");
  const summaryDaily = document.getElementById("summary-daily");

  if (summaryKwh) summaryKwh.textContent = totalKwh.toFixed(2);
  if (summaryCost) summaryCost.textContent = `৳${totalCost.toFixed(2)}`;
  if (summaryDaily)
    summaryDaily.textContent = `৳${(totalCost / 30).toFixed(2)}`;

  // Update slab breakdown if we have appliances
  if (appliances.length > 0) {
    updateSlabBreakdown(totalKwh);
    showResults();
  } else {
    hideResults();
  }
}

function showResults() {
  if (resultsDefault) resultsDefault.classList.add("hidden");
  if (resultsDetailed) resultsDetailed.classList.remove("hidden");
}

function hideResults() {
  if (resultsDefault) resultsDefault.classList.remove("hidden");
  if (resultsDetailed) resultsDetailed.classList.add("hidden");
}

function animateValue(element, start, end, duration, prefix = "") {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (
      (increment > 0 && current >= end) ||
      (increment < 0 && current <= end)
    ) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = prefix + current.toFixed(2);
  }, 16);
}

function calculateKwh(power, hours, days) {
  return (power * hours * days) / 1000;
}

function calculateCost(kwh, unitPrice) {
  return kwh * unitPrice;
}

function handleFormSubmission(e) {
  e.preventDefault();

  const name = form.name.value.trim();
  const power = parseFloat(form.power.value);
  const hours = parseFloat(form.hours.value);
  const days = parseFloat(form.days.value);
  const unitPrice = parseFloat(unitPriceInput.value);

  // Validation
  if (
    !name ||
    isNaN(power) ||
    isNaN(hours) ||
    isNaN(days) ||
    isNaN(unitPrice)
  ) {
    showNotification("Please fill in all fields correctly", "error");
    return;
  }

  if (power <= 0 || hours < 0 || days <= 0 || unitPrice <= 0) {
    showNotification("Please enter valid positive numbers", "error");
    return;
  }

  // Check for duplicate appliance names
  if (appliances.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
    showNotification("An appliance with this name already exists", "warning");
    return;
  }

  const kwh = calculateKwh(power, hours, days);
  const cost = calculateCost(kwh, unitPrice);

  appliances.push({ name, power, hours, days, kwh, cost });

  renderList();
  updateTotals(); // Explicitly call updateTotals to ensure it runs

  // Form reset with animation
  form.reset();
  unitPriceInput.value = unitPrice;
  if (form.name) form.name.focus();

  showNotification(`${name} added successfully!`, "success");
}

function handleUnitPriceChange() {
  const unitPrice = parseFloat(unitPriceInput.value);
  if (!isNaN(unitPrice) && unitPrice > 0) {
    appliances = appliances.map((a) => {
      const cost = calculateCost(a.kwh, unitPrice);
      return { ...a, cost };
    });
    renderList();
  }
}

function handleKeyboardShortcuts(e) {
  // Ctrl/Cmd + Enter to submit form
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    if (form) form.dispatchEvent(new Event("submit"));
  }

  // Escape to clear form
  if (e.key === "Escape") {
    if (form) {
      form.reset();
      unitPriceInput.value = "8.5";
      if (form.name) form.name.focus();
    }
  }

  // Ctrl/Cmd + D for dark mode toggle
  if ((e.ctrlKey || e.metaKey) && e.key === "d") {
    e.preventDefault();
    toggleDarkMode();
  }
}

function toggleResultsView() {
  const chartContainer = document.getElementById("chart-container");

  if (currentView === "summary") {
    currentView = "chart";
    if (chartContainer) chartContainer.classList.remove("hidden");
    if (viewToggle)
      viewToggle.innerHTML =
        '<span>Summary View</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>';
    createConsumptionChart();
  } else {
    currentView = "summary";
    if (chartContainer) chartContainer.classList.add("hidden");
    if (viewToggle)
      viewToggle.innerHTML =
        '<span>Chart View</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>';
  }
}

function createConsumptionChart() {
  const canvas = document.getElementById("consumption-chart");
  if (!canvas || appliances.length === 0) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Simple bar chart
  const maxConsumption = Math.max(...appliances.map((a) => a.kwh));
  const barWidth = width / appliances.length - 20;
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  appliances.forEach((appliance, index) => {
    const barHeight = (appliance.kwh / maxConsumption) * (height - 60);
    const x = index * (barWidth + 20) + 10;
    const y = height - barHeight - 40;

    // Draw bar
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(x, y, barWidth, barHeight);

    // Draw appliance name
    ctx.fillStyle = "#374151";
    ctx.font = "12px Inter";
    ctx.textAlign = "center";
    ctx.fillText(appliance.name.substring(0, 8), x + barWidth / 2, height - 20);

    // Draw kWh value
    ctx.fillStyle = "#6B7280";
    ctx.font = "10px Inter";
    ctx.fillText(`${appliance.kwh.toFixed(1)} kWh`, x + barWidth / 2, y - 5);
  });
}

function exportResults() {
  if (appliances.length === 0) {
    showNotification(
      "No data to export. Add some appliances first.",
      "warning"
    );
    return;
  }

  // Export directly as text format
  exportTextFile();
}

function exportTextFile() {
  const totalKwh = appliances.reduce((sum, a) => sum + a.kwh, 0);
  const totalCost = appliances.reduce((sum, a) => sum + a.cost, 0);
  const timestamp = new Date().toISOString().split("T")[0];

  // Create text content for export
  let content = "BANGLADESH ELECTRICITY BILL REPORT\n";
  content += "===================================\n\n";
  content += `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n\n`;

  // Summary section
  content += "BILL SUMMARY\n";
  content += "------------\n";
  content += `Total Appliances: ${appliances.length} items\n`;
  content += `Monthly Consumption: ${totalKwh.toFixed(2)} kWh\n`;
  content += `Monthly Cost: ৳${totalCost.toFixed(2)}\n`;
  content += `Daily Average: ৳${(totalCost / 30).toFixed(2)}\n`;
  content += `Annual Estimate: ৳${(totalCost * 12).toFixed(2)}\n\n`;

  // Appliances breakdown
  content += "APPLIANCE BREAKDOWN\n";
  content += "-------------------\n";
  content +=
    "Name                 | Power(W) | Hours/Day | Days/Month | kWh   | Cost(৳)\n";
  content +=
    "---------------------------------------------------------------------\n";
  appliances.forEach((appliance) => {
    const name = appliance.name.padEnd(20);
    const power = appliance.power.toString().padEnd(8);
    const hours = appliance.hours.toString().padEnd(9);
    const days = appliance.days.toString().padEnd(10);
    const kwh = appliance.kwh.toFixed(2).padEnd(5);
    const cost = appliance.cost.toFixed(2);
    content += `${name} | ${power} | ${hours} | ${days} | ${kwh} | ${cost}\n`;
  });

  content += "\n";
  content += "Generated by BD Bill Calculator\n";

  // Create and download the file
  try {
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BD-Bill-Report-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification("Text report exported successfully!", "success");
  } catch (error) {
    console.error("Export Error:", error);
    showNotification("Failed to export. Please try again.", "error");
  }
}

// Notification system
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full max-w-sm`;

  const colors = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    warning: "bg-yellow-500 text-black",
    info: "bg-blue-500 text-white",
  };

  notification.className += ` ${colors[type]}`;
  notification.innerHTML = `
        <div class="flex items-center">
            <span class="flex-1">${message}</span>
            <button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

  document.body.appendChild(notification);

  // Slide in animation
  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  // Auto remove after 4 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 4000);
}

// Load sample data on first visit (disabled - users start with empty list)
function loadSampleData() {
  // Mark as visited to prevent future sample loading
  if (!localStorage.getItem("bd-calc-visited")) {
    localStorage.setItem("bd-calc-visited", "true");
  }
  // No automatic sample appliances - users will add their own
}

// PWA: Register service worker (optimized)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("sw.js")
      .then(function () {
        // Service worker registered successfully (silent)
      })
      .catch(function () {
        // Service worker registration failed (silent)
      });
  });
}
