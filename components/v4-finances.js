let chartInstance = null; // Store chart instance globally
let latestApiResponse = null; // Declare it globally before using

document.addEventListener("DOMContentLoaded", function () {

  // ===== Range picker wiring for new UI (runs after DOM ready) =====
  bindFinanceRangeBar();

  // Bind your button: [data-button="excel"]
  $(document).off("click", '[data-button="excel"]').on("click", '[data-button="excel"]', function () {
    const sector = $('#sector option:selected').text().trim() || "All";
    const dateRangeText = $('#date_range option:selected').text().trim() || "DateRange";
    const filename = `Transactions_${sector}_${dateRangeText}.csv`.replace(/\s+/g, "_");
    exportTransactionsTableToCSV(filename);
  });

  initLandlordFinances();           // init finance component
  setupChartTypeListener();         // Allow users to change chart type dynamically

  // Event listener to trigger report generation
  $('#download-report').off('click').on('click', function () {
    generateCustomReport();
  });

  // Event listener to trigger finance view and fetch logic
  $(document)
    .off("click", '[api="finance-v4"]')  // Unbind previous click handlers
    .on("click", '[api="finance-v4"]', function () {
      const currentPageId = localStorage.getItem("pageId");
      localStorage.setItem("financeMode", currentPageId);         // Step 1
      $("#finance-v4").trigger("click");                          // Step 2
      localStorage.setItem("pageId", "finance-v4");               // Step 3

      // Sync preset + dates + display via the new range bar
      if (window.financeSetPreset) {
        window.financeSetPreset('month_to_date');
      }

      // Submit form to trigger finance data fetching
      $('[api-form="finance-filter"]').trigger("submit");
      loadRecentPayments();             // load in the recent payments
      fetchStatements();                // fetch user's statements
    });

  // Ensure the chart resizes when the window resizes
  window.addEventListener("resize", function () {
    if (chartInstance) {
      chartInstance.resize();
    }
  });

  // Add .active-override only when #finance is clicked
  $(document).on("click", "#finance", function () {
    $("#finance").addClass("active-override");
  });

  // Remove .active-override from #finance when any other tab button is clicked (excluding #finance-v4)
  $(document).on("click", ".main-tabs__button", function () {
    const isNotFinance = $(this).attr("id") !== "finance";
    const isNotFinanceV4 = $(this).attr("id") !== "finance-v4";

    if (isNotFinance && isNotFinanceV4) {
      $("#finance").removeClass("active-override");
    }
  });

  /* Click handler for Generating Arrears Reports */
  $(document).off('click', '[api-button="arrears-report"]');
  $(document).on('click', '[api-button="arrears-report"]', function (event) {
    const pageId = localStorage.getItem('pageId');

    // If we're in unit view, prevent default behavior (like tab switching)
    if (pageId === 'unit') {
      event.preventDefault();
    }

    generateArrearsReport();
  });

  $(document).off("click", ".file-icon").on("click", ".file-icon", function (e) {
    e.stopPropagation(); // Prevent interfering with row modals
    const url = $(this).data("url");
    if (url) window.open(url, "_blank");
  });

});

/* ================================
   Range picker wiring for new UI
   ================================ */
