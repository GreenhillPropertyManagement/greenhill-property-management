/* ===========================
   Ledger (with -0.00 fix)
   =========================== */

document.addEventListener("DOMContentLoaded", function () {

  $(document).on("click", "#unit-overview-bttn", function () {
    const urlParams = new URLSearchParams(window.location.search);
    let unitId = urlParams.get("id");
    fetchTransactions("active-tenant", unitId);
  });

  $("[api-button='unit-ledger']").off("click").click(function () {
    const urlParams = new URLSearchParams(window.location.search);
    let unitId = urlParams.get("id");
    fetchTransactions("active-tenant", unitId);
  });

  $("[api-button='user-ledger']").off("click").click(function () {
    const urlParams = new URLSearchParams(window.location.search);
    let userId = urlParams.get("id");
    fetchTransactions("tenant-user-ledger", userId);
  });

  $("#pay-rent").off("click").click(function () {
    fetchTransactions("tenant-user-ledger", localStorage.userId);
    loadBalancesPaymentPage(localStorage.userRecId);
  });

  $(".styled-table").off("click", ".file-icon").on("click", ".file-icon", function (e) {
    e.stopPropagation();
    const url = $(this).data("url");
    if (url) window.open(url, "_blank");
  });
});

/* ---------------------------
   Money helpers
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

/* ---------------------------
   Fetch
   --------------------------- */
function fetchTransactions(type, target) {
  $(".loader").css("display", "flex");

  const table = document.querySelector(".styled-table");
  const exportButton = $("[element='download-csv-button']");

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/get_ledger_transactions",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: { type, target },
    dataType: "json",
    success: function (data) {
      $(".styled-table tbody").empty();
      updateTable(data);
    },
    complete: function () {
      $(".loader").hide();
    }
  });

  exportButton.off("click").on("click", function () {
    exportTableToCSV(table, "transaction_ledger.csv");
  });
}

/* ---------------------------
   Time helpers
   --------------------------- */
function parseDateInEasternTime(input) {
  if (!input) return null;
  let date = new Date(input + "T00:00:00");

  let estOffset = -5 * 60;
  let edtOffset = -4 * 60;

  let jan = new Date(date.getFullYear(), 0, 1);
  let jul = new Date(date.getFullYear(), 6, 1);
  let dstOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  let isDST = date.getTimezoneOffset() < dstOffset;

  let offset = isDST ? edtOffset : estOffset;
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + offset);

  return date;
}

function formatDate(input) {
  const date = parseDateInEasternTime(input);
  if (!date) return "";
  return `${("0" + (date.getMonth() + 1)).slice(-2)}/${("0" + date.getDate()).slice(-2)}/${date.getFullYear().toString().substr(2,2)}`;
}

