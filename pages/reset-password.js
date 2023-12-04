document.addEventListener("DOMContentLoaded", function () {

  const baseUrl = "https://xs9h-ivtd-slvk.n7c.xano.io";

  // Get the user parameter from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const signUpKey = urlParams.get("user");

  // Get the user rec id
  $.ajax({
    url: "https://xs9h-ivtd-slvk.n7c.xano.io/api:sElUkr6t/get_user_for_sign_up",
    type: "GET",
    data: {
      sign_up_key: signUpKey
    },
    success: function (response) {

      // Store the id from the response
      //const userIdFromResponse = response.id;
      localStorage.setItem('userId', response.user_id);


    },
    error: function (error) {
      alert("Failed to fetch user details.");
    }
  });

    // Handle form submission
    $("#reset-password").submit(function (event) {
      // Prevent the default form submission behavior
      event.preventDefault();
  
      // Change the text of the submit button
      $(this).find('input[type="submit"]').val("Please Wait...");
  
      // Disable pointer events for the submit button
      $(this).find('input[type="submit"]').css("pointer-events", "none");
  
      // Make an login AJAX POST request
      $.ajax({
        url: 'https://xs9h-ivtd-slvk.n7c.xano.io/api:2yadJ61L/reset_password',
        type: "POST",
        data: {
          user_id: localStorage.userId, // Use the user ID from the first API response
          password: $("#password").val()
        },
        success: function (response) {

          /* Set Local Storage Data */
          localStorage.setItem('baseUrl',baseUrl);
          localStorage.setItem("authToken", response.authToken);
          localStorage.setItem("clientApiKey", response.user_info.client_api_key);
          localStorage.setItem("userId", response.user_info.user_id);
          localStorage.setItem("userRecId", response.user_info.id);
          localStorage.setItem("userRole", response.user_info.user_role);
          localStorage.setItem("firstName", response.user_info.first_name);
          localStorage.setItem("lastName", response.user_info.last_name);
          localStorage.setItem("email", response.user_info.email);
  
          $(".form__success-block").show(); // show success message
          $("#reset-password").hide(); // hide form
  
          setTimeout(function () {
            const userRole = response.user_info.user_role;
            // Conditional default page-id for user roles
            if (userRole === "Landlord") {
              localStorage.setItem("pageId", "dashboard");
            } else if (userRole === "Tenant") {
              localStorage.setItem("pageId", "properties");
            } else if (userRole === "Admin" || userRole === "Employee") {
              localStorage.setItem("pageId", "properties");
            } else {
              console.error("Unexpected user role:", userRole);
            }
            //re-direct to users default page
            window.location.href = "/app/home";
            //$('#' + localStorage.pageId).click();
          }, 1000); // 1000 milliseconds = 1 second
        },
        error: function (error) {
          alert('error');
        }
      });

    });

});
