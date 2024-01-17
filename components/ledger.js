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
      loadTenantsBalances(localStorage.userId);
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
  if (input === null) return null;
  // Append 'T00:00:00' to ensure it's treated as midnight in Eastern Time
  // and add the Eastern Time Zone abbreviation (EST or EDT)
  const easternTimeDateStr = input + 'T00:00:00-05:00'; // EST is UTC-5, EDT is UTC-4
  return new Date(easternTimeDateStr);
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

  data.forEach((item, index) => {
    const itemDate = new Date(item.transaction_date);
    const itemMonth = itemDate.getMonth();
    runningBalance += item.amount;

    // Check if new month has started
    if (previousMonth !== null && isNewMonth(previousMonth, itemDate)) {
      // Insert end-of-previous-month balance row
      addEndOfMonthRow(previousMonth, runningBalance - item.amount);
    }

    // Insert transaction row
    const chargeClass = item.type === "charge" ? "charge-row" : "";
    const fileUrl = item.type === "charge" ? item.invoice_url : "";
    const newRow = `
      <tr class="${chargeClass}" data-file-url="${fileUrl}">
          <td>${formatBillingPeriod(item.billing_period)}</td>
          <td>${formatDate(item.transaction_date)}</td>
          <td>${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</td>
          <td>${item.description}</td>
          <td>${item.type === "charge" ? `$${item.amount.toFixed(2)}` : ""}</td>
          <td>${item.type !== "charge" ? `$${(-item.amount).toFixed(2)}` : ""}</td>
          <td>$${runningBalance.toFixed(2)}</td>
      </tr>
    `;
    $(".styled-table tbody").append(newRow);

    previousMonth = itemMonth;

    const isLastItem = index === data.length - 1;
    if (isLastItem) {
      // Insert end-of-last-month balance row
      addEndOfMonthRow(itemMonth, runningBalance);
    }
  });

  // Function to add end-of-month balance row
  function addEndOfMonthRow(month, balance) {
    const balanceDate = new Date(new Date().getFullYear(), month, 1);
    const endOfMonthRow = `
      <tr style="background-color: #92EFDD;">
        <td>${formatBillingPeriod(balanceDate)}</td>
        <td></td>
        <td></td>
        <td>End of ${formatBillingPeriod(balanceDate)} Balance</td>
        <td></td>
        <td></td>
        <td>$${balance.toFixed(2)}</td>
      </tr>
    `;
    $(".styled-table tbody").append(endOfMonthRow);
  }

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

function loadTenantsBalances(target) {
  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/get_users_balance",
    type: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      target: target,
    },
    success: function (response) {
      // Update current balance with formatting
      var formattedCurrentBalance = "$" + response.balance.toLocaleString();
      $('[data-tenant="current-balance"]').text(formattedCurrentBalance);

      // Calculate next month's balance
      var nextMonthBalance = 0;
      var currentDate = new Date();
      var nextMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1,
      );

      response.transactions.forEach(function (transaction) {
        var transactionDate = new Date(transaction.transaction_date);
        if (
          transactionDate >= nextMonth &&
          transactionDate <
            new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1)
        ) {
          nextMonthBalance += transaction.amount;
        }
      });

      // Format and update next month's balance
      var formattedNextMonthBalance = "$" + nextMonthBalance.toLocaleString();
      $('[data-tenant="next-month-balance"]').text(formattedNextMonthBalance);
    },
    error: function (error) {
      console.log("Error:", error);
    },
  });
}
