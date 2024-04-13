var baseUrl = "https://xs9h-ivtd-slvk.n7c.xano.io/"; // xano base url

document.addEventListener("DOMContentLoaded", function() {  

  /* Retrieve the User and Populate the Form & Local Storage */

  // Get the user parameter from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const signUpKey = urlParams.get("user");

  // Update the value of #user_id with the user URL parameter
  $("#user_id").val(signUpKey);

  // Make an AJAX GET request to the API endpoint
  $.ajax({
    url: baseUrl + "api:sElUkr6t/get_user_for_sign_up",
    type: "GET",
    data: {
      sign_up_key: signUpKey
    },
    success: function (response) {

      // Store data in localStorage
      localStorage.setItem('firstName', response.first_name);
      localStorage.setItem("userId", response.user_id); // user uuid
      localStorage.setItem("clientApiKey", response.client_api_key); // client api key

      let userFirstName = localStorage.firstName;
      // Change the text of the element with class .name-replacer
      $('[data="first-name"]').text(userFirstName);
      $("#email").val(response.email);
    },
    error: function (error) {
      console.error("Error:", error);
    },
    complete: function () {
      $(".loader").css("display", "none"); // hide the loader
    }
  });



  /* When User Submits Form */

  // Handle form submission
  $("#confirm-account-form").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();


    const clientApiKey = localStorage.getItem("clientApiKey");
    const password = $("#password").val();

    // Create an AJAX POST request
    $.ajax({
      url: baseUrl + "api:sElUkr6t/acct_creation_confirm",
      type: "POST",
      data: {
        client_api_key: clientApiKey,
        password: password
      },
      success: function (response) {
        // Store Local Storage
        localStorage.setItem("baseUrl", baseUrl);
        localStorage.setItem("authToken", response.authToken); // auth tokem
        localStorage.setItem("clientApiKey", response.user_info.client_api_key); // client api key
        localStorage.setItem("userId", response.user_info.user_id); // user uuid
        localStorage.setItem("userRecId", response.user_info.id); // user rec id
        localStorage.setItem("userRole", response.user_info.user_role); // user role
        localStorage.setItem("firstName", response.user_info.first_name); // first name
  
      },
      error: function (error) {
        // Handle error here
        alert("Something went wrong");
      },
      complete: function () {
      
        // Handle page redirect based on user_role
        const userRole = localStorage.getItem("userRole");
        const redirectUrlParam = "?user=" + localStorage.userId;

        // logic for admins & employees
        if (userRole === "Admin" || userRole === "Employee") { 

          // Redirect Admin and Employee to profile settings page (no need for further confirmation)
          localStorage.setItem("pageId", "profile-settings");
          window.location.href = "/app/home";

        } else if (userRole === "Landlord") {

          // Redirect to the confirm account page for Landlords (collect additional info)
          window.location.href = "/landlord/confirm-account" + redirectUrlParam;

        } else if (userRole === "Tenant") {

          // Redirect to the confirm account page for Tenants (collect additional info)
          window.location.href = "/tenant/confirm-account" + redirectUrlParam;

        }
      }
    });
  });
});
