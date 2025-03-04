document.addEventListener("DOMContentLoaded", function() {
    initLandlordFinances();
    
});

function initLandlordFinances () {

    $('[api-form="finance-filter"]').on("submit", function (event) {

        event.preventDefault(); // Prevent default form submission
        $('.loader').css('display','flex');

        let form = $(this); // Store reference to the current form
        let loader = $('.loader'); // Store reference to the loader
        let submitButton = form.find('input[type="submit"]');

        loader.css('display', 'flex'); // Show loader
        submitButton.prop("disabled", true); // Disable submit button to prevent multiple submissions

        let formData = {}; // Create object for form data

        // Select all inputs within the current form and extract values
        form.find('[form-input]').each(function () {
            let key = $(this).attr("form-input"); // Get the form-input attribute name
            let value = $(this).val(); // Get the input value
            
            // Convert empty date values to null
            if (key === "start_date" || key === "end_date") {
                value = value.trim() === "" ? null : value;
            }

            formData[key] = value; // Add to formData object
        });

        // Make the AJAX request
        $.ajax({
            url: localStorage.baseUrl + "api:rpDXPv3x/v4_landlord_finances",
            type: "POST", // Change to "GET" if needed
            headers: {
                "Authorization": "Bearer " + localStorage.authToken
            },
            data: JSON.stringify(formData), // Ensure JSON is properly formatted
            contentType: "application/json",
            dataType: "json",
            success: function (response) {
                console.log("API Response:", response);
                alert('Success!');
                $('.loader').hide(); //hide loader
            },
            error: function (xhr, status, error) {
                console.error("API Error:", error, xhr.responseText);
                alert('Something went wrong, please try again.');
                $('.loader').hide(); //hide loader
            },
            complete: function () {
                loader.hide(); // Hide loader
                submitButton.prop("disabled", false); // Re-enable submit button after request completes
            }
        });
    });

}