function formatBillingPeriod(input) {
  const date = parseDateInEasternTime(input);
  if (!date) return "";
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/* ---------------------------
   Table rendering
   --------------------------- */
function updateTable(data) {

  let runningBalance = 0;
  const addedMonthKeys = new Set();

  const $table = $(".styled-table");
  $table.find("tbody").remove();

  const paymentInits = data.filter(d => d.description?.toLowerCase().includes("initiated"));

  function findMatchingInit(record) {
    if (!record || record.type !== "payment") return null;
    if (record.payment_init_id) {
      return paymentInits.find(init => init.payment_init_id === record.payment_init_id);
    }
    return null;
  }

  // -------------------------
  // ENRICH
  // -------------------------
  const enriched = data.map(item => {
    const matchedInit = item.type === "payment" ? findMatchingInit(item) : null;
    const effectiveISO = matchedInit ? matchedInit.transaction_date : item.transaction_date;
    const effectiveET = parseDateInEasternTime(effectiveISO);
    return { item, matchedInit, effectiveISO, effectiveET };
  });

  // -------------------------
  // 🔥 FIX: CALCULATE TRUE BALANCE FIRST
  // -------------------------
  const chronological = [...enriched].sort((a, b) => {
    return (a.effectiveET?.getTime() || 0) - (b.effectiveET?.getTime() || 0);
  });

  let trueRunningBalance = 0;

  chronological.forEach(meta => {
    const amount = Math.abs(Number(meta.item.amount) || 0);
    const delta = meta.item.type === "charge" ? amount : -amount;

    trueRunningBalance = normalizeMoney(trueRunningBalance + delta);

    meta.runningBalance = trueRunningBalance; // 🔥 store it
  });

  // -------------------------
  // GROUPING
  // -------------------------
  const groups = {};
  chronological.forEach(meta => {
    const et = meta.effectiveET;
    const key = `${et.getFullYear()}-${et.getMonth()}`;
    if (!groups[key]) groups[key] = { year: et.getFullYear(), month: et.getMonth(), items: [] };
    groups[key].items.push(meta);
  });

  const sortedKeys = Object.keys(groups).sort();

  const yearOrder = [];
  sortedKeys.forEach(k => {
    const yr = groups[k].year;
    if (!yearOrder.includes(yr)) yearOrder.push(yr);
  });

  yearOrder.reverse();

  // -------------------------
  // RENDER
  // -------------------------
  yearOrder.forEach(year => {

    const $toggleTbody = $(`<tbody></tbody>`);
    $toggleTbody.append(`<tr class="year-accordion-row" data-year="${year}"><td colspan="8">${year}</td></tr>`);
    $table.append($toggleTbody);

    const $yearTbody = $(`<tbody class="year-tbody" data-year="${year}"></tbody>`);

    sortedKeys.forEach(gKey => {
      const group = groups[gKey];
      if (group.year !== year) return;

      group.items.forEach(meta => {

        const item = meta.item;

        const chargeAmt = item.type === "charge" ? formatCurrency(item.amount) : "";
        const creditAmt = item.type !== "charge" ? formatCurrency(item.amount) : "";

        const balanceAmt = meta.runningBalance < 0
          ? `-${formatCurrency(Math.abs(meta.runningBalance))}`
          : formatCurrency(meta.runningBalance);

        $yearTbody.append(`
          <tr>
            <td>${formatBillingPeriod(item.billing_period)}</td>
            <td>${formatDate(meta.effectiveISO)}</td>
            <td>${formatDate(item.transaction_date)}</td>
            <td>${item.type}</td>
            <td>${item.description || ""}</td>
            <td>${chargeAmt}</td>
            <td>${creditAmt}</td>
            <td>${balanceAmt}</td>
          </tr>
        `);
      });

      // 🔥 FIX month balance row
      const lastItem = group.items[group.items.length - 1];

      $yearTbody.append(`
        <tr style="background-color:#92EFDD;">
          <td>${group.month + 1}/${group.year}</td>
          <td></td><td></td>
          <td>${group.month + 1}/${group.year} Balance</td>
          <td></td><td></td><td></td>
          <td>${formatCurrency(lastItem.runningBalance)}</td>
        </tr>
      `);
    });

    $table.append($yearTbody);
  });

  // -------------------------
  // KEEP YOUR DOM BALANCE (unchanged)
  // -------------------------
  (function () {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthName = today.toLocaleString("en-US", { month: "long" });

    const $yearTbody = $(`tbody.year-tbody[data-year="${currentYear}"]`);
    if (!$yearTbody.length) return;

    let balanceText = null;

    $yearTbody.find("tr").each(function () {
      const $row = $(this);
      const firstCell = $row.find("td").first().text().trim();
      const labelCell = $row.find("td").eq(3).text().trim();

      if (
        firstCell.startsWith(currentMonthName) &&
        labelCell.includes("Balance")
      ) {
        balanceText = $row.find("td").last().text().trim();
      }
    });

    if (balanceText) {
      $("[data-tenant='current-balance-v2']").text(balanceText);
    }
  })();
}