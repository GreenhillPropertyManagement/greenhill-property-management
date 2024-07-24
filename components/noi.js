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
