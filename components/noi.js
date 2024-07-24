var myChart = null;
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
  return '$' + Number(amount).toFixed(2);
}

/* Functions For Statements */

function loadStatements(view, target, componentId) {
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
      const statements = processStatements(transactions);
      renderStatements(statements, transactions, componentId); // Pass the correct transactions array
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error fetching data:", textStatus, errorThrown);
    },
  });
}

function processStatements(transactions) {
  let statements = {};

  transactions.forEach((transaction) => {
    if (transaction.description === "Payment Successful") {
      const date = new Date(transaction.transaction_date + 'T00:00:00-05:00'); // EST timezone
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;

      if (!statements[monthYear]) {
        statements[monthYear] = [];
      }

      statements[monthYear].push(transaction);
    }
  });

  return statements;
}

function renderStatements(statements, allTransactions, componentId) {
  const sortedMonths = Object.keys(statements).sort(
    (a, b) => new Date(b) - new Date(a)
  );
  const $container = $(`${componentId} .dyn-container__noi-statements`);
  const $sampleStatement = $(".noi-sample-wrapper .dyn-item__noi-statement"); // Globally select the sample statement

  // Clear existing content in the container
  $container.empty();

  sortedMonths.forEach((monthYear) => {
    const $statementClone = $sampleStatement.clone();

    $statementClone
      .find(".system-text__main.is--statement")
      .text(`Statement for ${formatMonthYear(monthYear)}`);

    // Attach click event to statement item
    $statementClone.click(function () {
      $(`${componentId} .noi-ledger-tab`).click(); // Use componentId to target specific tab
      populateTableWithTransactions(allTransactions, monthYear, componentId); // Pass the componentId
    });

    $container.append($statementClone);
  });
}

function formatMonthYear(monthYear) {
  const [year, month] = monthYear.split("-");
  return `${new Date(year, month - 1).toLocaleString("default", {
    month: "long",
  })} ${year}`;
}

function populateTableWithTransactions(transactions, monthYear, componentId) {
  const $tableBody = $(`${componentId} [element="noi-table"] tbody`);
  $tableBody.empty(); // Clear existing rows

  transactions.forEach((transaction) => {
    const transactionDate = new Date(transaction.transaction_date + 'T00:00:00-05:00'); // Adjusted for Eastern Time Zone
    const transactionMonthYear = `${transactionDate.getFullYear()}-${transactionDate.getMonth() + 1}`;

    if (transactionMonthYear === monthYear && transaction.description === "Payment Successful") {
      const $row = $("<tr>");

      $row.append($("<td>").text(transaction.transaction_date));
      $row.append($("<td>").text(transaction.street));
      $row.append($("<td>").text(transaction.unit_name));
      $row.append($("<td>").text(transaction.tenant_info.display_name));
      $row.append($("<td>").text(formatCurrency(transaction.amount)));

      $tableBody.append($row);
    }
  });
}

function formatCurrency(amount) {
  return '$' + Number(amount).toFixed(2);
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