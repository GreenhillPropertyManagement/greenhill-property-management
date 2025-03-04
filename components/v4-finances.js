document.addEventListener("DOMContentLoaded", function() {
    initLandlordFinances();
    
});

function initLandlordFinances () {

    $('[api-form="finance-filter"]').on("submit", function (event) {
        event.preventDefault(); // Prevent default form submission

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

        // Debug: Check if JSON is correctly formatted
        console.log("Corrected Form Data Sent:", formData);

        // Ensure base URL has a trailing slash
        let baseUrl = localStorage.baseUrl ? 
            (localStorage.baseUrl.endsWith("/") ? localStorage.baseUrl : localStorage.baseUrl + "/") : 
            "https://your-default-api-url.com/";

        let apiUrl = baseUrl + "api:rpDXPv3x/v4_landlord_finances";

        console.log("Final API URL:", apiUrl);
        console.log("Auth Token:", localStorage.authToken);

        // Make the AJAX request
        $.ajax({
            url: apiUrl,
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
            },
            error: function (xhr, status, error) {
                console.error("API Error:", error, xhr.responseText);
                alert('Something went wrong, please try again.');
            },
            complete: function () {
                loader.hide(); // Hide loader
                submitButton.prop("disabled", false); // Re-enable submit button after request completes
            }
        });
    });

}