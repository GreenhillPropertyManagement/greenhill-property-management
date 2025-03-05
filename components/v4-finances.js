document.addEventListener("DOMContentLoaded", function() {
    initLandlordFinances();
});

function initLandlordFinances() {
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

                console.log("API Response:", response);

                // Extract graph_type and transaction_type
                let graphType = formData.graph_type || "bar"; // Default to bar
                let transactionType = formData.transaction_type || "noi"; // Default to NOI
                let chartData = extractChartData(response, transactionType);

                // Render Chart
                renderChart(graphType, chartData);

                // Update quick stats
                updateQuickStats(response);

                // Populate Transactions Table
                populateTransactionsTable(response, transactionType);

            },
            error: function(xhr, status, error) {
                console.error("API Error:", error, xhr.responseText);
                alert('Something went wrong, please try again.');
            },
            complete: function() {
                loader.hide(); // Hide loader
                submitButton.prop("disabled", false); // Re-enable submit button
            }
        });
    });
}

function updateQuickStats(response) {
    const totalRentCollected = response.total_rent_collected || 0;
    const totalExpenses = response.total_expenses || 0;
    const noi = response.noi || 0;

    $('[data-api="total_rent_collected"]').text(`$${totalRentCollected.toLocaleString()}`);
    $('[data-api="total_expenses"]').text(`$${totalExpenses.toLocaleString()}`);
    $('[data-api="noi"]').text(`$${noi.toLocaleString()}`);
}

