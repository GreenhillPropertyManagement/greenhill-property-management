document.addEventListener("DOMContentLoaded", function () {
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
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.authToken,
      },
      success: function (data) {
        manualBankLink();
        editBankManualBankLink();
      },
      error: function (error) {
        //run code if they are not logged in
        alert("You are not logged in");
        window.location.href = "/app/login";
      },
    });
  }

function manualBankLink() {

    /* -------- Handle Form Submission ----------*/
  $("#manual-bank-form").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    $(".loader").css("display", "flex");

    // Create an object to store form data
    const formData = {};

    // Iterate through form inputs and collect key-value pairs
    $(this)
      .find("input, select, textarea")
      .each(function () {
        const input = $(this);
        formData[input.attr("id")] = input.val();
      });

    // Make an AJAX POST request to the specified API endpoint
    $.ajax({
      url: localStorage.baseUrl + "api:sElUkr6t/manual_bank_link",
      type: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: formData,
      success: function (response) {

        // if landlord bank was instant verified 
        if (response.user_role === "Landlord" && response.bank_verified === "yes") {
          alert("Bank Account Successfully Linked!");
          localStorage.setItem("pageId", "dashboard");
          window.location.href = "/app/home";
        }

        // if landlord bank was not instant verified
        if (response.user_role === "Landlord" && response.bank_verified === "no") {
          alert("Bank Account Successfully Linked!");
          window.location.href = "/banking/verify-bank-account";
        }

        // if user is a tenant...
        if (response.user_role === "Tenant") {
          alert("Bank Account Successfully Linked!");
          window.location.href = "/banking/verify-bank-account";
        }


      },
      error: function (error) {
        // Handle error here
        alert("Something went wrong");
        location.reload();
      },
    });
  });
}

function editBankManualBankLink() {

  // Manual Bank Link when EDITING BANK ACCOUNT

  /* -------- Handle Form Submission ----------*/
$("#edit-bank-manual-bank-form").submit(function (event) {
  // Prevent the default form submission behavior
  event.preventDefault();

  $(".loader").css("display", "flex");

  // Create an object to store form data
  const formData = {};

  // Iterate through form inputs and collect key-value pairs
  $(this)
    .find("input, select, textarea")
    .each(function () {
      const input = $(this);
      formData[input.attr("id")] = input.val();
    });

  // Make an AJAX POST request to the specified API endpoint
  $.ajax({
    url: localStorage.baseUrl + "api:sElUkr6t/update_bank_account",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: formData,
    success: function (response) {

      // if landlord bank was instant verified 
      if (response.user_role === "Landlord" && response.bank_verified === "yes") {
        alert("Bank Account Successfully Linked!");
        localStorage.setItem("pageId", "dashboard");
        window.location.href = "/app/home";
      }

      // if landlord bank was not instant verified
      if (response.user_role === "Landlord" && response.bank_verified === "no") {
        alert("Bank Account Successfully Linked!");
        window.location.href = "/banking/verify-bank-account";
      }

      // if user is a tenant...
      if (response.user_role === "Tenant") {
        alert("Bank Account Successfully Linked!");
        window.location.href = "/banking/verify-bank-account";
      }


    },
    error: function (error) {
      // Handle error here
      alert("Something went wrong");
      location.reload();
    },
  });
});
}