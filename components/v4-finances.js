document.addEventListener("DOMContentLoaded", function() {
    initLandlordFinances();
    setupChartTypeListener(); // Added listener for chart type change
});

let latestApiResponse = null; // Store latest API response for quick chart updates

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

                latestApiResponse = response; // Store response globally

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

// Allow user to change chart type without re-submitting form
function setupChartTypeListener() {
    document.getElementById("graph_type-2").addEventListener("change", function() {
        let selectedChartType = this.value;

        if (!latestApiResponse) {
            console.warn("No API response available. Submit the form first.");
            return; // ✅ Prevents error before first API call
        }

        let transactionType = document.querySelector('[form-input="transaction_type"]').value || "noi";
        let chartData = extractChartData(latestApiResponse, transactionType);
        
        console.log("Updating chart to:", selectedChartType);
        renderChart(selectedChartType, chartData);
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
            if (!labels.includes(formattedDate)) {
                labels.push(formattedDate);
                paymentData[formattedDate] = 0;
                expenseData[formattedDate] = 0;
            }

            if (item.type === "payment") {
                paymentData[formattedDate] += Math.abs(item.amount);
            } else {
                expenseData[formattedDate] += item.amount;
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

    return { labels, paymentData: labels.map(date => paymentData[date] || 0), expenseData: labels.map(date => expenseData[date] || 0) };
}

function renderChart(chartType, chartData) {
    let chartContainer = $(".chart-block");
    chartContainer.html('<canvas id="financeChart"></canvas>');

    let ctx = document.getElementById("financeChart").getContext("2d");

    new Chart(ctx, {
        type: chartType,
        data: {
            labels: chartType === "pie" ? ["Payments", "Expenses"] : chartData.labels,
            datasets: [
                { label: "Payments", data: chartData.paymentData, backgroundColor: "rgba(75, 192, 192, 0.5)", borderColor: "rgba(75, 192, 192, 1)", borderWidth: 1 },
                { label: "Expenses", data: chartData.expenseData, backgroundColor: "rgba(255, 99, 132, 0.5)", borderColor: "rgba(255, 99, 132, 1)", borderWidth: 1 }
            ]
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
            scales: chartType === "pie" ? {} : { y: { beginAtZero: true, ticks: { callback: function(value) { return "$" + value.toLocaleString(); } } } }
        }
    });
}