function bindFinanceRangeBar() {
  const $form        = $('#finance-filter-form');                   // scope to this form
  const $panel       = $form.find('.filters-updated');              // wrapper you’ll show/hide
  const $linksWrap   = $panel.find('.date-range-links-wrapper');
  const $rangeInput  = $('#range_selected');                        // the pill-like input at top
  const $dateRangeSel= $panel.find('[form-input="date_range"]');    // hidden select
  const $start       = $panel.find('input[name="start_date"]').first();
  const $end         = $panel.find('input[name="end_date"]').first();
  const $calHost     = $panel.find('.calendar-inject');

  if (!$form.length || !$panel.length || !$rangeInput.length || !$dateRangeSel.length || !$start.length || !$end.length) {
    console.warn('[FinanceRangeBar] Missing required elements.');
    return;
  }

  // Start hidden
  $panel.hide();

  // Map between pills and select values
  const TEXT_TO_VALUE = {
    'last-3-months':  'last_3_months',
    'last-12-months': 'last_12_months',
    'month-to-date':  'month_to_date',
    'quarter-to-date':'quarter_to_date',
    'year-to-date':   'year_to_date',
    'custom':         'custom'
  };
  const VALUE_TO_LABEL = {
    last_3_months:   'Last 3 Months',
    last_12_months:  'Last 12 Months',
    month_to_date:   'Month to Date',
    quarter_to_date: 'Quarter to Date',
    year_to_date:    'Year to Date',
    all_time:        'All Items',
    custom:          'Custom'
  };

  // Helpers
  const pad = n => String(n).padStart(2, '0');
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const toMDYDash = iso => {
    if (!iso) return '';
    const [y,m,d] = iso.split('-');
    return `${m}-${d}-${String(y).slice(-2)}`;
  };

  function computePresetRange(value) {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let start = null;

    switch (value) {
      case 'last_3_months':   start = new Date(end); start.setMonth(start.getMonth()-3); break;
      case 'last_12_months':  start = new Date(end); start.setFullYear(start.getFullYear()-1); break;
      case 'month_to_date':   start = new Date(end.getFullYear(), end.getMonth(), 1); break;
      case 'quarter_to_date': start = new Date(end.getFullYear(), Math.floor(end.getMonth()/3)*3, 1); break;
      case 'year_to_date':    start = new Date(end.getFullYear(), 0, 1); break;
      case 'all_time':        return { start: '', end: '' };
      default:                return null; // custom
    }
    return { start: toISO(start), end: toISO(end) };
  }

  function updateRangeSelectedDisplay() {
    const v = $dateRangeSel.val();
    if (v === 'custom') {
      const s = $start.val();
      const e = $end.val();
      if (s && e) $rangeInput.val(`${toMDYDash(s)} - ${toMDYDash(e)}`);
      else        $rangeInput.val('Select dates');
    } else {
      $rangeInput.val(VALUE_TO_LABEL[v] || 'Custom');
    }
  }

  // Inline calendar init (two months) inside .calendar-inject
  function ensureInlineCalendar() {
    if (window.__fp) { window.__fp.redraw && window.__fp.redraw(); return; }

    // Convert native date inputs to text so Flatpickr can control them
    if ($start.attr('type') === 'date') $start.attr('type', 'text');
    if ($end.attr('type') === 'date')   $end.attr('type', 'text');

    if (typeof flatpickr !== 'function') {
      console.warn('[FinanceRangeBar] Flatpickr not found; calendar will not render.');
      return;
    }

    window.__fp = flatpickr($start[0], {
      plugins: [ new rangePlugin({ input: $end[0] }) ],
      showMonths: 2,
      inline: true,
      appendTo: $calHost[0],
      disableMobile: true,
      altInput: false,
      dateFormat: 'Y-m-d',
      onChange(selected) {
        const [s, e] = selected;
        if (s) $start.val(toISO(s));
        if (e) $end.val(toISO(e));
        if ($start.val() && $end.val()) $dateRangeSel.val('custom');
        updateRangeSelectedDisplay();
      }
    });
  }

  // 1) Clicking the top input reveals the panel
  $rangeInput.off('click.financeRange focus.financeRange keydown.financeRange')
    .on('click.financeRange', function (e) {
      e.preventDefault();
      $panel.show();
      setTimeout(ensureInlineCalendar, 0);
    })
    .on('focus.financeRange', function () {
      $panel.show();
      setTimeout(ensureInlineCalendar, 0);
    })
    .on('keydown.financeRange', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        $panel.show();
        setTimeout(ensureInlineCalendar, 0);
      }
    });

  // 2) Preset pill clicks
  $linksWrap.off('click.financeRange', '.filter-date-range')
    .on('click.financeRange', '.filter-date-range', function () {
      const $btn = $(this);
      $btn.addClass('active').siblings('.filter-date-range').removeClass('active');

      const textKey = ($btn.data('filter-range-text') || '').toString();
      const value   = TEXT_TO_VALUE[textKey] || 'custom';
      $dateRangeSel.val(value);

      if (value === 'custom') {
        // user picks dates manually
      } else if (value === 'all_time') {
        $start.val(''); $end.val('');
        if (window.__fp) window.__fp.clear();
      } else {
        const rng = computePresetRange(value);
        if (rng) {
          $start.val(rng.start);
          $end.val(rng.end);
          if (window.__fp) window.__fp.setDate([rng.start, rng.end], true);
        }
      }
      updateRangeSelectedDisplay();
    });

  // 3) Keep #range_selected updated if user types dates manually
  $start.on('change.financeRange', updateRangeSelectedDisplay);
  $end.on('change.financeRange', updateRangeSelectedDisplay);

  // 4) Initialize defaults on load (Month to date)
  (function initDefaultState() {
    $linksWrap.find('.filter-date-range').removeClass('active');
    $linksWrap.find('[data-filter-range-text="month-to-date"]').addClass('active');
    $dateRangeSel.val('month_to_date');
    const rng = computePresetRange('month_to_date');
    if (rng) { $start.val(rng.start); $end.val(rng.end); }
    updateRangeSelectedDisplay();
  })();

  // 5) Public helper for your finance tab to switch presets programmatically
  window.financeSetPreset = function (keyUnderscore) {
    const map = {
      last_3_months: 'last-3-months',
      last_12_months:'last-12-months',
      month_to_date: 'month-to-date',
      quarter_to_date:'quarter-to-date',
      year_to_date:  'year-to-date',
      all_time:      'all-time',
      custom:        'custom'
    };
    const dataKey = map[keyUnderscore] || 'custom';
    const $target = $linksWrap.find(`[data-filter-range-text="${dataKey}"]`);
    if ($target.length) $target.trigger('click');
  };
}

