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

function updateFinanceQuickStats(response) {
    const totalRentCollected = response.total_rent_collected || 0;
    const totalExpenses = response.total_expenses || 0;
    const noi = response.noi || 0;

    $('[data-api="total_rent_collected"]').text(`$${totalRentCollected.toLocaleString()}`);
    $('[data-api="total_expenses"]').text(`$${totalExpenses.toLocaleString()}`);
    $('[data-api="noi"]').text(`$${noi.toLocaleString()}`);
}

function formatFinanceDate(dateString) {
    let date = new Date(dateString);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear().toString().slice(-2)}`;
}

function extractFinanceChartData(response, transactionType) {
    let labels = [];
    let paymentData = {};
    let expenseData = {};

    let transactions = [...response.payments, ...response.expenses];
    transactions.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    transactions.forEach(item => {
        let formattedDate = formatFinanceDate(item.transaction_date);
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

    let paymentArray = labels.map(date => paymentData[date] || 0);
    let expenseArray = labels.map(date => expenseData[date] || 0);
    return { labels, paymentData: paymentArray, expenseData: expenseArray };
}

function setupFinanceChartTypeListener() {
    document.getElementById("graph_type-2").addEventListener("change", function() {
        let selectedChartType = this.value;
        if (!latestFinanceApiResponse) {
            console.warn("No API response available. Submit the form first.");
            return;
        }
        let transactionType = document.querySelector('[form-input="transaction_type"]').value || "noi";
        let chartData = extractFinanceChartData(latestFinanceApiResponse, transactionType);
        renderFinanceChart(selectedChartType, chartData);
    });
}

function loadFinanceRecentPayments() {
    $.ajax({
        url: localStorage.baseUrl + "api:rpDXPv3x/v4_recent_payments",
        method: "GET",
        dataType: "json",
        success: function(response) {
            let container = $(".recent-payments-container");
            container.empty();
            response.forEach(payment => {
                let formattedAmount = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(Math.abs(payment.amount));
                let paymentItem = `<div class="recent-payment-item">
                    <div class="recent-payment-row top">
                        <div data="display_name">${payment.display_name}</div>
                        <div data="amount" class="recent-payment-amount">${formattedAmount}</div>
                    </div>
                </div>`;
                container.append(paymentItem);
            });
        }
    });
}

function fetchFinanceStatements() {
    $.ajax({
        url: localStorage.baseUrl + "api:rpDXPv3x/v4_fetch_statements",
        method: "GET",
        headers: { "Authorization": "Bearer " + localStorage.authToken },
        dataType: "json",
        success: function(data) {
            let container = $(".statements-container");
            container.empty();
            data.forEach(statement => {
                let statementItem = `<div class="statement-item">${statement.display_title}</div>`;
                container.append(statementItem);
            });
        }
    });
}

function loadFinanceRecentPayments() {
    $.ajax({
        url: localStorage.baseUrl + "api:rpDXPv3x/v4_recent_payments",
        method: "GET",
        dataType: "json",
        success: function(response) {
            let container = $(".recent-payments-container");
            container.empty();

            response.forEach(payment => {
                let formattedAmount = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(Math.abs(payment.amount));

                let paymentItem = 
                    <div class="recent-payment-item">
                        <div class="recent-payment-row top">
                            <div data="display_name">${payment.display_name}</div>
                            <div data="amount" class="recent-payment-amount">${formattedAmount}</div>
                        </div>
                    </div>
                ;
                container.append(paymentItem);
            });
        }
    });
}

function fetchFinanceStatements() {
    $.ajax({
        url: localStorage.baseUrl + "api:rpDXPv3x/v4_fetch_statements",
        method: "GET",
        headers: { "Authorization": "Bearer " + localStorage.authToken },
        dataType: "json",
        success: function(data) {
            let container = $(".statements-container");
            container.empty();
            data.forEach(statement => {
                let statementItem = <div class="statement-item">${statement.display_title}</div>;
                container.append(statementItem);
            });
        }
    });
}
