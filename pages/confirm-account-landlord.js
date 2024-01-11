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
      confirmLandlord();
    },
    error: function (error) {
      //run code if they are not logged in
      alert("You are not logged in");
      window.location.href = "/app/login";
    },
  });
}

function confirmLandlord() {
  /* ------- Disable Form Submit on "Enter Key" ---------*/
  var form = document.getElementById("confirm-account-form-landlord");

  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.keyCode === 13) {
      e.preventDefault();
      return false;
    }
  });

  /* ------ Populate Form and Local Storage with User Data  ----- */
  function getUrlParameter(name) {
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    const results = regex.exec(window.location.href);

    if (!results) return null;
    if (!results[2]) return "";

    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }
  // get user id from url param
  const userId = getUrlParameter("user");

  // make api call, retrieve user
  if (userId) {
    $.ajax({
      url: localStorage.baseUrl + "api:sElUkr6t/get_single_landlord",
      type: "GET",
      headers: {
        'Content-Type': "application/json",
        'Authorization': "Bearer " + localStorage.authToken
      },
      data: {
        user_id: userId,
      },
      success: function (response) {
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

        // set local storage
        localStorage.setItem("landlordRecId", response.landlord_info.id);
        localStorage.setItem("userRecId", response.id);
        localStorage.setItem("userId", userId);

        // hide loader
        $(".loader").css("display", "none");
      },
      error: function (error) {
        alert("Something went wrong while fetching data");
      },
    });
  }

  /* ----- Get User IP Address for Stripe TOS ------- */
  // Declare the ipAddress variable in an outer scope so that it's accessible to both the fetch callback and the form submission handler
  let ipAddress = null;

  // Get IP address api call
  fetch("https://api.ipify.org?format=json")
    .then((response) => response.json())
    .then((data) => {
      ipAddress = data.ip;
      // Send this IP to your server and use it in the next cURL request or any other necessary actions
    })
    .catch((error) => {
      console.error("Error fetching IP:", error);
      location.reload();
    });

  /* -------- Handle Form Submission ----------*/
  $("#confirm-account-form-landlord").submit(function (event) {
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

    // Add ipAddress to formData if it's available
    if (ipAddress) {
      formData["ip_address"] = ipAddress;
    }
    formData["landlord_rec_id"] = localStorage.getItem("landlordRecId");
    formData["user_rec_id"] = localStorage.getItem("landlordRecId");
    formData["user_id"] = localStorage.getItem("userId");

    // Make an AJAX POST request to the specified API endpoint
    $.ajax({
      url: localStorage.baseUrl + "api:sElUkr6t/activate_account_landlord",
      type: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: formData,
      success: function (response) {
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