/* ================================
   Existing logic below (unchanged)
   ================================ */

function initLandlordFinances() {
  $('[api-form="finance-filter"]').on("submit", function (event) {
    event.preventDefault(); // Prevent default form submission

    let form = $(this);
    let loader = $('.loader');
    let submitButton = form.find('input[type="submit"]');

    loader.css('display', 'flex'); // Show loader
    submitButton.prop("disabled", true); // Disable submit button

    let formData = {}; // Collect form data
    form.find('[form-input]').each(function () {
      let key = $(this).attr("form-input");
      let value = $(this).val();

      if (key === "start_date" || key === "end_date") {
        value = (value || '').trim() === "" ? null : value;
      }
      formData[key] = value;
    });

    // Add backend inputs: mode + target
    formData["mode"] = localStorage.getItem("financeMode") || "profile";
    formData["target"] = localStorage.getItem("pageRefreshParam") || null;

    // Make the AJAX request
    $.ajax({
      url: localStorage.baseUrl + "api:rpDXPv3x/v4_landlord_finances",
      type: "GET",
      headers: { "Authorization": "Bearer " + localStorage.authToken },
      data: formData,
      dataType: "json",
      success: function (response) {
        console.log("API Response:", response);
        latestApiResponse = response; // Store response globally for quick updates

        $('[data-api="display-name"]').text(response.display_name || ""); // Update display name

        // Extract graph_type and transaction_type
        let graphType = formData.graph_type || "bar"; // Default to bar
        let transactionType = formData.transaction_type || "noi"; // Default to NOI
        let chartData = extractChartData(response, transactionType);

        // Render Chart
        renderChart(graphType, chartData);

        // Update quick stats
        updateQuickStats(response);

        // Populate Transactions Table
        populateTransactionsTable(response, transactionType);

      },
      error: function (xhr, status, error) {
        console.error("API Error:", error, xhr.responseText);
        alert('Something went wrong, please try again.');
      },
      complete: function () {
        loader.hide(); // Hide loader
        submitButton.prop("disabled", false); // Re-enable submit button
      }
    });
  });
}

