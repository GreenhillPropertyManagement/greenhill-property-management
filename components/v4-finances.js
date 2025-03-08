// UPDATED CODE

let chartFinanceInstance = null; // Store finance chart instance globally
let latestFinanceApiResponse = null; // Store the latest API response

document.addEventListener("DOMContentLoaded", function() {
    initFinanceComponent(); // Init finance component
    setupFinanceChartTypeListener(); // Allow users to change chart type dynamically
    loadFinanceRecentPayments(); // Load recent payments
    fetchFinanceStatements(); // Fetch user's statements
});

function initFinanceComponent() {
    $('[api-form="finance-filter"]').on("submit", function(event) {
        event.preventDefault(); // Prevent default form submission

        let form = $(this);
        let loader = $('.loader');
        let submitButton = form.find('input[type="submit"]');

        loader.css('display', 'flex'); // Show loader
        submitButton.prop("disabled", true); // Disable submit button

        let formData = {}; // Collect form data
        form.find('[form-input]').each(function() {
            let key = $(this).attr("form-input");
            let value = $(this).val();
            
            if (key === "start_date" || key === "end_date") {
                value = value.trim() === "" ? null : value;
            }
            formData[key] = value;
        });

        // Make the AJAX request
        $.ajax({
            url: localStorage.baseUrl + "api:rpDXPv3x/v4_landlord_finances",
            type: "GET",
            headers: {
                "Authorization": "Bearer " + localStorage.authToken
            },
            data: formData,
            contentType: "application/json",
            dataType: "json",
            success: function(response) {
                console.log("Finance API Response:", response);
                latestFinanceApiResponse = response;

                let graphType = formData.graph_type || "bar"; 
                let transactionType = formData.transaction_type || "noi";
                let chartData = extractFinanceChartData(response, transactionType);

                renderFinanceChart(graphType, chartData);
                updateFinanceQuickStats(response);
                populateFinanceTransactionsTable(response, transactionType);
            },
            error: function(xhr, status, error) {
                console.error("Finance API Error:", error, xhr.responseText);
                alert('Something went wrong, please try again.');
            },
            complete: function() {
                loader.hide(); 
                submitButton.prop("disabled", false);
            }
        });
    });
}

function renderFinanceChart(chartType, chartData) {
    let chartContainer = $(".chart-block");
    chartContainer.html('<canvas id="financeChart"></canvas>');

    let ctx = document.getElementById("financeChart").getContext("2d");

    if (chartFinanceInstance) {
        chartFinanceInstance.destroy();
    }

    let datasets = [];
    if (chartType === "pie") {
        datasets.push({
            data: [
                chartData.paymentData.reduce((sum, val) => sum + val, 0), 
                chartData.expenseData.reduce((sum, val) => sum + val, 0)
            ],
            backgroundColor: ["rgba(75, 192, 192, 0.5)", "rgba(255, 99, 132, 0.5)"],
            borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"]
        });
    } else {
        datasets.push(
            {
                label: "Payments",
                data: chartData.paymentData,
                backgroundColor: "rgba(75, 192, 192, 0.5)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
                yAxisID: "y"
            },
            {
                label: "Expenses",
                data: chartData.expenseData,
                backgroundColor: "rgba(255, 99, 132, 0.5)",
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 1,
                yAxisID: "y1"
            }
        );
    }

    chartFinanceInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: chartType === "pie" ? ["Payments", "Expenses"] : chartData.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: chartType === "pie" ? {} : {
                y: {
                    type: "linear",
                    position: "left",
                },
                y1: {
                    type: "linear",
                    position: "right",
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function populateFinanceTransactionsTable(response, transactionType) {
    let tableBody = document.querySelector("#transactionsTable tbody");
    if (!tableBody) {
        console.error("Error: #transactionsTable not found in the DOM.");
        return;
    }
    tableBody.innerHTML = "";

    let transactions = [];
    if (transactionType === "noi") {
        transactions = [...response.payments, ...response.expenses];
    } else if (transactionType === "payments") {
        transactions = [...response.payments];
    } else if (transactionType === "expenses") {
        transactions = [...response.expenses];
    }

    if (transactions.length === 0) {
        let row = document.createElement("tr");
        row.innerHTML = `<td colspan="7" style="text-align: center; padding: 15px; color: #56627a;">No transactions to display</td>`;
        tableBody.appendChild(row);
        return;
    }

    transactions.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
    transactions.forEach(transaction => {
        let row = document.createElement("tr");
        let formattedAmount = `$${Math.abs(transaction.amount).toLocaleString()}`;
        let transactionTypeText = transaction.type === "payment" ? "Payment" : "Expense";
        let transactionDescription = transaction.description || "N/A";
        row.innerHTML = `<td>${formatFinanceDate(transaction.transaction_date)}</td>
                         <td>${transaction.display_name || "N/A"}</td>
                         <td>${transaction.street || "N/A"}</td>
                         <td>${transaction.unit_name || "N/A"}</td>
                         <td>${transactionTypeText}</td>
                         <td>${transactionDescription}</td>
                         <td>${formattedAmount}</td>`;
        tableBody.appendChild(row);
    });
}
