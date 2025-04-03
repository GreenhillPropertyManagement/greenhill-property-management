
let chartInstance = null; // Store chart instance globally
let latestApiResponse = null; // Declare it globally before using

document.addEventListener("DOMContentLoaded", function() {

    initLandlordFinances(); // init finance component
    setupChartTypeListener(); // Allow users to change chart type dynamically
    loadRecentPayments(); // load in the recent payments
    fetchStatements(); // fetch user's statements

    // Event listener to trigger report generation
    $('#download-report').off('click').on('click', function() {
    generateCustomReport();
    });
    
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
                latestApiResponse = response; // Store response globally for quick updates

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
function formatTransDate(dateString) {
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

        // ✅ Sort transactions newest to oldest
        transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

        transactions.forEach(item => {
            let formattedDate = formatTransDate(item.transaction_date);

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
            let formattedDate = formatTransDate(payment.transaction_date);

            if (!labels.includes(formattedDate)) {
                labels.push(formattedDate);
                paymentData[formattedDate] = 0;
                expenseData[formattedDate] = 0;
            }

            paymentData[formattedDate] += Math.abs(payment.amount);
        });

    } else if (transactionType === "expenses") {
        response.expenses.forEach(expense => {
            let formattedDate = formatTransDate(expense.transaction_date);

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

    // ✅ Destroy previous instance to allow proper resizing
    if (chartInstance) {
        chartInstance.destroy();
    }

    let datasetConfig;

    if (chartType === "pie") {
        // ✅ Ensure payments & expenses are on the same level
        datasetConfig = [{
            label: "Transactions",
            data: [
                chartData.paymentData.reduce((acc, val) => acc + val, 0), // Total Payments
                chartData.expenseData.reduce((acc, val) => acc + val, 0)  // Total Expenses
            ],
            backgroundColor: ["rgba(75, 192, 192, 0.7)", "rgba(255, 99, 132, 0.7)"], // Payments (Teal), Expenses (Red)
            borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
            borderWidth: 1
        }];
    } else {
        datasetConfig = [
            {
                label: "Payments",
                data: chartData.paymentData,
                backgroundColor: "rgba(75, 192, 192, 0.5)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
                yAxisID: "y-axis-payments" // ✅ Assign to primary y-axis
            },
            {
                label: "Expenses",
                data: chartData.expenseData,
                backgroundColor: "rgba(255, 99, 132, 0.5)",
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 1,
                yAxisID: "y-axis-expenses" // ✅ Assign to secondary y-axis
            }
        ];
    }

    chartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: chartType === "pie" ? ["Payments", "Expenses"] : chartData.labels,
            datasets: datasetConfig
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, labels: { usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) { return `$${tooltipItem.raw.toLocaleString()}`; }
                    }
                }
            },
            scales: chartType === "pie" ? {} : {
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
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: function(value) { return "$" + value.toLocaleString(); }
                    }
                }
            }
        }
    });

    // ✅ Force chart resize after a delay
    setTimeout(() => {
        chartInstance.resize();
    }, 200);
}

// Ensure the chart resizes when the window resizes
window.addEventListener("resize", function () {
    if (chartInstance) {
        chartInstance.resize();
    }
});

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
                populateTransactionModal(transaction);
            });
        }

        row.innerHTML = `
            <td>${formatTransDate(transaction.transaction_date)}</td>
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

function populateTransactionModal(payment) {

    if (!payment) {
        console.error("Error: Payment data is missing.");
        return;
    }

    console.log("Populating Modal with:", payment);

    let grossPayment = Math.abs(payment.amount);
    let netPayment = parseFloat(payment.landlords_net_payment) || 0;
    let managementFee = grossPayment - netPayment;
    let balanceAfterPayment = payment.total_running_balance || 0;

    console.log("Gross Payment:", grossPayment);
    console.log("Landlord Net Payment:", netPayment);
    console.log("Management Fee:", managementFee);
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

function setupChartTypeListener() {

    document.getElementById("graph_type-2").addEventListener("change", function() {
        let selectedChartType = this.value;

        if (!latestApiResponse) {
            console.warn("No API response available. Submit the form first.");
            return; // ✅ Prevents error before the first API call
        }

        let transactionType = document.querySelector('[form-input="transaction_type"]').value || "noi";
        let chartData = extractChartData(latestApiResponse, transactionType);
        
        console.log("Updating chart to:", selectedChartType);
        renderChart(selectedChartType, chartData);
    });

}

function loadRecentPayments() {
    $.ajax({
        url: localStorage.baseUrl + "api:rpDXPv3x/v4_recent_payments",
        method: "GET",
        dataType: "json",
        success: function(response) {
            let container = $(".recent-payments-container");
            container.empty(); // Clear previous content

            response.forEach(payment => {
                let formattedAmount = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(Math.abs(payment.amount)); // Convert to positive and format as currency
                
                let paymentItem = `
                    <div class="recent-payment-item">
                        <div class="recent-payment-row top">
                            <div data="display_name">${payment.display_name}</div>
                            <div data="amount" class="recent-payment-amount">${formattedAmount}</div>
                        </div>
                        <div class="recent-payment-row bottom">
                            <div class="recent-payment-property-info">
                                <div data="street">${payment.street}</div>
                                <div data="unit_name">${payment.unit_name}</div>
                            </div>
                            <div data="transaction_date" class="recent-payment-amount">${formatTransDate(payment.transaction_date)}</div>
                        </div>
                    </div>
                `;

                container.append(paymentItem);
            });
        },
        error: function(error) {
            console.error("Error fetching recent payments:", error);
        }
    });
}

function formatTransDate(dateString) {
    let dateParts = dateString.split("-");
    let date = new Date(Date.UTC(
        parseInt(dateParts[0]), // Year
        parseInt(dateParts[1]) - 1, // Month (0-based)
        parseInt(dateParts[2]) // Day
    ));

    if (isNaN(date)) return ""; // Ensure date is valid
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear().toString().slice(-2)}`;
}

