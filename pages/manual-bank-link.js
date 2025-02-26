

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
      url: localStorage.baseUrl + "api:sElUkr6t/landlord_mannual_bank_link",
      type: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: formData,
      success: function (response) {
        alert("Bank Account Successfully Linked!");
        localStorage.setItem("pageId", "dashboard");
        window.location.href = "/app/home";
      },
      error: function (error) {
        // Handle error here
        alert("Something went wrong");
        location.reload();
      },
    });
  });
}