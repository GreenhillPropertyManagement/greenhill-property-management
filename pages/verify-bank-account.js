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

  function handleStripeVerificationError(response, formSelector, verificationType) {
    var errorMessage = "We couldn’t verify your bank account. Please try again.";

    if (
      response &&
      response.response &&
      response.response.result &&
      response.response.result.error
    ) {
      var stripeError = response.response.result.error;
      var topLevelCode = stripeError.code;
      var stripeMessage = "";

      if (stripeError.message) {
        stripeMessage = stripeError.message.toLowerCase();
      }

      var setupIntent = null;
      var lastSetupErrorCode = "";

      if (stripeError.setup_intent) {
        setupIntent = stripeError.setup_intent;

        if (setupIntent.last_setup_error && setupIntent.last_setup_error.code) {
          lastSetupErrorCode = setupIntent.last_setup_error.code;
        }
      }

      // Expired case
      if (
        lastSetupErrorCode === "setup_intent_setup_attempt_expired" ||
        (
          topLevelCode === "intent_invalid_state" &&
          setupIntent &&
          setupIntent.status === "requires_payment_method" &&
          lastSetupErrorCode === "setup_intent_setup_attempt_expired"
        )
      ) {
        errorMessage =
          "This verification window has expired because more than 10 days have passed. Please relink your bank account to continue.";
      }

      // Descriptor code verification errors
      else if (verificationType === "descriptor_code") {
        if (
          topLevelCode === "payment_method_microdeposit_verification_attempts_exceeded" ||
          topLevelCode === "payment_method_microdeposit_verification_descriptor_code_mismatch" ||
          stripeMessage.indexOf("descriptor code") !== -1
        ) {
          errorMessage =
            "The verification code entered is incorrect. Please enter the 6-character code that starts with SM from your bank statement.";
        }
      }

      // Microdeposit amount verification errors
      else if (verificationType === "amounts") {
        if (
          topLevelCode === "payment_method_microdeposit_verification_attempts_exceeded" ||
          topLevelCode === "payment_method_microdeposit_verification_amounts_invalid" ||
          stripeMessage.indexOf("microdeposit") !== -1 ||
          stripeMessage.indexOf("amount") !== -1
        ) {
          errorMessage =
            "The deposit amounts entered are incorrect. Please enter the two microdeposit amounts exactly as they appear in your bank account.";
        }
      }
    }

    $(".verify-bank-error-text").text(errorMessage);
    $(".form__error-block").show();
    $(".loader").hide();

    $(formSelector)
      .find('input[type="submit"]')
      .val("Continue")
      .css("pointer-events", "auto");
  }

  if (microdepositType === "descriptor_code") {
    $("#descriptor").off("input").on("input", function () {
      if ($(this).val().length > 0) {
        $("#verify-bank-form-descriptor")
          .find('input[type="submit"]')
          .removeClass("inactive");
      } else {
        $("#verify-bank-form-descriptor")
          .find('input[type="submit"]')
          .addClass("inactive");
      }
    });

    $(".descriptor-wrapper").show();
    $(".deposits-wrapper").hide();

    $("#verify-bank-form-descriptor")
      .off("submit")
      .on("submit", function (event) {
        event.preventDefault();

        $(".loader").css("display", "flex");
        $(".form__error-block").hide();

        $(this).find('input[type="submit"]').val("Please Wait...");
        $(this).find('input[type="submit"]').css("pointer-events", "none");

        var formData = {};

        $(this)
          .find("input, select, textarea")
          .each(function () {
            var input = $(this);
            formData[input.attr("data-name")] = input.val();
          });

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
              localStorage.setItem("bankStatus", "verified");
              localStorage.setItem("bankValid", true);

              $("#bank-valid-message").hide();
              $(".form__error-block").hide();
              $(".verify-bank-error-text").text("");
              $(".loader").hide();

              showToast("Success! Your bank account has been verified.");
              window.location.href = "/tenant/auto-pay-confirmation";
            } else {
              handleStripeVerificationError(
                response,
                "#verify-bank-form-descriptor",
                "descriptor_code"
              );
            }
          },
          error: function () {
            $(".verify-bank-error-text").text(
              "Something went wrong while verifying your bank account. Please try again."
            );
            $(".form__error-block").show();
            $(".loader").hide();

            $("#verify-bank-form-descriptor")
              .find('input[type="submit"]')
              .val("Continue")
              .css("pointer-events", "auto");
          },
        });
      });
  } else {
    $(".deposits-wrapper").show();
    $(".descriptor-wrapper").hide();

    $("#deposit_1, #deposit_2").off("input").on("input", function () {
      if (
        $("#deposit_1").val().length > 0 &&
        $("#deposit_2").val().length > 0
      ) {
        $("#verify-bank-form")
          .find('input[type="submit"]')
          .removeClass("inactive");
      } else {
        $("#verify-bank-form")
          .find('input[type="submit"]')
          .addClass("inactive");
      }
    });

    $("#verify-bank-form")
      .off("submit")
      .on("submit", function (event) {
        event.preventDefault();

        $(".loader").css("display", "flex");
        $(".form__error-block").hide();

        $(this).find('input[type="submit"]').val("Please Wait...");
        $(this).find('input[type="submit"]').css("pointer-events", "none");

        var formData = {};

        $(this)
          .find("input, select, textarea")
          .each(function () {
            var input = $(this);
            formData[input.attr("data-name")] = input.val();
          });

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
              localStorage.setItem("bankStatus", "verified");
              localStorage.setItem("bankValid", true);

              $("#bank-valid-message").hide();
              $(".form__error-block").hide();
              $(".verify-bank-error-text").text("");
              $(".loader").hide();

              showToast("Success! Your bank account has been verified.");
              window.location.href = "/tenant/auto-pay-confirmation";
            } else {
              handleStripeVerificationError(
                response,
                "#verify-bank-form",
                "amounts"
              );
            }
          },
          error: function () {
            $(".verify-bank-error-text").text(
              "Something went wrong while verifying your bank account. Please try again."
            );
            $(".form__error-block").show();
            $(".loader").hide();

            $("#verify-bank-form")
              .find('input[type="submit"]')
              .val("Continue")
              .css("pointer-events", "auto");
          },
        });
      });
  }
}
