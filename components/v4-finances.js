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

// Function to format date to MM-DD-YYYY
function formatDate(dateString) {
    let date = new Date(dateString);
    if (isNaN(date)) return ""; // Ensure date is valid
    return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

// Function to extract data based on transaction_type
function extractChartData(response, transactionType) {
    let data = [];
    let labels = [];

    if (transactionType === "noi") {
        let transactions = [...response.payments, ...response.expenses];
        transactions.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

        transactions.forEach(item => {
            labels.push(formatDate(item.transaction_date)); // Format date
            let amount = item.amount;

            // Convert payments to positive
            if (response.payments.some(p => p.transaction_date === item.transaction_date)) {
                amount = Math.abs(amount);
            }

            data.push(amount);
        });

    } else if (transactionType === "payments") {
        response.payments.forEach(payment => {
            labels.push(formatDate(payment.transaction_date)); // Format date
            data.push(Math.abs(payment.amount)); // Convert payments to positive
        });

    } else if (transactionType === "expenses") {
        response.expenses.forEach(expense => {
            labels.push(formatDate(expense.transaction_date)); // Format date
            data.push(expense.amount);
        });
    }

    return { labels, data };
}

// Function to render chart
function renderChart(chartType, chartData) {
    let chartContainer = $(".chart-block");

    // Clear previous chart if exists
    chartContainer.html('<canvas id="financeChart"></canvas>');

    let ctx = document.getElementById("financeChart").getContext("2d");

    new Chart(ctx, {
        type: chartType, // Dynamic chart type
        data: {
            labels: chartData.labels,
            datasets: [{
                label: "Amount ($)",
                data: chartData.data,
                backgroundColor: ["rgba(75, 192, 192, 0.2)"],
                borderColor: ["rgba(75, 192, 192, 1)"],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}