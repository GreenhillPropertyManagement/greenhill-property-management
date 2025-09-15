/* ===========================
   Ledger (with -0.00 fix)
   =========================== */

document.addEventListener("DOMContentLoaded", function () {

  // init ledger on main unit page (load current balance)
  $(document).on("click", "#unit-overview-bttn", function () {
      const urlParams = new URLSearchParams(window.location.search);
      let unitId = urlParams.get("id");
      fetchTransactions("active-tenant", unitId);
  });

  // Ledger Button Clicked - Unit Page
  $("[api-button='unit-ledger']")
    .off("click")
    .click(function () {
      const urlParams = new URLSearchParams(window.location.search);
      let unitId = urlParams.get("id");
      fetchTransactions("active-tenant", unitId);
    });

  // Ledger Button Clicked - Profile Page
  $("[api-button='user-ledger']")
    .off("click")
    .click(function () {
      const urlParams = new URLSearchParams(window.location.search);
      let userId = urlParams.get("id");
      fetchTransactions("tenant-user-ledger", userId);
    });

  // Ledger Button Clicked - Tenant Profile > Pay Rent
  $("#pay-rent")
    .off("click")
    .click(function () {
      fetchTransactions("tenant-user-ledger", localStorage.userId);
      // v1 is fetched from API here; v2 is computed from the ledger in updateTable()
      loadBalancesPaymentPage(localStorage.userRecId);
    });

  // Delegated handler to open file links, runs only once
  $(".styled-table").off("click", ".file-icon").on("click", ".file-icon", function (e) {
    e.stopPropagation();
    const url = $(this).data("url");
    if (url) window.open(url, "_blank");
  });
});

/* ---------------------------
   Money helpers (GLOBAL)
   - Kills -0.00 via rounding
   - Use for all math & display
   --------------------------- */
function roundToCents(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function normalizeMoney(n) {
  const r = roundToCents(n);
  return Object.is(r, -0) ? 0 : r;
}
function formatCurrency(amount) {
  const v = normalizeMoney(amount);
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function fetchTransactions(type, target) {
  $(".loader").css("display", "flex");

  // variables for csv download
  const table = document.querySelector(".styled-table");
  const exportButton = $("[element='download-csv-button']");

  // Ajax to retrieve transactions
  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/get_ledger_transactions",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      type: type,
      target: target,
    },
    dataType: "json",
    success: function (data) {
      $(".styled-table tbody").empty();
      updateTable(data);
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function (xhr, textStatus, errorThrown) {
      console.error("Error fetching data:", textStatus, errorThrown);
    },
  });

  // Click handler for CSV download (prevent duplicates)
  exportButton.off("click").on("click", function () {
    exportTableToCSV(table, "transaction_ledger.csv");
  });
}

/* ---------------------------
   Time helpers (ET handling)
   --------------------------- */
function parseDateInEasternTime(input) {
  if (!input) return null;

  // Create a date object assuming it's in local time (prevents shifting)
  let date = new Date(input + "T00:00:00");

  // Convert to Eastern Time manually
  let estOffset = -5 * 60; // EST (UTC-5)
  let edtOffset = -4 * 60; // EDT (UTC-4, during daylight saving)

  let jan = new Date(date.getFullYear(), 0, 1);
  let jul = new Date(date.getFullYear(), 6, 1);
  let dstOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  let isDST = date.getTimezoneOffset() < dstOffset;

  let offset = isDST ? edtOffset : estOffset;
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + offset);

  return date;
}

function getEasternToday() {
  const iso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return parseDateInEasternTime(iso);
}

function formatDate(input) {
  const date = parseDateInEasternTime(input);
  if (!date) return "";

  const day = ("0" + date.getDate()).slice(-2);
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear().toString().substr(2, 2);
  
  return `${month}/${day}/${year}`;
}

