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
                // update quick stats
                updateQuickStats(response);
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
    let date = new Date(dateString);
    if (isNaN(date)) return ""; // Ensure date is valid
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
}

// Function to extract data based on transaction_type
function extractChartData(response, transactionType) {
    let labels = [];
    let paymentData = [];
    let expenseData = [];

    if (transactionType === "noi") {
        let transactions = [...response.payments, ...response.expenses];
        transactions.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

        transactions.forEach(item => {
            let formattedDate = formatDate(item.transaction_date);
            if (!labels.includes(formattedDate)) {
                labels.push(formattedDate);
            }

            if (response.payments.some(p => p.transaction_date === item.transaction_date)) {
                paymentData.push(Math.abs(item.amount)); // Convert payments to positive
                expenseData.push(0); // No expense on this entry
            } else {
                paymentData.push(0); // No payment on this entry
                expenseData.push(item.amount); // Expense as is
            }
        });

    } else if (transactionType === "payments") {
        response.payments.forEach(payment => {
            labels.push(formatDate(payment.transaction_date)); // Format date
            paymentData.push(Math.abs(payment.amount)); // Convert payments to positive
            expenseData.push(0); // No expenses in this case
        });

    } else if (transactionType === "expenses") {
        response.expenses.forEach(expense => {
            labels.push(formatDate(expense.transaction_date)); // Format date
            expenseData.push(expense.amount);
            paymentData.push(0); // No payments in this case
        });
    }

    return { labels, paymentData, expenseData };
}

function renderChart(chartType, chartData) {
    let chartContainer = $(".chart-block");

    // Clear previous chart if exists
    chartContainer.html('<canvas id="financeChart"></canvas>');

    let ctx = document.getElementById("financeChart").getContext("2d");

    new Chart(ctx, {
        type: chartType, // Dynamic chart type
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: "Payments",
                    data: chartData.paymentData,
                    backgroundColor: "rgba(75, 192, 192, 0.5)", // Payments (Teal)
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1,
                    yAxisID: "y-axis-payments" // Assign to primary y-axis
                },
                {
                    label: "Expenses",
                    data: chartData.expenseData,
                    backgroundColor: "rgba(255, 99, 132, 0.5)", // Expenses (Red)
                    borderColor: "rgba(255, 99, 132, 1)",
                    borderWidth: 1,
                    yAxisID: "y-axis-expenses" // Assign to secondary y-axis
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // ✅ Ensures the chart resizes properly
            scales: {
                "y-axis-payments": {
                    type: "linear",
                    position: "left",
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return "$" + value.toLocaleString();
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
                            return "$" + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}