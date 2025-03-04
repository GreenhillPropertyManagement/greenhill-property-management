$(document).ready(function () {
    initLandlordFinances();
    
});

function initLandlordFinances () {

    $('[api-form="finance-filter"]').on("submit", function (event) {
        
        $('.loader').css('display','flex'); // show loader
        event.preventDefault(); // Prevent default form submission

        let formData = {}; // Create object for form data

        // Select all inputs within the current form and extract values
        $(this).find('[form-input]').each(function () {
            let key = $(this).attr("form-input"); // Get the form-input attribute name
            let value = $(this).val(); // Get the input value
            formData[key] = value; // Add to the formData object
        });

        // Debugging: Check if all form fields are captured correctly
        console.log("Form Data Sent:", formData);

        // Make the AJAX request
        $.ajax({
            url: localStorage.baseUrl + "api:rpDXPv3x/v4_landlord_finances",
            type: "POST", // Change to "GET" if needed
            headers: {
                "Authorization": "Bearer " + localStorage.authToken // Set Auth Token
            },
            data: JSON.stringify(formData),
            contentType: "application/json",
            dataType: "json",
            success: function (response) {

                alert('Success!');
                console.log("API Response:", response); // Log API response
                $('.loader').hide(); // hide loader

            },
            error: function (xhr, status, error) {

                alert('Something went wrong, please try again.');
                console.error("API Error:", error); // Log errors
                $('.loader').hide(); // hide loader

            }
        });
    });

}