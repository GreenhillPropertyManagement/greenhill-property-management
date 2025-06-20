document.addEventListener("DOMContentLoaded", function () {
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
      loadBalancesPaymentPage(localStorage.userRecId);
    });

  // Delegated handler to open file links, runs only once
  $(".styled-table").off("click", ".file-icon").on("click", ".file-icon", function (e) {
    e.stopPropagation();
    const url = $(this).data("url");
    if (url) window.open(url, "_blank");
  });
});

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

  // Click handler for CSV download
  exportButton.click(function () {
    exportTableToCSV(table, "transaction_ledger.csv");
  });
}

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

function isNewMonth(previousMonth, itemDate) {
  return previousMonth !== itemDate.getMonth();
}

function updateTable(data) {
  console.log("Updating table with hybrid payment logic");
  let runningBalance = 0;
  let previousMonth = null;
  let previousYear = null;

  const $tbody = $(".styled-table tbody");
  $tbody.empty();

  function formatCurrency(amount) {
    return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function addEndOfMonthRow(month, year, balance) {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const displayMonth = monthNames[month];
    const displayYear = year;

    const row = `
      <tr style="background-color: #92EFDD;">
        <td>${displayMonth} ${displayYear}</td>
        <td></td>
        <td></td>
        <td>${displayMonth} ${displayYear} Balance</td>
        <td></td>
        <td></td>
        <td></td>
        <td>${formatCurrency(balance)}</td>
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

  rowsToRender.forEach((item, index) => {
    const matchedInit = item.type === "payment" ? findMatchingInit(item) : null;

    let dateInput = formatDate(item.transaction_date);
    let completionDate = formatDate(item.transaction_date);

    if (item.type === "payment" && !item.manually_entered) {
      dateInput = matchedInit ? formatDate(matchedInit.transaction_date) : formatDate(item.transaction_date);
      completionDate = formatDate(item.transaction_date);
    }

    const billingPeriod = matchedInit ? formatBillingPeriod(matchedInit.billing_period) : formatBillingPeriod(item.billing_period);

    if (item.type === "charge" || item.type === "credit") {
      runningBalance += item.amount;
    } else if (item.type === "payment") {
      runningBalance += item.amount;
    }

    if (previousMonth !== null && previousMonth !== new Date(dateInput).getMonth()) {
      addEndOfMonthRow(previousMonth, previousYear, runningBalance - item.amount);
    }

    const chargeClass = item.type === "charge" ? "charge-row" : "";
    const hasInvoice = !!item.invoice_url;
    const hasFile = !!item.file;

    let fileIconsHTML = "";

    if (hasInvoice) {
      fileIconsHTML += `<span class="file-icon" data-url="${item.invoice_url}" title="View Invoice" style="margin-left: 6px; cursor: pointer;">📄</span>`;
    }

    if (hasFile) {
      fileIconsHTML += `<span class="file-icon" data-url="${item.file}" title="View File" style="margin-left: 6px; cursor: pointer;">📎</span>`;
    }

    const row = `
      <tr>
        <td>${billingPeriod}</td>
        <td>${dateInput}</td>
        <td>${completionDate}</td>
        <td>${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</td>
        <td>${item.description || ""}${fileIconsHTML}</td>
        <td>${item.type === "charge" ? formatCurrency(item.amount) : ""}</td>
        <td>${item.type !== "charge" ? formatCurrency(-item.amount) : ""}</td>
        <td>${formatCurrency(runningBalance)}</td>
      </tr>
    `;
    $tbody.append(row);

    previousMonth = new Date(dateInput).getMonth();
    previousYear = new Date(dateInput).getFullYear();

    const isLastItem = index === rowsToRender.length - 1;
    if (isLastItem) {
      addEndOfMonthRow(previousMonth, previousYear, runningBalance);
    }
  });

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
    cols.forEach((col) => rowData.push(`"${col.innerText}"`));
    csv.push(rowData.join(","));
  });

  csv = csv.join("\n");
  downloadCSV(csv, filename);
}

function loadBalancesPaymentPage(user){

  // Ajax to retrieve transactions
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
      $("[data-tenant='current-balance']").text('$' + Number(response.balance).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }));
      $("[data-tenant='next-month-balance']").text('$' + Number(response.next_month_payment).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }));
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function () {

    },
  });

}


