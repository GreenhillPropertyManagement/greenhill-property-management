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
  
  // Interpret the date string as being in Eastern Time
  const date = new Date(input + "T00:00:00Z"); // Treat as UTC to avoid shifting
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); // Normalize for UTC
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
  console.log(`Updating table with data:`, data);
  let runningBalance = 0;
  let previousMonth = null;
  let previousYear = null;

  function formatCurrency(amount) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

  // Function to add end-of-month balance row
  function addEndOfMonthRow(month, year, balance) {
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const displayMonth = monthNames[month];
    const displayYear = year;

    const endOfMonthRow = `
      <tr style="background-color: #92EFDD;">
        <td>${displayMonth} ${displayYear}</td>
        <td></td>
        <td></td>
        <td>${displayMonth} ${displayYear} Balance</td>
        <td></td>
        <td></td>
        <td>${formatCurrency(balance)}</td>
      </tr>
    `;
    $(".styled-table tbody").append(endOfMonthRow);
  }

  data.forEach((item, index) => {
    const itemDate = new Date(item.transaction_date + 'T00:00:00-05:00'); // EST timezone
    const itemMonth = itemDate.getMonth();
    const itemYear = itemDate.getFullYear();
    runningBalance += item.amount;

    if (previousMonth !== null && isNewMonth(previousMonth, itemDate)) {
      addEndOfMonthRow(previousMonth, previousYear, runningBalance - item.amount);
    }

    const chargeClass = item.type === "charge" ? "charge-row" : "";
    const fileUrl = item.type === "charge" ? item.invoice_url : "";
    const newRow = `
      <tr class="${chargeClass}" data-file-url="${fileUrl}">
        <td>${formatBillingPeriod(item.billing_period)}</td>
        <td>${formatDate(item.transaction_date)}</td>
        <td>${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</td>
        <td>${item.description}</td>
        <td>${item.type === "charge" ? formatCurrency(item.amount) : ""}</td>
        <td>${item.type !== "charge" ? formatCurrency(-item.amount) : ""}</td>
        <td>${formatCurrency(runningBalance)}</td>
      </tr>
    `;
    $(".styled-table tbody").append(newRow);

    previousMonth = itemMonth;
    previousYear = itemYear;

    const isLastItem = index === data.length - 1;
    if (isLastItem) {
      addEndOfMonthRow(itemMonth, itemYear, runningBalance);
    }
  });

  // Add click event listener for charge rows
  $(".charge-row").on("click", function () {
    const fileUrl = $(this).data("file-url");
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  });

  // Add cursor style for charge rows
  $(".charge-row").css("cursor", "pointer");
}




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


