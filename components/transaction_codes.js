document.addEventListener("DOMContentLoaded", function () {

  loadTransactionCodes()
  createTransCode();

});




function createTransCode() {

    $("#code-transaction-form").submit(function (event) {
        event.preventDefault(); // Prevent default form submission

        $('.loader').css('display', 'flex'); // Show loading indicator (if you have one)

        // Collect form data dynamically based on "data-api-input" attributes
        let formData = {};

        $(this).find('[data-api-input]').each(function () {
            let key = $(this).attr("data-api-input");
            let value = $(this).val();
            formData[key] = value;
        });

        // Make an AJAX POST request to Xano API
        $.ajax({
            url: localStorage.baseUrl + "api:ehsPQykn/create_transaction_code",
            type: "POST",
            headers: {
                'Authorization': "Bearer " + localStorage.authToken, // Add token if needed
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(formData),
            success: function (response) {

                //alert user with confirmation
                alert ('Success! Transaction Code Created.');
                // Create new item
                let $newItem = createTransactionCodeElement(response);
                // Insert it into the correct sorted position
                insertSortedTransactionCode($newItem);
                // Clear form fields
                $("#code-transaction-form").trigger("reset");

            },
            error: function (error) {
                console.error("Error creating transaction code:", error);

                // Show error message
                alert(' Something Went Wrong. Please Try Again.')
            },
            complete: function () {
                $('.loader').hide(); // Hide loading indicator
            }
        });
    });

}

function loadTransactionCodes() {

    $('.loader').css('display','flex'); // show loader

    $.ajax({
        url: localStorage.baseUrl + "api:ehsPQykn/get_transaction_codes",
        type: "GET",
        headers: {
            'Authorization': "Bearer " + localStorage.authToken,
        },
        success: function (response) {
            let $container = $(".transcton-codes-container");
            $container.empty(); // Clear existing items

            response.sort((a, b) => a.code.localeCompare(b.code)); // Sort by code

            response.forEach(code => {
                let $item = createTransactionCodeElement(code);
                $container.append($item);
            });
        },
        complete: function (){
          $('.loader').hide(); // Hide loading indicator
        },
        error: function (error) {
            console.error("Error loading transaction codes:", error);
        }
    });
}

// Function to create a transaction code element dynamically
function createTransactionCodeElement(codeData) {
    let $item = $(`
        <div class="transaction-code-item" data-id="${codeData.id}">
            <div class="transaction-code-item__title-wrapper">
                <div class="transaction-code-item__title-group">
                    <div class="transaction-code-item__code">${codeData.code}</div>
                    <div class="transaction-code-item__title">${codeData.title}</div>
                </div>
                <div class="edit-code-icon"></div>
            </div>
            <div class="transaction-code-item__description">${codeData.description}</div>
        </div>
    `);
    return $item;
}