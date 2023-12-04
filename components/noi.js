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
    $(".noi-chart-tab").click(); // default to chart view of compoenent
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
    let month = transaction.transaction_date.substr(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { payments: 0, expenses: 0 };
    }

    let amount = Number(transaction.amount); // Ensure amount is a number

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
  });

  let labels = Object.keys(monthlyData).map(
    (key) => `${monthName(parseInt(key.split("-")[1]))} ${key.split("-")[0]}`,
  );
  let paymentsData = Object.values(monthlyData).map((data) => data.payments);
  let expensesData = Object.values(monthlyData).map((data) => data.expenses);
  let profitsData = paymentsData.map(
    (payment, index) => payment - expensesData[index],
  );

  let processed = { labels, paymentsData, expensesData, profitsData };
  //console.log("Processed data:", processed);
  return processed;
}

function initializeChart(
  { labels, paymentsData, expensesData, profitsData },
  chartId,
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
        },
        {
          label: "Expenses",
          data: expensesData,
          backgroundColor: "#EE2E31",
          order: 2,
        },
        {
          label: "Profit",
          data: profitsData,
          backgroundColor: "#80ed99",
          order: 3,
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
    const date = new Date(transaction.transaction_date);
    const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;

    if (!statements[monthYear]) {
      statements[monthYear] = [];
    }

    statements[monthYear].push(transaction);
  });

  return statements;
}

function renderStatements(statements, allTransactions, componentId) {
  const sortedMonths = Object.keys(statements).sort(
    (a, b) => new Date(b) - new Date(a),
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

function populateTableWithTransactions(transactions, monthYear) {
  const filteredTransactions = transactions.filter((transaction) => {
    const transactionMonthYear = `${new Date(
      transaction.transaction_date,
    ).getFullYear()}-${new Date(transaction.transaction_date).getMonth() + 1}`;
    return transactionMonthYear === monthYear;
  });

  const $tableBody = $('[element="noi-table"] tbody');
  $tableBody.empty(); // Clear existing rows

  filteredTransactions.forEach((transaction) => {
    const formattedChargeAmount =
      transaction.type === "charge" ? `$${transaction.amount.toFixed(2)}` : "";
    const formattedCreditAmount =
      transaction.type === "credit" || transaction.type === "payment"
        ? `-$${transaction.amount.toFixed(2)}`
        : "";

    const billingPeriodDate = new Date(transaction.billing_period);
    const formattedBillingPeriod = `${billingPeriodDate.toLocaleString(
      "default",
      { month: "short" },
    )} ${billingPeriodDate.getFullYear()}`;

    const transactionDate = new Date(transaction.transaction_date);
    const formattedTransactionDate = `${
      transactionDate.getMonth() + 1
    }/${transactionDate.getDate()}/${transactionDate
      .getFullYear()
      .toString()
      .substr(-2)}`;

    const $row = $("<tr>");
    $row.append($("<td>").text(formattedBillingPeriod));
    $row.append($("<td>").text(formattedTransactionDate));
    $row.append($("<td>").text(transaction.type));
    $row.append($("<td>").text(transaction.description));
    $row.append($("<td>").text(formattedChargeAmount));
    $row.append($("<td>").text(formattedCreditAmount));
    $row.append($("<td>").text(transaction.street));
    $row.append($("<td>").text(transaction.unit_name));

    // Check if the row is a charge type and add class and data attribute
    if (transaction.type === "charge") {
      $row.addClass("charge-row");
      $row.data("invoice-url", transaction.invoice_url);
      $row.css("cursor", "pointer"); // Change cursor to pointer for charge rows
    }

    $tableBody.append($row);
  });

  // Add click event listener for charge rows
  $(".charge-row").on("click", function () {
    const invoiceUrl = $(this).data("invoice-url");
    if (invoiceUrl) {
      window.open(invoiceUrl, "_blank");
    }
  });
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
