document.addEventListener("DOMContentLoaded", function () {
  var microdepositType; // create var to store microdeposit type for conditional form display for tenants

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
      //console.log(data);
      microdepositType = data.microdeposit_type;
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
  $("#user_rec_id").val(userRecIdValue);

  if (microdepositType === "descriptor_code") {

    $('#descriptor').on('input', function() {
      if ($(this).val().length > 0) {
        $('#verify-bank-form-descriptor').find('input[type="submit"]').removeClass('inactive');
      } else {
        $('#verify-bank-form-descriptor').find('input[type="submit"]').addClass('inactive');
      }
    });

    $('.descriptor-wrapper').show(); // show the descriptor code input
    $('.deposits-wrapper').hide(); // hide the microdeposit amount inputs

    // Handle form submission
    $("#verify-bank-form-descriptor").off("submit").on("submit", function (event) {
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
          formData[input.attr("data-name")] = input.val();
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

          if (response.response.status === 200) {  
            localStorage.setItem("pageId", "my-profile");
            localStorage.setItem('bankStatus','verified');
            localStorage.setItem('bankValid', true);
            $('#bank-valid-message').hide();
            showToast('Success! Your bank account has been verified.');
            window.location.href = '/tenant/auto-pay-confirmation';
          } 
          else {
            $(".form__error-block").show(); // show error
            // Disable pointer events for the submit button
            $("#verify-bank-form-descriptor").find('input[type="submit"]').val("Continue");
            $("#verify-bank-form-descriptor")
              .find('input[type="submit"]')
              .css("pointer-events", "auto");
          }

        },
        error: function (error) {
          $(".form__error-block").show(); // show error
          // Disable pointer events for the submit button
          $("#verify-bank-form-descriptor").find('input[type="submit"]').val("Continue");
          $("#verify-bank-form-descriptor")
            .find('input[type="submit"]')
            .css("pointer-events", "auto");
        },
      });
    });

   

  } else {

    $('.deposits-wrapper').show(); // show the microdeposit amount inputs
    $('.descriptor-wrapper').hide(); // hide the descriptor code input

    $('#deposit_1, #deposit_2').on('input', function() {
      if ($('#deposit_1').val().length > 0 && $('#deposit_2').val().length > 0) {
        $('#verify-bank-form').find('input[type="submit"]').removeClass('inactive');
      } else {
        $('#verify-bank-form').find('input[type="submit"]').addClass('inactive');
      }
    });


    // Handle form submission
    $("#verify-bank-form").off("submit").on("submit", function (event) {
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
          formData[input.attr("data-name")] = input.val();
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

          if (response.response.status === 200) { 

            localStorage.setItem("pageId", "my-profile");
            localStorage.setItem('bankStatus','verified');
            localStorage.setItem('bankValid', true);
            $('#bank-valid-message').hide();
            showToast('Success! Your bank account has been verified.');
            window.location.href = '/tenant/auto-pay-confirmation';
        } else {

            $(".form__error-block").show(); // show error
            // Disable pointer events for the submit button
            $("#verify-bank-form").find('input[type="submit"]').val("Continue");
            $("#verify-bank-form")
            .find('input[type="submit"]')
            .css("pointer-events", "auto");
        }


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


}
