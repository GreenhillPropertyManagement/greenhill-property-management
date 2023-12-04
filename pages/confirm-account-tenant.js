$(document).ready(function () {

  if (localStorage.authToken == null) {
    //run code if they are not logged in
    alert("You are not logged in");
    location.href = "/app/login";
  } else {
    authUser();
  }
});



function authUser() {


  $.ajax({
    url: localStorage.baseUrl + "api:2yadJ61L/auth/me",
    type: "GET",
    headers: {
      'Content-Type': "application/json",
      'Authorization': "Bearer " + localStorage.authToken
    },
    success: function (data) {
      // Handle success here, if needed
      console.log(data);
      confirmTenant();
    },
    error: function (error) {
      //run code if they are not logged in
      alert("You are not logged in");
      //window.location.href = "/app/login";
    }
  });
}

function confirmTenant(){

  /* ------ populate form and local storage with user data  ----- */

  // get user id from url parameter
  function getUrlParameter(name) {
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    const results = regex.exec(window.location.href);

    if (!results) return null;
    if (!results[2]) return "";

    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  const userId = getUrlParameter("user");

  // load in the user data via ajax
  if (userId) {
    $.ajax({
      url: localStorage.baseUrl + "api:sElUkr6t/get_single_tenant",
      type: "GET",
      data: {
        user_id: userId
      },
      success: function (response) {
        console.log(response);
        // Populate form fields with the data
        $("#first_name").val(response.first_name);
        $("#last_name").val(response.last_name);
        $("#email").val(response.email);
        $("#company_name").val(response.company_name);
        $("#mobile_phone").val(response.mobile_phone);
        $("#work_phone").val(response.work_phone);
        $("#billing_street").val(response.billing_street);
        $("#billing_street_2").val(response.billing_street_2);
        $("#billing_city").val(response.billing_city);
        $("#billing_state").val(response.billing_state);
        $("#billing_zip").val(response.billing_zip);

        // Update Local Storage
        localStorage.setItem("userRole", response.user_role); // add local storage - user's role
        localStorage.setItem("userId", response.user_id); // add local storage - user's id
        localStorage.setItem("userRecId", response.id); // add user record ID
        localStorage.setItem("tenantRecId", response.tenant_info.id); // add user record ID

        // Hide Loader
        $(".loader").css("display", "none"); // hide loader
      },
      error: function (error) {
        // Handle error here
        alert("Something went wrong while fetching data");
      }
    });
  }

  // Handle form submission
  $("#confirm-account-form-tenant").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    $('.loader').css('display','flex');

    // Create an object to store form data
    const formData = {};

    // Iterate through form inputs and collect key-value pairs
    $(this)
      .find("input, select, textarea")
      .each(function () {
        const input = $(this);
        formData[input.attr("id")] = input.val();
      });

    // Add user_id from local storage
    formData["user_id"] = localStorage.getItem("userId");
    formData["user_rec_id"] = localStorage.getItem("userRecId");
    formData["tenant_rec_id"] = localStorage.getItem("tenantRecId");

    // Make an AJAX POST request to tenant activate endpoint
    $.ajax({
      url: localStorage.baseUrl + "api:sElUkr6t/activate_account_tenant",
      type: "POST",
      headers: {
        'Authorization': "Bearer " + localStorage.authToken
      },
      data: formData,
      success: function (response) {
        window.location.href = "/tenant/verify-bank-account";
      },
      error: function (error) {
        // Handle error here
        alert("Something went wrong");
      }
    });
  });
}
