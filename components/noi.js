var myChart = null;
var originalTransactions = [];

document.addEventListener("DOMContentLoaded", function () {
  // landlord dashboard on login
  $("#dashboard").click(function () {
    $(".loader").css("display", "flex");
    $(".noi__component").show();
    let target = localStorage.userId;
    loadNoiTransactions("user", target, "dashboard-chart");
    //loadStatements(landlord);
  });

  // landlord profile page - NOI
  $("[api-button='landlord-noi']").click(function () {
    $(".loader").css("display", "flex");
    $(".noi__component").show();
    const urlParams = new URLSearchParams(window.location.search);
    let target = urlParams.get("id");
    loadNoiTransactions("user", target, "profile-chart");
    loadStatements("user", target, "#noi-user");
  });

  // Property Page - NOI
  $("[component-link='noi']").click(function () {
    $(".noi-chart-tab").click(); // default to chart view of component
    $(".loader").css("display", "flex");
    $(".noi__component").show();
    const urlParams = new URLSearchParams(window.location.search);
    let target = urlParams.get("id");
    loadNoiTransactions("property", target, "property-chart");
    loadStatements("property", target, "#noi-property");
  });

  // NOI Ledger Back Button
  $("[noi-ledger='back-button']").click(function () {
    $(".noi-chart-tab").click();
  });

  // Download NOI CSV button click
  $('[element="download-noi-csv"]').click(function () {
    const csvData = convertTableToCSV($('[element="noi-table"]'));
    downloadCSV(csvData, "noi-data.csv");
  });

  // Event listener for table row clicks to populate transaction details
  $(document).on('click', 'table[element="noi-table"] tbody tr', function () {
    const transactionId = $(this).attr('data-transaction-id');
    populateTransactionDetails(transactionId);
  });

  // Ensure that the modal opens when elements with element="modal" are clicked
  $(document).on('click', '[element="modal"]', function () {
    const modalId = $(this).attr('modal');
    // Assuming a function openModal(modalId) exists to handle the modal opening
    openModal(modalId);
  });
});

/* Functions For NOI Chart */

function loadNoiTransactions(view, target, canvas) {
  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/landlord_noi",
    method: "GET",
    dataType: "json",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      target: target,
      view: view,
    },
    success: function (transactions) {
      originalTransactions = transactions; // Store the original transactions
      // Process the transactions and initialize the chart
      const processedData = processTransactions(transactions);
      initializeChart(processedData, canvas);
      // Populate the table with transactions
      populateTable(transactions);
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error fetching data:", textStatus, errorThrown);
    },
  });
}

function monthName(monthNumber) {
  const months = [
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
  return months[monthNumber - 1];
}

function processTransactions(transactions) {
  let monthlyData = {};

  transactions.forEach((transaction) => {
    if (transaction.description === "Payment Successful") {
      let month = transaction.transaction_date.substr(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { payments: 0, expenses: 0 };
      }

      let amount = Math.abs(Number(transaction.amount)); // Convert amount to absolute value

      if (
        transaction.recipient_type === "tenant" &&
        transaction.type === "payment"
      ) {
        monthlyData[month].payments += amount;
      } else if (
        transaction.recipient_type === "landlord" &&
        (transaction.type === "charge" || transaction.type === "credit")
      ) {
        monthlyData[month].expenses += amount;
      }
    }
  });

  let labels = Object.keys(monthlyData).map(
    (key) => `${monthName(parseInt(key.split("-")[1]))} ${key.split("-")[0]}`
  );
  let paymentsData = Object.values(monthlyData).map((data) => data.payments);
  let expensesData = Object.values(monthlyData).map((data) => data.expenses);
  let profitsData = paymentsData.map(
    (payment, index) => payment - expensesData[index]
  );

  let processed = { labels, paymentsData, expensesData, profitsData };
  return processed;
}

function initializeChart(
  { labels, paymentsData, expensesData, profitsData },
  chartId
) {
  const ctx = document.getElementById(chartId).getContext("2d");

  // Destroy the existing chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  // Create a new chart instance
  myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Payments",
          data: paymentsData,
          backgroundColor: "#1F154A",
          order: 1,
          minBarLength: 3, // Minimum bar length in pixels
        },
        {
          label: "Expenses",
          data: expensesData,
          backgroundColor: "#EE2E31",
          order: 2,
          minBarLength: 3, // Minimum bar length in pixels
        },
        {
          label: "Profit",
          data: profitsData,
          backgroundColor: "#80ed99",
          order: 3,
          minBarLength: 3, // Minimum bar length in pixels
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "$" + value;
            },
          },
        },
      },
    },
  });
}

// New function to populate the table
function populateTable(transactions) {
  const tableBody = document.querySelector('table[element="noi-table"] tbody');
  tableBody.innerHTML = ''; // Clear existing table rows

  transactions.forEach((transaction) => {
    if (transaction.description === "Payment Successful") {
      const row = document.createElement("tr");

      // Add data attributes to the row
      row.setAttribute('element', 'modal');
      row.setAttribute('modal', 'transaction-detail-modal');
      row.setAttribute('data-transaction-id', transaction.transaction_id);

      const dateCell = document.createElement("td");
      dateCell.textContent = transaction.transaction_date;
      row.appendChild(dateCell);

      const propertyCell = document.createElement("td");
      propertyCell.textContent = transaction.street;
      row.appendChild(propertyCell);

      const unitCell = document.createElement("td");
      unitCell.textContent = transaction.unit_name;
      row.appendChild(unitCell);

      const tenantCell = document.createElement("td");
      tenantCell.textContent = transaction.tenant_info.display_name;
      row.appendChild(tenantCell);

      const paymentCell = document.createElement("td");
      paymentCell.textContent = formatCurrency(transaction.amount);
      row.appendChild(paymentCell);

      tableBody.appendChild(row);
    }
  });
}

function formatCurrency(amount) {
  return '$' + Math.abs(Number(amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function populateTransactionDetails(transactionId) {
  const relatedTransactions = originalTransactions.filter(
    (transaction) => transaction.transaction_id === transactionId && transaction.description !== "Payment Successful"
  );

  const mgFeeTransaction = relatedTransactions.find(transaction =>
    transaction.description.includes("Greenhill Property Management Fee")
  );

  const fundsTransferredTransaction = relatedTransactions.find(transaction =>
    transaction.description.includes("Funds Transferred")
  );

  if (mgFeeTransaction) {
    document.querySelector('[data=mg-fee]').textContent = formatCurrency(mgFeeTransaction.amount);
  }

  if (fundsTransferredTransaction) {
    document.querySelector('[data=funds-transferred]').textContent = formatCurrency(fundsTransferredTransaction.amount);
    document.querySelector('[data=transfer-date]').textContent = fundsTransferredTransaction.transaction_date;
  }
}

function convertTableToCSV($table) {
  let csv = [];
  $table.find("tr").each(function () {
    let row = [];
    $(this)
      .find("th, td")
      .each(function () {
        let text = $(this).text().replace(/"/g, '""'); // Handle quotes
        row.push(`"${text}"`);
      });
    csv.push(row.join(","));
  });
  return csv.join("\n");
}

function downloadCSV(csvData, filename) {
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}