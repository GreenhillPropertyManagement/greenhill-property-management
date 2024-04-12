document.addEventListener("DOMContentLoaded", function () {
  if (localStorage.authToken == null) {
    //run code if they are not logged in
    alert("You are not logged in");
    location.href = "/app/login";
  } else {
    authUser();

    $(".sign-out-link").on("click", function () {
      localStorage.clear();
      window.location.href = "/app/login";
    });
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
      // Handle success here, if needed
      console.log(data);
      verifyBank();
    },
    error: function (error) {
      //run code if they are not logged in
      alert("You are not logged in");
      window.location.href = "/app/login";
    },
  });
}

function verifyBank() {
  var userRecIdValue = localStorage.getItem("userRecId");
  $("#user-rec_id").val(userRecIdValue);

  // Handle form submission
  $("#verify-bank-form").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    $(".loader").css("display", "flex");

    // Change the text of the submit button
    $(this).find('input[type="submit"]').val("Please Wait...");

    // Disable pointer events for the submit button
    $(this).find('input[type="submit"]').css("pointer-events", "none");

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
      url: localStorage.baseUrl + "api:sElUkr6t/verify_bank_acct",
      type: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: formData,
      success: function (response) {
        localStorage.setItem("pageId", "my-profile");
        window.location.href = "/app/home";
        localStorage.setItem('bankStatus','verified');
      },
      error: function (error) {
        $(".form__error-block").show(); // show error
        // Disable pointer events for the submit button
        $("#verify-bank-form").find('input[type="submit"]').val("Continue");
        $("#verify-bank-form")
          .find('input[type="submit"]')
          .css("pointer-events", "auto");
      },
    });
  });
}
