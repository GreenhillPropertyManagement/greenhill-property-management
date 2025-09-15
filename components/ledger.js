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

  // Track which month/year end rows we've added to avoid duplicates
  const addedMonthKeys = new Set();

  const $tbody = $(".styled-table tbody");
  $tbody.empty();

  function addEndOfMonthRow(month, year, balance) {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const displayMonth = monthNames[month];
    const displayYear = year;

    const key = `${month}-${year}`;
    if (addedMonthKeys.has(key)) return; // already rendered
    addedMonthKeys.add(key);

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

  // Build an enriched list using the payment-initiated date when present,
  // then group by month/year and render groups chronologically. This ensures
  // payments initiated in August but completed in September appear in August
  // and that each month balance row is rendered once.
  const enriched = data.map(item => {
    const matchedInit = item.type === "payment" ? findMatchingInit(item) : null;
    const effectiveISO = (item.type === "payment" && !item.manually_entered && matchedInit)
      ? matchedInit.transaction_date
      : item.transaction_date;
    const effectiveET = parseDateInEasternTime(effectiveISO);
    return { item, matchedInit, effectiveISO, effectiveET };
  }).filter(meta => {
    if (meta.item.type !== "payment") return true;
    return meta.item.payment_successful || meta.item.description?.toLowerCase().includes("failed");
  });

  // Group by month/year key (use effectiveET; skip items without dates)
  const groups = {};
  enriched.forEach(meta => {
    const et = meta.effectiveET || parseDateInEasternTime(meta.item.transaction_date);
    if (!et) return;
    const key = `${et.getFullYear()}-${et.getMonth()}`;
    if (!groups[key]) groups[key] = { year: et.getFullYear(), month: et.getMonth(), items: [] };
    groups[key].items.push(meta);
  });

  // Sort group keys chronologically
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [ay, am] = a.split('-').map(Number);
    const [by, bm] = b.split('-').map(Number);
    return ay === by ? am - bm : ay - by;
  });

  // Today in ET for month cut-off (used below)
  const todayET = getEasternToday();
  const todayYear = todayET.getFullYear();
  const todayMonth = todayET.getMonth();

  function isOnOrBeforeCurrentMonth(dateET) {
    const y = dateET.getFullYear();
    const m = dateET.getMonth();
    return (y < todayYear) || (y === todayYear && m <= todayMonth);
  }

  // Render groups in order
  sortedKeys.forEach((gKey, gIndex) => {
    const group = groups[gKey];
    // sort items in group by effectiveET to keep intra-month ordering
    group.items.sort((a, b) => (a.effectiveET?.getTime() || 0) - (b.effectiveET?.getTime() || 0));

    group.items.forEach((meta, index) => {
      const item = meta.item;
      const matchedInit = meta.matchedInit;
      const effectiveISO = meta.effectiveISO;
      const effectiveET = meta.effectiveET;

      const dateInput = formatDate(effectiveISO);
      const completionDate = formatDate(item.transaction_date);
      const billingPeriod = matchedInit ? formatBillingPeriod(matchedInit.billing_period) : formatBillingPeriod(item.billing_period);

      const amountNum = Number(item.amount) || 0;
      const absAmt = Math.abs(amountNum);
      const delta = (item.type === 'charge') ? absAmt : -absAmt;

      if (window && window.console && typeof console.debug === 'function') {
        console.debug('[ledger] row', `${gKey}-${index}`, { id: item.transaction_id || item.id || null, type: item.type, rawAmount: amountNum, absAmt, delta, runningBefore: runningBalance });
      }
      runningBalance = normalizeMoney(runningBalance + delta);
      if (window && window.console && typeof console.debug === 'function') {
        console.debug('[ledger] after', `${gKey}-${index}`, { runningAfter: runningBalance });
      }

      if (effectiveET && isOnOrBeforeCurrentMonth(effectiveET)) {
        currentMonthBalance = normalizeMoney(currentMonthBalance + delta);
      }

      const hasInvoice = !!item.invoice_url;
      const hasFile = !!item.file;
      let fileIconsHTML = "";
      if (hasInvoice) fileIconsHTML += `<span class="file-icon" data-url="${item.invoice_url}" title="View Invoice" style="margin-left: 6px; cursor: pointer;">📄</span>`;
      if (hasFile) fileIconsHTML += `<span class="file-icon" data-url="${item.file}" title="View File" style="margin-left: 6px; cursor: pointer;">📎</span>`;

      const chargeAmt  = (item.type === "charge") ? formatCurrency(normalizeMoney(absAmt)) : "";
      const creditAmt  = (item.type !== "charge") ? formatCurrency(normalizeMoney(absAmt)) : "";
      const balanceAmt = (runningBalance < 0) ? `-${formatCurrency(Math.abs(runningBalance))}` : formatCurrency(runningBalance);

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

      // update previousMonth/Year to the group's month
      previousMonth = group.month;
      previousYear = group.year;
    });

    // after finishing a group, append the month's balance once
    addEndOfMonthRow(group.month, group.year, normalizeMoney(runningBalance));
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