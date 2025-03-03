document.addEventListener("DOMContentLoaded", function () {

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
         
                alert ('Success! Transaction Code Created.');
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