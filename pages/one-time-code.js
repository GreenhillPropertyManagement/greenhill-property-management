document.addEventListener("DOMContentLoaded", function () {
    const baseUrl = "https://xs9h-ivtd-slvk.n7c.xano.io/";

    if (localStorage.authToken == null) {
        alert("You are not logged in");
        window.location.href = "/app/login";
    } else {

        // Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        const client_api_key = params.get("user");
        const cid = params.get("cid");

        $("#one-time-code-form").submit(function (event) {
            event.preventDefault();

            $(this).find('input[type="submit"]').val("Please Wait...");
            $(this).find('input[type="submit"]').css("pointer-events", "none");

            const code = $("#code").val();

            if (!client_api_key || !cid || !code) {
                alert("Missing required information.");
                return;
            }

            $.ajax({
                url: baseUrl + "api:QNBxKUuR/submit_code",
                type: "POST",
                headers: {
                    'Content-Type': "application/json",
                    'Authorization': "Bearer " + localStorage.authToken
                },
                data: JSON.stringify({
                    client_api_key: client_api_key,
                    cid: cid,
                    code: code
                }),
                success: function (response) {
                    window.location.href = "/banking/choose-method";
                },
                error: function (error) {
                    alert("Something Went Wrong");
                },
            });
        });
    }
});