function updateQuickStats(response) {
  const totalRentCollected = response.total_rent_collected || 0;
  const totalExpenses = response.total_expenses || 0;
  const noi = response.noi || 0;

  $('[data-api="total_rent_collected"]').text(`$${totalRentCollected.toLocaleString()}`);
  $('[data-api="total_expenses"]').text(`$${totalExpenses.toLocaleString()}`);
  $('[data-api="noi"]').text(`$${noi.toLocaleString()}`);
}

// Function to format date to M/D/YY
function formatTransDate(dateString) {
  let dateParts = dateString.split("-");
  let date = new Date(Date.UTC(
    parseInt(dateParts[0]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[2])
  ));

  if (isNaN(date)) return ""; // Ensure date is valid
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear().toString().slice(-2)}`;
}

function extractChartData(response, transactionType) {
  let labels = [];
  let paymentData = {};
  let expenseData = [];

  let allDates = [];

  if (transactionType === "noi") {
    allDates = [...response.payments, ...response.expenses].map(t => t.transaction_date);
  } else if (transactionType === "payments") {
    allDates = response.payments.map(t => t.transaction_date);
  } else if (transactionType === "expenses") {
    allDates = response.expenses.map(t => t.transaction_date);
  }

  allDates.sort();
  const firstDate = new Date(allDates[0]);
  const lastDate = new Date(allDates[allDates.length - 1]);
  const spanMonths = firstDate.getUTCFullYear() !== lastDate.getUTCFullYear() ||
    firstDate.getUTCMonth() !== lastDate.getUTCMonth();

  const groupFn = spanMonths ? v4formatToMonthYear : formatTransDate;

  const paymentBuckets = {};
  const expenseBuckets = {};

  function addToBucket(buckets, date, amount) {
    if (!buckets[date]) buckets[date] = 0;
    buckets[date] += amount;
  }

  if (transactionType === "noi") {
    let transactions = [...response.payments, ...response.expenses];
    transactions.forEach(item => {
      let groupKey = groupFn(item.transaction_date);
      if (item.type === "payment") {
        addToBucket(paymentBuckets, groupKey, Math.abs(item.amount));
      } else {
        addToBucket(expenseBuckets, groupKey, item.amount);
      }
    });
  } else if (transactionType === "payments") {
    response.payments.forEach(payment => {
      let groupKey = groupFn(payment.transaction_date);
      addToBucket(paymentBuckets, groupKey, Math.abs(payment.amount));
    });
  } else if (transactionType === "expenses") {
    response.expenses.forEach(expense => {
      let groupKey = groupFn(expense.transaction_date);
      addToBucket(expenseBuckets, groupKey, expense.amount);
    });
  }

  labels = [...new Set([...Object.keys(paymentBuckets), ...Object.keys(expenseBuckets)])];
  labels.sort((a, b) => new Date(a) - new Date(b));

  const paymentArray = labels.map(label => paymentBuckets[label] || 0);
  const expenseArray = labels.map(label => expenseBuckets[label] || 0);

  return { labels, paymentData: paymentArray, expenseData: expenseArray };
}

function renderChart(chartType, chartData) {
  let chartContainer = $(".chart-block");
  chartContainer.html('<canvas id="financeChart"></canvas>');

  let ctx = document.getElementById("financeChart").getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
  }

  let datasetConfig;

  if (chartType === "pie") {
    datasetConfig = [{
      label: "Transactions",
      data: [
        chartData.paymentData.reduce((acc, val) => acc + val, 0),
        chartData.expenseData.reduce((acc, val) => acc + val, 0)
      ],
      backgroundColor: ["rgba(75, 192, 192, 0.7)", "rgba(255, 99, 132, 0.7)"],
      borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
      borderWidth: 1
    }];
  } else {
    datasetConfig = [
      {
        label: "Payments",
        data: chartData.paymentData,
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
        yAxisID: "y-axis-payments"
      },
      {
        label: "Expenses",
        data: chartData.expenseData,
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
        yAxisID: "y-axis-expenses"
      }
    ];
  }

  chartInstance = new Chart(ctx, {
    type: chartType,
    data: {
      labels: chartType === "pie" ? ["Payments", "Expenses"] : chartData.labels,
      datasets: datasetConfig
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: function (tooltipItem) { return `$${tooltipItem.raw.toLocaleString()}`; }
          }
        }
      },
      scales: chartType === "pie" ? {} : {
        "y-axis-payments": {
          type: "linear",
          position: "left",
          beginAtZero: true,
          ticks: { callback: function (value) { return "$" + value.toLocaleString(); } }
        },
        "y-axis-expenses": {
          type: "linear",
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { callback: function (value) { return "$" + value.toLocaleString(); } }
        }
      }
    }
  });

  setTimeout(() => {
    chartInstance.resize();
  }, 200);
}

function populateTransactionsTable(response, transactionType) {
  const table = document.querySelector("#transactionsTable");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  if (!table || !thead || !tbody) {
    console.error("Error: #transactionsTable or its sections not found in the DOM.");
    return;
  }

  const showCodeColumn = ["Admin", "Employee"].includes(localStorage.getItem("userRole"));

  if (showCodeColumn) table.classList.add("has-code-col");
  else table.classList.remove("has-code-col");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `
        <th>Date</th>
        <th>Name</th>
        <th>Street</th>
        <th class="narrow-col">Unit</th>
        <th class="narrow-col">Type</th>
        ${showCodeColumn ? '<th class="narrow-col">Code</th>' : ""}
        <th>Description</th>
        <th>Amount</th>
    `;
  thead.appendChild(headerRow);

  let transactions = [];

  if (transactionType === "noi") {
    transactions = [...response.payments, ...response.expenses];
  } else if (transactionType === "payments") {
    transactions = [...response.payments];
  } else if (transactionType === "expenses") {
    transactions = [...response.expenses];
  }

  transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

  if (transactions.length === 0) {
    let row = document.createElement("tr");
    row.innerHTML = `
            <td colspan="${showCodeColumn ? 8 : 7}" style="text-align: center; padding: 15px; color: #56627a;">
                No transactions to display
            </td>
        `;
    tbody.appendChild(row);
    return;
  }

  transactions.forEach(transaction => {
    let row = document.createElement("tr");

    let formattedAmount = `$${Math.abs(transaction.amount).toLocaleString()}`;
    let transactionTypeText = transaction.type === "payment" ? "Payment" : "Expense";
    let transactionDescription = transaction.description || "N/A";

    let iconHTML = "";
    if (transaction.invoice_url) {
      iconHTML += `<span class="file-icon" data-url="${transaction.invoice_url}" title="View Invoice" style="margin-left: 6px; cursor: pointer;">📄</span>`;
    }
    if (transaction.file) {
      iconHTML += `<span class="file-icon" data-url="${transaction.file}" title="View File" style="margin-left: 6px; cursor: pointer;">📎</span>`;
    }
    let code = transaction.code_number?.code || "—";

    if (transaction.type === "payment") {
      row.setAttribute("element", "modal");
      row.setAttribute("modal", "transaction-detail-modal");
      row.addEventListener("click", function () {
        console.log("Clicked Payment:", transaction);
        populateTransactionModal(transaction);
      });
    }

    row.innerHTML = `
            <td>${formatTransDate(transaction.transaction_date)}</td>
            <td>${transaction.display_name || "N/A"}</td>
            <td>${transaction.street || "N/A"}</td>
            <td class="narrow-col">${transaction.unit_name || "N/A"}</td>
            <td class="narrow-col">${transactionTypeText}</td>
            ${showCodeColumn ? `<td class="narrow-col">${code}</td>` : ""}
            <td>${transactionDescription}${iconHTML}</td>
            <td>${formattedAmount}</td>
        `;
    tbody.appendChild(row);
  });
}

function populateTransactionModal(payment) {
  if (!payment) {
    console.error("Error: Payment data is missing.");
    return;
  }

  let grossPayment = Math.abs(payment.amount);
  let netPayment = parseFloat(payment.landlords_net_payment) || 0;
  let managementFee = grossPayment - netPayment;
  let balanceAfterPayment = payment.total_running_balance || 0;

  let grossPaymentEl = document.querySelector('[data="gross-payment"]');
  let mgFeeEl = document.querySelector('[data="mg-fee"]');
  let netPaymentEl = document.querySelector('[data="net-payment"]');
  let balanceAfterPaymentEl = document.querySelector('[data="balance-after-payment"]');

  if (!grossPaymentEl || !mgFeeEl || !netPaymentEl || !balanceAfterPaymentEl) {
    console.error("Error: One or more modal elements not found.");
    return;
  }

  grossPaymentEl.textContent = `$${grossPayment.toLocaleString()}`;
  mgFeeEl.textContent = `$${managementFee.toLocaleString()}`;
  netPaymentEl.textContent = `$${netPayment.toLocaleString()}`;
  balanceAfterPaymentEl.textContent = `$${balanceAfterPayment.toLocaleString()}`;
}

function setupChartTypeListener() {
  document.getElementById("graph_type-2").addEventListener("change", function () {
    let selectedChartType = this.value;

    if (!latestApiResponse) {
      console.warn("No API response available. Submit the form first.");
      return;
    }

    let transactionType = document.querySelector('[form-input="transaction_type"]').value || "noi";
    let chartData = extractChartData(latestApiResponse, transactionType);

    console.log("Updating chart to:", selectedChartType);
    renderChart(selectedChartType, chartData);
  });
}

function loadRecentPayments() {
  const mode = localStorage.getItem("financeMode") || "profile";
  const target = localStorage.getItem("pageRefreshParam") || null;

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/v4_recent_payments",
    method: "GET",
    headers: { "Authorization": "Bearer " + localStorage.authToken },
    data: { mode: mode, target: target },
    dataType: "json",
    success: function (response) {
      let container = $(".recent-payments-container");
      container.empty();

      response.forEach(payment => {
        let formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
          .format(Math.abs(payment.amount));

        let paymentItem = `
          <div class="recent-payment-item">
            <div class="recent-payment-row top">
              <div data="display_name">${payment.display_name}</div>
              <div data="amount" class="recent-payment-amount">${formattedAmount}</div>
            </div>
            <div class="recent-payment-row bottom">
              <div class="recent-payment-property-info">
                <div data="street">${payment.street}</div>
                <div data="unit_name">${payment.unit_name}</div>
              </div>
              <div data="transaction_date" class="recent-payment-amount">${formatTransDate(payment.transaction_date)}</div>
            </div>
          </div>`;
        container.append(paymentItem);
      });
    },
    error: function (error) {
      console.error("Error fetching recent payments:", error);
    }
  });
}

function fetchStatements() {
  const mode = localStorage.getItem("financeMode") || "profile";
  const target = localStorage.getItem("pageRefreshParam") || null;

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/v4_fetch_statements",
    method: "GET",
    headers: { "Authorization": "Bearer " + localStorage.authToken },
    data: { mode: mode, target: target },
    dataType: "json",
    success: function (data) {
      let container = $(".statements-container");
      container.empty();

      data.forEach(statement => {
        let statementItem = $(`
          <div class="statement-item" style="cursor: pointer;">
            <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/67cbcd7bc256682d3525afb0_document.svg" loading="lazy" alt="" class="statement_icon">
            <div data="statement_title">${statement.display_title}</div>
          </div>
        `);
        statementItem.on("click", function () {
          window.open(statement.download_url, "_blank");
        });
        container.append(statementItem);
      });
    },
    error: function () {
      console.error("Error fetching statements");
    }
  });
}

function generateCustomReport() {
  $('.loader').css('display', 'flex'); // Show loader
  let transactions = [];

  $('#transactionsTable tbody tr').each(function () {
    const cols = $(this).find('td');

    let transaction = {
      transaction_date: cols.eq(0).text(),
      display_name: cols.eq(1).text(),
      street: cols.eq(2).text(),
      unit_name: cols.eq(3).text(),
      type: cols.eq(4).text().toLowerCase(),
      description: cols.eq(5).text(),
      amount: parseFloat(cols.eq(6).text().replace(/[$,]/g, ''))
    };

    transactions.push(transaction);
  });

  // Extract the first and last transaction dates
  let firstDate = transactions.length > 0 ? transactions[0].transaction_date : null;
  let lastDate = transactions.length > 0 ? transactions[transactions.length - 1].transaction_date : null;

  // UI selections
  let sector        = $('#sector option:selected').text().trim();
  let reportType    = $('#type option:selected').text().trim();
  let dateRangeText = $('#date_range option:selected').text().trim();

  // Totals from UI
  let totalRentCollected = $('[data-api="total_rent_collected"]').text().replace(/[$,]/g, '') || "0";
  let totalExpenses      = $('[data-api="total_expenses"]').text().replace(/[$,]/g, '') || "0";
  let noi                = $('[data-api="noi"]').text().replace(/[$,]/g, '') || "0";

  let propertyName = $('.noi-name').text().trim();
  let userName     = localStorage.getItem("displayName") || "";

  // Build file name
  let fileName = '';
  if (dateRangeText.toLowerCase() === 'custom') {
    let startDate = $('#start_date').val();
    let endDate   = $('#end_date').val();
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      $('.loader').hide();
      return;
    }
    fileName = `Custom ${startDate} - ${endDate}`;
  } else {
    fileName = firstDate && lastDate
      ? `${sector} ${dateRangeText}: ${firstDate} - ${lastDate}`
      : `${sector} ${dateRangeText}`;
  }

  // Capture chart
  const dataUrl = captureChartDataURL();
  const chartImageBase64 = dataUrl ? dataUrl.replace(/^data:image\/\w+;base64,/, '') : null;

  let requestData = {
    transactions: transactions,
    file_name: fileName,
    report_type: reportType,
    total_rent_collected: parseFloat(totalRentCollected),
    total_expenses: parseFloat(totalExpenses),
    noi: parseFloat(noi),
    property_name: propertyName,
    user_name: userName,
    chart_image: chartImageBase64
  };

  $.ajax({
    url: localStorage.baseUrl + 'api:rpDXPv3x/v4_generate_report',
    type: 'POST',
    dataType: "json",
    contentType: 'application/json',
    headers: { "Authorization": "Bearer " + localStorage.authToken },
    data: JSON.stringify(requestData),
    success: function (response) {
      let statement_id = response.statement_id;
      alert("Generating your report. Please do not refresh the page.");
      fetchCustomReport(statement_id);
    },
    error: function () {
      alert('Error generating report. Please try again.');
      $('.loader').hide();
    }
  });
}

function fetchCustomReport(statementId) {
  let attempts = 0;
  let maxAttempts = 5;

  let interval = setInterval(() => {
    if (attempts >= maxAttempts) {
      clearInterval(interval);
      $('.loader').hide();
      alert("Report generation is taking longer than expected. Please try again later.");
      return;
    }

    $.ajax({
      url: localStorage.baseUrl + "api:rpDXPv3x/v4_get_custom_report",
      type: 'GET',
      headers: { "Authorization": "Bearer " + localStorage.authToken },
      data: { statement_id: statementId },
      success: function (response) {
        if (response !== null) {
          clearInterval(interval);
          window.open(response, '_blank');
          $('.loader').hide();
        } else {
          attempts++;
        }
      },
      error: function () {
        clearInterval(interval);
        alert("An error occurred while fetching the report. Please try again.");
        $('.loader').hide();
      }
    });
  }, 3000);
}

function v4formatToMonthYear(dateString) {
  const date = new Date(dateString);
  const options = { month: 'short', year: 'numeric', timeZone: 'UTC' };
  return date.toLocaleDateString('en-US', options).toUpperCase();
}

function generateArrearsReport() {
  $('.loader').css('display', 'flex');
  let pageId = localStorage.getItem('pageId');
  let user_id = null;

  if (pageId === 'profile') user_id = parseInt(localStorage.getItem('userProfileRecId'));
  else if (pageId === 'unit') user_id = parseInt(localStorage.getItem('activeTenantUserId'));

  if (!user_id) {
    alert('User ID is missing or invalid.');
    $('.loader').hide();
    return;
  }

  let propertyName = $('[data-profile="unit_property"]').first().text().trim();

  const requestData = { user_id: user_id, property_name: propertyName };

  $.ajax({
    url: localStorage.baseUrl + 'api:rpDXPv3x/v4_generate_arrears_report',
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json',
    headers: { "Authorization": "Bearer " + localStorage.authToken },
    data: JSON.stringify(requestData),
    success: function (response) {
      let statement_id = response.statement_id;
      alert("Generating your arrears report. Please do not refresh the page.");
      fetchArrearsReport(statement_id);
    },
    error: function () {
      alert('Error generating arrears report. Please try again.');
      $('.loader').hide();
    }
  });
}

function fetchArrearsReport(statementId) {
  let attempts = 0;
  let maxAttempts = 5;

  let interval = setInterval(() => {
    if (attempts >= maxAttempts) {
      clearInterval(interval);
      $('.loader').hide();
      alert("Arrears report generation is taking longer than expected. Please try again later.");
      return;
    }

    $.ajax({
      url: localStorage.baseUrl + "api:rpDXPv3x/v4_get_arrears_report",
      type: 'GET',
      headers: { "Authorization": "Bearer " + localStorage.authToken },
      data: { statement_id: statementId },
      success: function (response) {
        if (typeof response === 'string' && response.startsWith('https://')) {
          clearInterval(interval);
          window.open(response, '_blank');
          $('.loader').hide();
        } else {
          attempts++;
        }
      },
      complete: function () {
        if (localStorage.getItem("pageId") === "unit") {
          $("#unit-overview-bttn").trigger("click");
        }
      },
      error: function () {
        clearInterval(interval);
        alert("An error occurred while fetching the arrears report.");
        $('.loader').hide();
      }
    });
  }, 3000);
}

function parseCurrencyToNumber(text) {
  return Number((text || "").replace(/[^0-9.-]/g, "")) || 0;
}

function captureChartDataURL() {
  const canvas = document.getElementById("financeChart");
  if (!canvas) return null;

  const tmp = document.createElement("canvas");
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  const tctx = tmp.getContext("2d");
  tctx.fillStyle = "#ffffff";
  tctx.fillRect(0, 0, tmp.width, tmp.height);
  tctx.drawImage(canvas, 0, 0);

  return tmp.toDataURL("image/png");
}

function exportTransactionsTableToCSV(filename = "transactions.csv") {
  const table = document.querySelector("#transactionsTable");
  if (!table) {
    console.error("Table #transactionsTable not found");
    return;
  }

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  if (!thead || !tbody) return;

  const headerCells = Array.from(thead.querySelectorAll("th")).map(th => th.textContent.trim());
  const rows = [headerCells];

  Array.from(tbody.querySelectorAll("tr")).forEach(tr => {
    const tds = Array.from(tr.querySelectorAll("td"));

    if (tds.length === 1 && /No transactions/i.test(tds[0].textContent)) return;

    const row = tds.map((td, idx) => {
      let text = td.textContent.trim();
      const isAmount = idx === (headerCells.length - 1);
      if (isAmount) text = text.replace(/[^0-9.\-]/g, "");
      if (text.includes('"') || text.includes(',') || text.includes('\n')) {
        text = `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    });

    rows.push(row);
  });

  const csv = rows.map(r => r.join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}