function fetchStatements() {
    $.ajax({

        url: localStorage.baseUrl + "api:rpDXPv3x/v4_fetch_statements",
        method: "GET",
        headers: {
            "Authorization": "Bearer " + localStorage.authToken
        },
        dataType: "json",
        success: function (data) {
            let container = $(".statements-container");
            container.empty(); // Clear existing statements

            data.forEach(statement => {
                let statementItem = $(`
                    <div class="statement-item" style="cursor: pointer;">
                        <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/67cbcd7bc256682d3525afb0_document.svg" loading="lazy" alt="" class="statement_icon">
                        <div data="statement_title">${statement.display_title}</div>
                    </div>
                `);

                // Add click event to open the statement URL
                statementItem.on("click", function () {
                    window.open(statement.download_url, "_blank");
                });

                container.append(statementItem);
            });
        },
        error: function (xhr, status, error) {
            console.error("Error fetching statements:", error);
        }
    });
}

function generateCustomReport() {
    $('.loader').css('display', 'flex'); // Show loader
    let transactions = [];

    $('#transactionsTable tbody tr').each(function () {
        const cols = $(this).find('td');

        let transaction = {
            transaction_date: cols.eq(0).text(),
            display_name: cols.eq(1).text(),
            street: cols.eq(2).text(),
            unit_name: cols.eq(3).text(),
            type: cols.eq(4).text().toLowerCase(),
            description: cols.eq(5).text(),
            amount: parseFloat(cols.eq(6).text().replace(/[$,]/g, ''))
        };

        transactions.push(transaction);
    });

    // Extract the first and last transaction dates
    let firstDate = transactions.length > 0 ? transactions[0].transaction_date : null;
    let lastDate = transactions.length > 0 ? transactions[transactions.length - 1].transaction_date : null;

    // Get the selected sector text
    let sector = $('#sector option:selected').text().trim();

    // Get the selected report type text (NOI, Payments, Expenses)
    let reportType = $('#type option:selected').text().trim();

    // Get the selected date range text (Last 3 months, Quarter to date, etc.)
    let dateRangeText = $('#date_range option:selected').text().trim();

    let fileName = '';

    if (dateRangeText.toLowerCase() === 'custom') {
        let startDate = $('#start_date').val();
        let endDate = $('#end_date').val();

        if (!startDate || !endDate) {
            alert('Please select both start and end dates.');
            $('.loader').hide();
            return;
        }

        fileName = `Custom ${startDate} - ${endDate}`;
    } else {
        fileName = firstDate && lastDate
            ? `${sector} ${dateRangeText}: ${firstDate} - ${lastDate}`
            : `${sector} ${dateRangeText}`;
    }

    // Explicitly structured payload
    let requestData = {
        transactions: transactions,
        file_name: fileName,
        report_type: reportType // Uses the selected text (NOI, Payments, Expenses)
    };

    $.ajax({
        url: localStorage.baseUrl + 'api:rpDXPv3x/v4_generate_report',
        type: 'POST',
        dataType: "json",
        contentType: 'application/json',
        headers: {
            "Authorization": "Bearer " + localStorage.authToken
        },
        data: JSON.stringify(requestData),
        success: function (response) {
            let statement_id = response.statement_id; // Store the statement ID
            alert("Generating your report. Please do not refresh the page.");
            fetchCustomReport(statement_id);
        },
        error: function (xhr, status, error) {
            console.error('Error generating report:', error);
            alert('Error generating report. Please try again.');
            $('.loader').hide();
        }
    });
}

function fetchCustomReport(statementId) {

    let attempts = 0; // Track the number of attempts
    let maxAttempts = 5; // Maximum retries

    let interval = setInterval(() => {
        if (attempts >= maxAttempts) {
            clearInterval(interval);
            $('.loader').hide(); // Hide loader
            alert("Report generation is taking longer than expected. Please try again later.");
            return;
        }
        
        $.ajax({
            url: localStorage.baseUrl + "api:rpDXPv3x/v4_get_custom_report",
            type: 'GET',
            headers: {
                "Authorization": "Bearer " + localStorage.authToken
            },
            data: {
                statement_id: statementId
            },
            success: function(response) {

                if (response !== null) {

                    clearInterval(interval);
                    window.open(response, '_blank'); // automatic download
                    $('.loader').hide(); // hide loader
                } else {
                    attempts++; // Increment attempts only when the response is not ready
                }
            },
            error: function(xhr, status, error) {
                clearInterval(interval);
                alert("An error occurred while fetching the report. Please try again.");
                $('.loader').hide();
            }
        });
    }, 3000); // Poll every 5 seconds

}