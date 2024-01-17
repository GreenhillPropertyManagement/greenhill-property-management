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

function formatDate(input) {
  if (input === null) return "";
  const date = new Date(input);
  const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  const day = ("0" + utcDate.getDate()).slice(-2);
  const month = ("0" + (utcDate.getMonth() + 1)).slice(-2);
  const year = utcDate.getFullYear().toString().substr(2, 2);
  return `${month}/${day}/${year}`;
}

function formatBillingPeriod(input) {
  if (input === null) return "";
  const date = new Date(input);
  const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[utcDate.getMonth()];
  const year = utcDate.getFullYear();
  return `${month} ${year}`;
}

function isNewMonth(currentMonth, itemDate) {
  const itemMonth = itemDate.getMonth();
  const itemDay = itemDate.getDate();
  return currentMonth !== itemMonth || itemDay === 1;
}

function updateTable(data) {
  console.log(`Updating table with data:`, data);
  let runningBalance = 0;
  let currentMonth = null;
  let previousMonthBalance = 0;

  data.forEach((item, index) => {
    runningBalance += item.amount;

    const itemDate = new Date(item.transaction_date);
    const itemMonth = itemDate.getMonth();

    if (currentMonth === null) {
      currentMonth = itemMonth;
    }

    // Check if the transaction month has changed
    const isNewMonth = currentMonth !== itemMonth;
    if (isNewMonth) {
      // Insert the previous month's balance row
      const previousMonthDate = new Date(itemDate.getFullYear(), itemMonth - 1, 1);
      const previousMonthRow = `
        <tr>
          <td>${formatBillingPeriod(previousMonthDate)}</td>
          <td></td>
          <td></td>
          <td>${formatBillingPeriod(previousMonthDate)} Balance</td>
          <td></td>
          <td></td>
          <td>$${previousMonthBalance.toFixed(2)}</td>
        </tr>
      `;
      $(".styled-table tbody").append(previousMonthRow);

      currentMonth = itemMonth;
      previousMonthBalance = runningBalance;
    }

    // Insert the current transaction row
    const chargeClass = item.type === "charge" ? "charge-row" : "";
    const fileUrl = item.type === "charge" ? item.invoice_url : "";
    const newRow = `
      <tr class="${chargeClass}" data-file-url="${fileUrl}">
          <td>${formatBillingPeriod(item.billing_period)}</td>
          <td>${formatDate(item.transaction_date)}</td>
          <td>${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</td>
          <td>${item.description}</td>
          <td>${item.type === "charge" ? `$${item.amount.toFixed(2)}` : ""}</td>
          <td>${item.type !== "charge" ? `$${item.amount.toFixed(2)}` : ""}</td>
          <td>$${runningBalance.toFixed(2)}</td>
      </tr>
    `;
    $(".styled-table tbody").append(newRow);

    // Check if this is the last item or the next item is in a new month
    const isLastItem = index === data.length - 1;
    const isNextMonth = isLastItem || new Date(data[index + 1]?.transaction_date).getMonth() !== itemMonth;

    if (isNextMonth) {
      // Insert the end-of-month balance row
      const endOfMonthRow = `
        <tr style="background-color: #92EFDD;">
          <td>${formatBillingPeriod(item.billing_period)}</td>
          <td></td>
          <td></td>
          <td>End of ${formatBillingPeriod(item.billing_period)} Balance</td>
          <td></td>
          <td></td>
          <td>$${runningBalance.toFixed(2)}</td>
        </tr>
      `;
      $(".styled-table tbody").append(endOfMonthRow);
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
