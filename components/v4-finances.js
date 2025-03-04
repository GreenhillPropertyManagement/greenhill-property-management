$(document).ready(function () {
    initLandlordFinances();
    
});

function initLandlordFinances () {

    $('[api-form="finance-filter"]').on("submit", function (event) {
        event.preventDefault(); // Prevent default form submission
        $('.loader').css('display','flex'); //show loader

        // Get form data as an object
        let formData = $(this).serializeArray();
        let formObject = {};
        $.each(formData, function (_, field) {
            formObject[field.name] = field.value;
        });

        // Make the AJAX request
        $.ajax({
            url: localStorage.baseUrl + "api:rpDXPv3x/v4_landlord_finances",
            type: "POST", // Change to "GET" if needed
            headers: {
                "Authorization": "Bearer " + localStorage.authToken // Set Auth Token
            },
            data: JSON.stringify(formObject),
            contentType: "application/json",
            dataType: "json",
            success: function (response) {
                alert("success!");
                console.log("API Response:", response); // Log API response
                $('.loader').hide(); //hide loader
            },
            error: function (xhr, status, error) {
                alert("Something went wrong. Please try again")
                console.error("API Error:", error); // Log errors
                $('.loader').hide(); //hide loader

            }
        });
    });

}