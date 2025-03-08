// UPDATED AXIS LINE AND BAR AND PIE
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
                latestFinanceApiResponse = response; // Store response globally for quick updates

                // Extract graph_type and transaction_type
                let graphType = formData.graph_type || "bar"; // Default to bar
                let transactionType = formData.transaction_type || "noi"; // Default to NOI
                let chartData = extractFinanceChartData(response, transactionType);

                // Render Chart
                renderFinanceChart(graphType, chartData);

                // Update quick stats
                updateFinanceQuickStats(response);

                // Populate Transactions Table
                populateFinanceTransactionsTable(response, transactionType);
            },
            error: function(xhr, status, error) {
                console.error("Finance API Error:", error, xhr.responseText);
                alert('Something went wrong, please try again.');
            },
            complete: function() {
                loader.hide(); // Hide loader
                submitButton.prop("disabled", false); // Re-enable submit button
            }
        });
    });
}

function updateFinanceQuickStats(response) {
    const totalRentCollected = response.total_rent_collected || 0;
    const totalExpenses = response.total_expenses || 0;
    const noi = response.noi || 0;

    $('[data-api="total_rent_collected"]').text(`$${totalRentCollected.toLocaleString()}`);
    $('[data-api="total_expenses"]').text(`$${totalExpenses.toLocaleString()}`);
    $('[data-api="noi"]').text(`$${noi.toLocaleString()}`);
}

function extractFinanceChartData(response, transactionType) {
    let labels = [];
    let paymentData = {};
    let expenseData = {};
    let totalPayments = 0;
    let totalExpenses = 0;

    let transactions = (transactionType === "noi") 
        ? [...response.payments, ...response.expenses] 
        : (transactionType === "payments") 
        ? response.payments 
        : response.expenses;

    transactions.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    transactions.forEach(item => {
        let formattedDate = item.transaction_date;

        if (!labels.includes(formattedDate)) {
            labels.push(formattedDate);
            paymentData[formattedDate] = 0;
            expenseData[formattedDate] = 0;
        }

        if (item.type === "payment") {
            paymentData[formattedDate] += Math.abs(item.amount);
            totalPayments += Math.abs(item.amount);
        } else {
            expenseData[formattedDate] += Math.abs(item.amount);
            totalExpenses += Math.abs(item.amount);
        }
    });

    return { 
        labels, 
        paymentData: labels.map(date => paymentData[date] || 0), 
        expenseData: labels.map(date => expenseData[date] || 0),
        totalPayments,
        totalExpenses
    };
}

function renderFinanceChart(chartType, chartData) {
    let chartContainer = $(".chart-block");
    chartContainer.html('<canvas id="financeChart"></canvas>');

    let ctx = document.getElementById("financeChart").getContext("2d");

    if (chartFinanceInstance) {
        chartFinanceInstance.destroy();
    }

    let datasetConfig, optionsConfig;

    if (chartType === "pie") {
        datasetConfig = [{
            label: "Transactions",
            data: [chartData.totalPayments, chartData.totalExpenses],
            backgroundColor: ["rgba(75, 192, 192, 0.7)", "rgba(255, 99, 132, 0.7)"],
            borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
            borderWidth: 1
        }];
        optionsConfig = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        generateLabels: function(chart) {
                            return [
                                { text: "Payments", fillStyle: "rgba(75, 192, 192, 0.7)" },
                                { text: "Expenses", fillStyle: "rgba(255, 99, 132, 0.7)" }
                            ];
                        }
                    }
                }
            }
        };
    } else {
        datasetConfig = [
            {
                label: "Payments",
                data: chartData.paymentData,
                backgroundColor: "rgba(75, 192, 192, 0.5)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
                yAxisID: "y-axis-payments"
            },
            {
                label: "Expenses",
                data: chartData.expenseData,
                backgroundColor: "rgba(255, 99, 132, 0.5)",
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 1,
                yAxisID: "y-axis-expenses"
            }
        ];
        optionsConfig = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                "y-axis-payments": {
                    type: "linear",
                    position: "left",
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return "$" + value.toLocaleString(); }
                    }
                },
                "y-axis-expenses": {
                    type: "linear",
                    position: "right",
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: {
                        callback: function(value) { return "$" + value.toLocaleString(); }
                    }
                }
            }
        };
    }

    chartFinanceInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: chartType === "pie" ? ["Payments", "Expenses"] : chartData.labels,
            datasets: datasetConfig
        },
        options: optionsConfig
    });
}

function setupFinanceChartTypeListener() {
    document.getElementById("graph_type-2").addEventListener("change", function() {
        let selectedChartType = this.value;

        if (!latestFinanceApiResponse) return;

        let transactionType = document.querySelector('[form-input="transaction_type"]').value || "noi";
        let chartData = extractFinanceChartData(latestFinanceApiResponse, transactionType);

        renderFinanceChart(selectedChartType, chartData);
    });
}