function formatBillingPeriod(input) {
  const date = parseDateInEasternTime(input);
  if (!date) return "";
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${month} ${year}`;
}

/* ---------------------------
   Table rendering
   --------------------------- */
function updateTable(data) {
  console.log("Updating table with hybrid payment logic");
  let runningBalance = 0;         // running balance over all rows
  let currentMonthBalance = 0;    // v2: balance through current ET month only

  let previousMonth = null;
  let previousYear = null;

  const $tbody = $(".styled-table tbody");
  $tbody.empty();

  function addEndOfMonthRow(month, year, balance) {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const displayMonth = monthNames[month];
    const displayYear = year;

    const formatted = (balance < 0)
      ? `-${formatCurrency(Math.abs(balance))}`
      : formatCurrency(balance);

    const row = `
      <tr style="background-color: #92EFDD;">
        <td>${displayMonth} ${displayYear}</td>
        <td></td>
        <td></td>
        <td>${displayMonth} ${displayYear} Balance</td>
        <td></td>
        <td></td>
        <td></td>
  <td>${formatted}</td>
      </tr>
    `;
    $tbody.append(row);
  }

  const paymentInits = data.filter(d => d.description?.toLowerCase().includes("initiated"));

  function findMatchingInit(record) {
    if (!record || record.type !== "payment") return null;
    if (record.payment_init_id) {
      return paymentInits.find(init => init.payment_init_id && init.payment_init_id === record.payment_init_id);
    }
    const completionDate = new Date(record.transaction_date);
    return paymentInits.find(init =>
      init.transaction_id === record.transaction_id &&
      init.amount === 0 &&
      new Date(init.transaction_date) <= completionDate
    );
  }

  const rowsToRender = data.filter(item => {
    if (item.type !== "payment") return true;
    return item.payment_successful || item.description?.toLowerCase().includes("failed");
  });

  // Today in ET for month cut-off
  const todayET = getEasternToday();
  const todayYear = todayET.getFullYear();
  const todayMonth = todayET.getMonth(); // 0..11

  function isOnOrBeforeCurrentMonth(dateET) {
    const y = dateET.getFullYear();
    const m = dateET.getMonth();
    return (y < todayYear) || (y === todayYear && m <= todayMonth);
  }

  rowsToRender.forEach((item, index) => {
    const matchedInit = item.type === "payment" ? findMatchingInit(item) : null;

    // Effective date (ET) for grouping & month comparisons:
    // - for gateway payments (not manually entered): use the init date if available
    // - otherwise, use the record’s transaction_date
    const effectiveISO = (item.type === "payment" && !item.manually_entered && matchedInit)
      ? matchedInit.transaction_date
      : item.transaction_date;

    const effectiveET = parseDateInEasternTime(effectiveISO);

    const dateInput = formatDate(effectiveISO);               // shown input date (MM/DD/YY)
    const completionDate = formatDate(item.transaction_date); // shown completion date (MM/DD/YY)
    const billingPeriod = matchedInit
      ? formatBillingPeriod(matchedInit.billing_period)
      : formatBillingPeriod(item.billing_period);

    // --- running balances (normalize every step)
    // Use absolute values to determine delta so that charges always add and
    // payments/credits always subtract regardless of how the API signs amounts.
    const amountNum = Number(item.amount) || 0;
    const absAmt = Math.abs(amountNum);
    const delta = (item.type === 'charge') ? absAmt : -absAmt;
    // Debug: trace calculation for each row
    if (window && window.console && typeof console.debug === 'function') {
      console.debug('[ledger] row', index, {
        id: item.transaction_id || item.id || null,
        type: item.type,
        rawAmount: amountNum,
        absAmt: absAmt,
        delta: delta,
        runningBefore: runningBalance
      });
    }
    runningBalance = normalizeMoney(runningBalance + delta);
    if (window && window.console && typeof console.debug === 'function') {
      console.debug('[ledger] after', index, { runningAfter: runningBalance });
    }

    // v2: include only items on/before current month in ET
    if (effectiveET && isOnOrBeforeCurrentMonth(effectiveET)) {
      currentMonthBalance = normalizeMoney(currentMonthBalance + delta);
    }

    // End-of-month row when month changes (use balance BEFORE this row)
    if (previousMonth !== null && effectiveET && previousMonth !== effectiveET.getMonth()) {
      const prevBalance = normalizeMoney(runningBalance - delta);
      if (window && window.console && typeof console.debug === 'function') {
        console.debug('[ledger] endOfMonth', { month: previousMonth, year: previousYear, prevBalance });
      }
      addEndOfMonthRow(previousMonth, previousYear, prevBalance);
    }

    const hasInvoice = !!item.invoice_url;
    const hasFile = !!item.file;

    let fileIconsHTML = "";
    if (hasInvoice) {
      fileIconsHTML += `<span class="file-icon" data-url="${item.invoice_url}" title="View Invoice" style="margin-left: 6px; cursor: pointer;">📄</span>`;
    }
    if (hasFile) {
      fileIconsHTML += `<span class="file-icon" data-url="${item.file}" title="View File" style="margin-left: 6px; cursor: pointer;">📎</span>`;
    }

  // --- amounts for this row (normalized to kill -0.00)
  // Display positive values in the ledger columns (use absAmt).
  const chargeAmt  = (item.type === "charge") ? formatCurrency(normalizeMoney(absAmt)) : "";
  const creditAmt  = (item.type !== "charge") ? formatCurrency(normalizeMoney(absAmt)) : "";
    const balanceAmt = (runningBalance < 0)
      ? `-${formatCurrency(Math.abs(runningBalance))}`
      : formatCurrency(runningBalance);

    const row = `
      <tr>
        <td>${billingPeriod}</td>
        <td>${dateInput}</td>
        <td>${completionDate}</td>
        <td>${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</td>
        <td>${item.description || ""}${fileIconsHTML}</td>
        <td>${chargeAmt}</td>
        <td>${creditAmt}</td>
        <td>${balanceAmt}</td>
      </tr>
    `;
    $tbody.append(row);

    if (effectiveET) {
      previousMonth = effectiveET.getMonth();
      previousYear = effectiveET.getFullYear();
    }

    const isLastItem = index === rowsToRender.length - 1;
    if (isLastItem && previousMonth !== null) {
      if (window && window.console && typeof console.debug === 'function') {
        console.debug('[ledger] finalEndOfMonth', { month: previousMonth, year: previousYear, finalBalance: normalizeMoney(runningBalance) });
      }
  addEndOfMonthRow(previousMonth, previousYear, normalizeMoney(runningBalance));
    }
  });

  // v2 OUTPUT: client-computed balance through current month (ET)
  $("[data-tenant='current-balance-v2']").text(
    (currentMonthBalance < 0)
      ? `-${formatCurrency(Math.abs(currentMonthBalance))}`
      : formatCurrency(currentMonthBalance)
  );

  // Attach handlers
  $("[data-file-url]").on("click", function () {
    const fileUrl = $(this).data("file-url");
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  });

  $(".charge-row").css("cursor", "pointer");
  $("[data-file-url]").css("cursor", "pointer");
} // END updateTable

/* --- Download CSV Functionality ---- */

function downloadCSV(csv, filename) {
  const csvFile = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(csvFile);
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function exportTableToCSV(table, filename) {
  const headerRow = table.querySelectorAll("thead tr");
  const dataRows = table.querySelectorAll("tbody tr");
  let csv = [];

  // Add header row to CSV
  headerRow.forEach((row) => {
    const cols = row.querySelectorAll("th");
    const rowData = [];
    cols.forEach((col) => rowData.push(`"${col.innerText}"`));
    csv.push(rowData.join(","));
  });

  // Add data rows to CSV
  dataRows.forEach((row) => {
    const cols = row.querySelectorAll("td");
    const rowData = [];
    cols.forEach((col, idx) => {
      // For Amount columns (last 3 cells), preserve text as-is; CSV consumers can parse
      rowData.push(`"${col.innerText}"`);
    });
    csv.push(rowData.join(","));
  });

  csv = csv.join("\n");
  downloadCSV(csv, filename);
}

/* ---------------------------
   Balances (Payment Page)
   --------------------------- */
function loadBalancesPaymentPage(user){
  // v1: retrieve balances from API (preserves your original behavior)
  $.ajax({
    url: localStorage.baseUrl + "api:sElUkr6t/get_balances_payment_page",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      user_id: user,
    },
    dataType: "json",
    success: function (response) {
      // Use formatCurrency to normalize/format (kills -0.00)
      $("[data-tenant='current-balance']").text(
        formatCurrency(response.balance)
      );

      $("[data-tenant='next-month-balance']").text(
        formatCurrency(response.next_month_payment)
      );

      // Note: v2 is set in updateTable() from ledger rows.
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function () {
      // handle error as needed
    },
  });
}