// Function to format date to M/D/YY
function formatDate(dateString) {
    let dateParts = dateString.split("-");
    let date = new Date(Date.UTC(
        parseInt(dateParts[0]), // Year
        parseInt(dateParts[1]) - 1, // Month (0-based)
        parseInt(dateParts[2]) // Day
    ));

    if (isNaN(date)) return ""; // Ensure date is valid
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear().toString().slice(-2)}`;
}

function extractChartData(response, transactionType) {
    let labels = [];
    let paymentData = {};
    let expenseData = {};

    if (transactionType === "noi") {
        let transactions = [...response.payments, ...response.expenses];
        transactions.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

        transactions.forEach(item => {
            let formattedDate = formatDate(item.transaction_date);

            // Ensure each date appears only once
            if (!labels.includes(formattedDate)) {
                labels.push(formattedDate);
                paymentData[formattedDate] = 0; // Initialize payment value
                expenseData[formattedDate] = 0; // Initialize expense value
            }

            // Aggregate totals for the day
            if (item.type === "payment") {
                paymentData[formattedDate] += Math.abs(item.amount); // Convert payments to positive
            } else {
                expenseData[formattedDate] += item.amount; // Expenses stay as is
            }
        });

    } else if (transactionType === "payments") {
        response.payments.forEach(payment => {
            let formattedDate = formatDate(payment.transaction_date);

            if (!labels.includes(formattedDate)) {
                labels.push(formattedDate);
                paymentData[formattedDate] = 0;
                expenseData[formattedDate] = 0;
            }

            paymentData[formattedDate] += Math.abs(payment.amount);
        });

    } else if (transactionType === "expenses") {
        response.expenses.forEach(expense => {
            let formattedDate = formatDate(expense.transaction_date);

            if (!labels.includes(formattedDate)) {
                labels.push(formattedDate);
                paymentData[formattedDate] = 0;
                expenseData[formattedDate] = 0;
            }

            expenseData[formattedDate] += expense.amount;
        });
    }

    // Convert objects to arrays for Chart.js
    let paymentArray = labels.map(date => paymentData[date] || 0);
    let expenseArray = labels.map(date => expenseData[date] || 0);

    return { labels, paymentData: paymentArray, expenseData: expenseArray };
}

function renderChart(chartType, chartData) {
    let chartContainer = $(".chart-block");

    // Clear previous chart if exists
    chartContainer.html('<canvas id="financeChart"></canvas>');

    let ctx = document.getElementById("financeChart").getContext("2d");

    let chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true, // ✅ Keep legend for all chart types
                labels: {
                    usePointStyle: true, // ✅ Makes the legend circles match the dataset color
                }
            },
            tooltip: {
                callbacks: {
                    label: function(tooltipItem) {
                        let value = tooltipItem.raw;
                        return `$${value.toLocaleString()}`; // ✅ Adds $ to tooltips
                    }
                }
            }
        }
    };

    // **Remove Y-axis if chart type is "pie"**
    if (chartType !== "pie") {
        chartOptions.scales = {
            "y-axis-payments": {
                type: "linear",
                position: "left",
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return "$" + value.toLocaleString(); // ✅ Adds $ to Y-axis
                    }
                }
            },
            "y-axis-expenses": {
                type: "linear",
                position: "right",
                beginAtZero: true,
                grid: {
                    drawOnChartArea: false // Hide gridlines for secondary axis
                },
                ticks: {
                    callback: function(value) {
                        return "$" + value.toLocaleString(); // ✅ Adds $ to Y-axis
                    }
                }
            }
        };
    }

    // Define correct colors for pie chart and other types
    let datasetConfig = [
        {
            label: "Payments",
            data: chartData.paymentData,
            backgroundColor: "rgba(75, 192, 192, 0.5)", // Payments (Teal)
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
            yAxisID: chartType !== "pie" ? "y-axis-payments" : undefined
        },
        {
            label: "Expenses",
            data: chartData.expenseData,
            backgroundColor: "rgba(255, 99, 132, 0.5)", // Expenses (Red)
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
            yAxisID: chartType !== "pie" ? "y-axis-expenses" : undefined
        }
    ];

    // **If it's a pie chart, merge payments and expenses into one dataset**
    if (chartType === "pie") {
        datasetConfig = [{
            label: "Transactions",
            data: [
                chartData.paymentData.reduce((acc, val) => acc + val, 0), // Total Payments
                chartData.expenseData.reduce((acc, val) => acc + val, 0)  // Total Expenses
            ],
            backgroundColor: ["rgba(75, 192, 192, 0.5)", "rgba(255, 99, 132, 0.5)"], // Payments (Teal), Expenses (Red)
            borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
            borderWidth: 1
        }];
    }

    new Chart(ctx, {
        type: chartType, // Dynamic chart type
        data: {
            labels: chartType === "pie" ? ["Payments", "Expenses"] : chartData.labels, // ✅ Custom labels for pie chart
            datasets: datasetConfig
        },
        options: chartOptions
    });
}

function populateTransactionsTable(response, transactionType) {
    let tableBody = document.querySelector("#transactionsTable tbody");

    if (!tableBody) {
        console.error("Error: #transactionsTable not found in the DOM.");
        return;
    }

    tableBody.innerHTML = ""; // Clear previous data

    let transactions = [];

    // Filter transactions based on the selected filter
    if (transactionType === "noi") {
        transactions = [...response.payments, ...response.expenses];
    } else if (transactionType === "payments") {
        transactions = [...response.payments];
    } else if (transactionType === "expenses") {
        transactions = [...response.expenses];
    }

    if (transactions.length === 0) {
        let row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 15px; color: #56627a;">
                No transactions to display
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }

    transactions.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    transactions.forEach(transaction => {
        let row = document.createElement("tr");

        let formattedAmount = `$${Math.abs(transaction.amount).toLocaleString()}`;
        let transactionTypeText = transaction.type === "payment" ? "Payment" : "Expense";

        // ✅ Ensure the correct description is used
        let transactionDescription = transaction.description || "N/A";

        // ✅ Only apply modal attributes & click event to Payment rows
        if (transaction.type === "payment") {
            row.setAttribute("element", "modal");
            row.setAttribute("modal", "transaction-detail-modal");

            // ✅ Ensure row click event still triggers modal function
            row.addEventListener("click", function () {
                console.log("Clicked Payment:", transaction); // Debugging log
                populateTransactionModal(transaction, response.expenses);
            });
        }

        row.innerHTML = `
            <td>${formatDate(transaction.transaction_date)}</td>
            <td>${transaction.display_name || "N/A"}</td>
            <td>${transaction.street || "N/A"}</td>
            <td>${transaction.unit_name || "N/A"}</td>
            <td>${transactionTypeText}</td>
            <td>${transactionDescription}</td> <!-- ✅ Correctly populated -->
            <td>${formattedAmount}</td>
        `;

        tableBody.appendChild(row);
    });
}

function populateTransactionModal(payment, expenses) {
    if (!payment) {
        console.error("Error: Payment data is missing.");
        return;
    }

    console.log("Populating Modal with:", payment);
    console.log("Expenses Data:", expenses);

    let grossPayment = Math.abs(payment.amount);
    let matchingExpense = expenses.find(exp => exp.transaction_id === payment.transaction_id);
    let managementFee = matchingExpense ? Math.abs(matchingExpense.amount) : 0;
    let netPayment = grossPayment - managementFee;
    let balanceAfterPayment = payment.total_running_balance || 0;

    console.log("Gross Payment:", grossPayment);
    console.log("Matching Expense:", matchingExpense);
    console.log("Management Fee:", managementFee);
    console.log("Net Payment:", netPayment);
    console.log("Balance After Payment:", balanceAfterPayment);

    let grossPaymentEl = document.querySelector('[data="gross-payment"]');
    let mgFeeEl = document.querySelector('[data="mg-fee"]');
    let netPaymentEl = document.querySelector('[data="net-payment"]');
    let balanceAfterPaymentEl = document.querySelector('[data="balance-after-payment"]');

    console.log("Modal Elements:", { grossPaymentEl, mgFeeEl, netPaymentEl, balanceAfterPaymentEl });

    if (!grossPaymentEl || !mgFeeEl || !netPaymentEl || !balanceAfterPaymentEl) {
        console.error("Error: One or more modal elements not found.");
        return;
    }

    grossPaymentEl.textContent = `$${grossPayment.toLocaleString()}`;
    mgFeeEl.textContent = `$${managementFee.toLocaleString()}`;
    netPaymentEl.textContent = `$${netPayment.toLocaleString()}`;
    balanceAfterPaymentEl.textContent = `$${balanceAfterPayment.toLocaleString()}`;
}