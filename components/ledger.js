/* ===========================
   Ledger (with -0.00 fix)
   =========================== */

document.addEventListener("DOMContentLoaded", function () {

  $(document).on("click", "#unit-overview-bttn", function () {
    const urlParams = new URLSearchParams(window.location.search);
    let unitId = urlParams.get("id");
    fetchTransactions("active-tenant", unitId);
  });

  $("[api-button='unit-ledger']")
    .off("click")
    .click(function () {
      const urlParams = new URLSearchParams(window.location.search);
      let unitId = urlParams.get("id");
      fetchTransactions("active-tenant", unitId);
    });

  $("[api-button='user-ledger']")
    .off("click")
    .click(function () {
      const urlParams = new URLSearchParams(window.location.search);
      let userId = urlParams.get("id");
      fetchTransactions("tenant-user-ledger", userId);
    });

  $("#pay-rent")
    .off("click")
    .click(function () {
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

function formatSignedCurrency(amount) {
  const v = normalizeMoney(amount);
  return v < 0 ? `-${formatCurrency(Math.abs(v))}` : formatCurrency(v);
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
    data: {
      type: type,
      target: target,
    },
    dataType: "json",
    success: function (data) {
      console.log("Ledger API data:", data);
      $(".styled-table tbody").remove();
      updateTable(data);
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function (xhr, textStatus, errorThrown) {
      console.error("Error fetching ledger:", textStatus, errorThrown, xhr.responseText);
    },
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

  const cleanDate = String(input).split("T")[0];
  return new Date(cleanDate + "T00:00:00");
}

function getEasternToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/* ---------------------------
   Table rendering
--------------------------- */
function updateTable(data) {
  console.log("Updating ledger table");

  const $table = $(".styled-table");
  $table.find("tbody").remove();

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  function buildMonthBalanceRow(month, year, balance) {
    return `
      <tr class="month-balance-row" style="background-color: #92EFDD;">
        <td>${monthNames[month]} ${year}</td>
        <td></td>
        <td></td>
        <td>${monthNames[month]} ${year} Balance</td>
        <td></td>
        <td></td>
        <td></td>
        <td>${formatSignedCurrency(balance)}</td>
      </tr>
    `;
  }

  const paymentInits = data.filter(d =>
    d.description && d.description.toLowerCase().includes("initiated")
  );

  function findMatchingInit(record) {
    if (!record || record.type !== "payment") return null;

    if (record.payment_init_id) {
      return paymentInits.find(init =>
        init.payment_init_id && init.payment_init_id === record.payment_init_id
      );
    }

    const completionDate = new Date(record.transaction_date);

    return paymentInits.find(init =>
      init.transaction_id === record.transaction_id &&
      Number(init.amount) === 0 &&
      new Date(init.transaction_date) <= completionDate
    );
  }

  const enriched = data.map(item => {
    const matchedInit = item.type === "payment" ? findMatchingInit(item) : null;

    const effectiveISO =
      item.type === "payment" && !item.manually_entered && matchedInit
        ? matchedInit.transaction_date
        : item.transaction_date;

    const effectiveET = parseDateInEasternTime(effectiveISO);

    return {
      item,
      matchedInit,
      effectiveISO,
      effectiveET,
      runningBalanceAfter: 0
    };
  }).filter(meta => {
    if (meta.item.type !== "payment") return true;

    return meta.item.payment_successful ||
      (meta.item.description && meta.item.description.toLowerCase().includes("failed"));
  });

  // Calculate running balance in true chronological order
  const chronological = [...enriched].sort((a, b) => {
    return (a.effectiveET?.getTime() || 0) - (b.effectiveET?.getTime() || 0);
  });

  let runningBalance = 0;

  chronological.forEach(meta => {
    const item = meta.item;
    const amountNum = Number(item.amount) || 0;
    const absAmt = Math.abs(amountNum);
    const delta = item.type === "charge" ? absAmt : -absAmt;

    runningBalance = normalizeMoney(runningBalance + delta);
    meta.runningBalanceAfter = runningBalance;
  });

  // Group by effective month/year
  const groups = {};

  chronological.forEach(meta => {
    const et = meta.effectiveET || parseDateInEasternTime(meta.item.transaction_date);
    if (!et) return;

    const key = `${et.getFullYear()}-${et.getMonth()}`;

    if (!groups[key]) {
      groups[key] = {
        year: et.getFullYear(),
        month: et.getMonth(),
        items: []
      };
    }

    groups[key].items.push(meta);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [ay, am] = a.split("-").map(Number);
    const [by, bm] = b.split("-").map(Number);
    return ay === by ? am - bm : ay - by;
  });

  const todayET = getEasternToday();
  const todayYear = todayET.getFullYear();

  const yearOrder = [];

  sortedKeys.forEach(k => {
    const yr = groups[k].year;
    if (!yearOrder.includes(yr)) yearOrder.push(yr);
  });

  const renderYearOrder = [...yearOrder].reverse();

  renderYearOrder.forEach(year => {
    const isCurrentYear = year === todayYear;

    const $toggleTbody = $(`<tbody class="year-toggle-tbody"></tbody>`);

    const $toggleRow = $(`
      <tr class="year-accordion-row${isCurrentYear ? "" : " is-collapsed"}" data-year="${year}">
        <td colspan="8">
          ${year}
          <span class="year-accordion-chevron">&#9660;</span>
        </td>
      </tr>
    `);

    $toggleTbody.append($toggleRow);
    $table.append($toggleTbody);

    const $yearTbody = $(`
      <tbody class="year-tbody${isCurrentYear ? "" : " is-collapsed"}" data-year="${year}"></tbody>
    `);

    sortedKeys.forEach(gKey => {
      const group = groups[gKey];
      if (group.year !== year) return;

      group.items.sort((a, b) => {
        return (a.effectiveET?.getTime() || 0) - (b.effectiveET?.getTime() || 0);
      });

      group.items.forEach(meta => {
        const item = meta.item;
        const matchedInit = meta.matchedInit;
        const effectiveISO = meta.effectiveISO;

        const dateInput = formatDate(effectiveISO);
        const completionDate = formatDate(item.transaction_date);

        const billingPeriod = matchedInit
          ? formatBillingPeriod(matchedInit.billing_period)
          : formatBillingPeriod(item.billing_period);

        const amountNum = Number(item.amount) || 0;
        const absAmt = Math.abs(amountNum);

        const hasInvoice = !!item.invoice_url;
        const hasFile = !!item.file;

        let fileIconsHTML = "";

        if (hasInvoice) {
          fileIconsHTML += `<span class="file-icon" data-url="${item.invoice_url}" title="View Invoice" style="margin-left: 6px; cursor: pointer;">📄</span>`;
        }

        if (hasFile) {
          fileIconsHTML += `<span class="file-icon" data-url="${item.file}" title="View File" style="margin-left: 6px; cursor: pointer;">📎</span>`;
        }

        const chargeAmt = item.type === "charge"
          ? formatCurrency(absAmt)
          : "";

        const creditAmt = item.type !== "charge"
          ? formatCurrency(absAmt)
          : "";

        const balanceAmt = formatSignedCurrency(meta.runningBalanceAfter);

        $yearTbody.append(`
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
        `);
      });

      const lastItemInMonth = group.items[group.items.length - 1];

      if (lastItemInMonth) {
        $yearTbody.append(
          buildMonthBalanceRow(
            group.month,
            group.year,
            lastItemInMonth.runningBalanceAfter
          )
        );
      }
    });

    $table.append($yearTbody);
  });

  // Accordion
  $table.off("click", ".year-accordion-row").on("click", ".year-accordion-row", function () {
    const year = $(this).data("year");
    const isCurrentlyCollapsed = $(this).hasClass("is-collapsed");

    $table.find(".year-accordion-row").addClass("is-collapsed");
    $table.find("tbody.year-tbody").addClass("is-collapsed");

    if (isCurrentlyCollapsed) {
      $(this).removeClass("is-collapsed");
      $table.find(`tbody.year-tbody[data-year="${year}"]`).removeClass("is-collapsed");
    }
  });

  // File icons
  $table.off("click", ".file-icon").on("click", ".file-icon", function (e) {
    e.stopPropagation();

    const url = $(this).data("url");

    if (url) {
      window.open(url, "_blank");
    }
  });

  // Balance Due: use latest available month balance in current year
  (function () {
    const currentYear = new Date().getFullYear();

    const $yearTbody = $table.find(`tbody.year-tbody[data-year="${currentYear}"]`);

    if (!$yearTbody.length) {
      return;
    }

    const $balanceRows = $yearTbody.find("tr.month-balance-row");

    if (!$balanceRows.length) {
      return;
    }

    const balanceText = $balanceRows.last().find("td").last().text().trim();

    if (balanceText) {
      $("[data-tenant='current-balance-v2']").text(balanceText);
    }
  })();

  $(".charge-row").css("cursor", "pointer");
  $("[data-file-url]").css("cursor", "pointer");
}

/* ---------------------------
   CSV
--------------------------- */
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

  headerRow.forEach(row => {
    const cols = row.querySelectorAll("th");
    const rowData = [];

    cols.forEach(col => {
      rowData.push(`"${col.innerText}"`);
    });

    csv.push(rowData.join(","));
  });

  dataRows.forEach(row => {
    const cols = row.querySelectorAll("td");
    const rowData = [];

    cols.forEach(col => {
      rowData.push(`"${col.innerText}"`);
    });

    csv.push(rowData.join(","));
  });

  csv = csv.join("\n");
  downloadCSV(csv, filename);
}

/* ---------------------------
   Balances Payment Page
--------------------------- */
function loadBalancesPaymentPage(user) {
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
      $("[data-tenant='current-balance']").text(
        formatCurrency(response.balance)
      );

      $("[data-tenant='next-month-balance']").text(
        formatCurrency(response.next_month_payment)
      );
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function () {
      // handle error as needed
    },
  });
}