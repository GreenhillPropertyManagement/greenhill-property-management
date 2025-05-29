document.addEventListener("DOMContentLoaded", function() {

    const baseUrl = "https://xs9h-ivtd-slvk.n7c.xano.io/";

    if (localStorage.authToken == null) {
        // Run code if they are not logged in
        alert("You are not logged in");
        window.location.href = "/app/login";
    } else {
        authUser();

        // Handle form submission
        $("#one-time-code-form").submit(function (event) {
            // Prevent the default form submission behavior
            event.preventDefault();

            // Change the text of the submit button
            $(this).find('input[type="submit"]').val("Please Wait...");

            // Disable pointer events for the submit button
            $(this).find('input[type="submit"]').css("pointer-events", "none");

            let email = $("#email").val();

            // Make an login AJAX POST request
            $.ajax({
            url: baseUrl + "api:2yadJ61L/forgot_password",
            type: "POST",
            headers: {
                'Content-Type': "application/json",
                'Authorization': "Bearer " + localStorage.authToken
            },
            data: {
                email: email,
            },
            success: function (response) {
                $(".form__success-block").show(); // show success message
                $("#one-time-code-form").hide(); // hide form
                setTimeout(function () {
                window.location.href = "/app/login";
                }, 1000); // 1000 milliseconds = 1 second
            },
            error: function (error) {
                alert("Something Went Wrong");
            },
            });
        });

    }
});





