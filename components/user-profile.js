document.addEventListener("DOMContentLoaded", function () {
  /* Profile Nav Button Functionality */

  // resend invite
  $("#resend-invite").on("click", function () {
    reSendInvite();
  });

  // archive user
  $("#archive-user").on("click", function () {
    let userStatus = "archived";
    updateUserStatus(userStatus);
  });

  // un-archive user
  $("#unarchive-user").on("click", function () {
    let userStatus = "active";
    updateUserStatus(userStatus);
  });

  // revoke access
  $("#access-revoked").on("click", function () {
    let userStatus = "access-revoked";
    updateUserStatus(userStatus);
  });

  // grant access
  $("#grant-access").on("click", function () {
    let userStatus = "active";
    updateUserStatus(userStatus);
  });

  /* --------------View Loades--------------- */

  // When user views a profile
  $("#profile").on("click", function () {
    $(".loader").css("display", "flex");
    setTimeout(function () {
      const urlParams = new URLSearchParams(window.location.search);
      let user_id = urlParams.get("id");
      loadUserProfile(user_id);

      $('#edit_permissions').change(function() {

        $('.loader').css('display', 'flex');
        // Get the checked state of the checkbox
        var isChecked = $(this).is(':checked');
      
        // Prepare the data to be sent
        var dataToSend = {
            edit_permissions: isChecked,
            user_uuid: user_id
        };
      
        // AJAX call to update the database
        $.ajax({
            url: localStorage.baseUrl + 'api:sElUkr6t/allow_landlord_edit', 
            type: 'POST', // or 'PUT', depending on your API
            headers: {
              Authorization: "Bearer " + localStorage.authToken,
            },
            data: dataToSend,
            success: function(response) {
      
              alert('Success! Landlord Settings Updated.');
              $('.loader').hide();
      
            },
            error: function(xhr, status, error) {
      
            }
        });
      });
    }, 100);
  });

  // When tenant logs in
  $("#my-profile").on("click", function () {
    $(".loader").css("display", "flex");
    loadUserProfile(localStorage.userId);
  });

  // Update Contact Info Form
  $("#admin-edit-contact-info-form").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();
    adminUpdateUser(this);
  });

  // Update Billing Info Form
  $("#admin-edit-billing-info-form").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();
    adminUpdateUser(this);
  });

  // Update Tenant Info Form
  $("#admin-edit-lease-info-form").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();
    adminUpdateUser(this);
  });
});

function reSendInvite() {
  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:sElUkr6t/resend_invite",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      reciever_id: localStorage.pageRefreshParam,
      sender_id: localStorage.userId,
    },
    success: function (response) {
      alert("Success! Email Was Sent.");
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function (error) {},
  });
}

function updateUserStatus(userStatus) {
  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:sElUkr6t/update_user_status",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      user_to_update: localStorage.pageRefreshParam,
      user_who_updated: localStorage.userId,
      status_update: userStatus,
    },
    success: function (response) {
      alert("Success!");
      $("[data-profile=user_status]").text(response.user_status);

      // update the buttons to reflect the users status
      if (response.user_status === "archived") {
        $("#archive-user").hide();
        $("#unarchive-user").show();
        $("#grant-access").hide();
      } else {
        $("#archive-user").show();
        $("#unarchive-user").hide();
      }

      if (response.user_status === "access-revoked") {
        $("#access-revoked").hide();
        $("#grant-access").show();
      } else {
        $("#access-revoked").show();
        $("#grant-access").hide();
      }
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function (jqXHR, textStatus, errorThrown) {
      // Assuming the server is sending back a JSON response with an error message under a 'message' key
      var errorMsg = "";
      if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
        errorMsg = jqXHR.responseJSON.message;
      } else {
        // Fallback error message if the expected one isn't present
        errorMsg = "An error occurred: " + textStatus;
      }
      alert(errorMsg);
    },
  });
}

function adminUpdateProfilePic() {
  /* ------------ Upload Profile Pic Functionality ------------ */

  const widget = uploadcare.Widget("#profileUploader", {
    crop: "1:1",
    imagesOnly: true,
    imageShrink: "1000x1000",
  });

  $(".profile-img-swap").click(function () {
    widget.openDialog();
    $(".loader").css("display", "flex");
  });

  widget.onUploadComplete(function (info) {
    $(".loader").css("display", "flex");
    // Get the URL of the uploaded image
    const imageUrl = info.cdnUrl;

    // Make the API call to save the image URL
    $.ajax({
      url: localStorage.baseUrl + "api:sElUkr6t/admin_edits_user",
      type: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: {
        editor_uuid: localStorage.userId,
        user_to_edit_uuid: localStorage.pageRefreshParam,
        profile_img: imageUrl,
      },
      success: function (response) {
        loadUserProfile(localStorage.pageRefreshParam);
        // Reset the Uploadcare widget
        var widget = uploadcare.Widget("[role=uploadcare-uploader]");
        widget.value(null);
      },
      error: function (error) {},
    });
  });
}

function loadUserProfile(user) {
  let apiResponse;
  adminUpdateProfilePic();

  // Fetch User Info
  $.ajax({
    url: localStorage.baseUrl + "api:sElUkr6t/get_user_profile",
    type: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: { user_id: user },
    success: function (response) {
      apiResponse = response;
      // hide nav buttons for users own profile
      if (response.user_id === localStorage.userId) {
        $(".profile__cta-bttn-wrapper").hide();
      } else {
        $(".profile__cta-bttn-wrapper").show();
      }

      // toggle the 'resend' invite button if user is pending or not
      if (response.user_status === "pending") {
        //alert('pending');
        $("#resend-invite").show();
      } else {
        $("#resend-invite").hide();
      }

      if (response.user_status === "active" && response.user_role === "Tenant") {
          // bank last 4
          $("[data-profile=bank_last_4]").text(
            response.tenant_info.bank_last_4
          );
      } else {
        $("[data-profile=bank_last_4]").hide();
      }

      /* --------Bind Global User Data------------ */

      // username
      $("[data-profile=user_name]").text(
        response.first_name + " " + response.last_name,
      );

      // user role
      $("[data-profile=user_role]").text(
        response.user_role
      );

      // profile img
      if (response.profile_img) {
        $("[data-profile=profile_img]").attr("src", response.profile_img);
      } else {
        $("[data-profile=profile_img]").attr(
          "src",
          "https://uploads-ssl.webflow.com/64ef87a21e6d1b3957b7416b/650da99e0c1b7c27da0f68c8_icons8-user%20(1).svg",
        );
      }

      // For each element with the 'data-profile' attribute
      $("[data-profile]").each(function () {
        // Get the field name from the attribute
        const fieldName = $(this).attr("data-profile");

        // Get the corresponding value from the response
        const fieldValue = response[fieldName];

        // Check if the fieldValue is not undefined, null, or an empty string
        if (
          fieldValue !== undefined &&
          fieldValue !== null &&
          fieldValue !== ""
        ) {
          // Update the value and the text of the element
          $(this).val(fieldValue).text(fieldValue);
        }
      });

      /* ------ Update UI Based on User Role -------*/

      $(".dynamic-user-tabs").hide(); // initially hide all user tabs components

      // UI for GPM Admins and Employee Profiles
      if (response.user_role === "Admin" || response.user_role === "Employee") {
        $("#employee-user-tabs").css("display", "flex"); // show GPM employee tab component
      }

      // UI for Landlord Profiles
      if (response.user_role === "Landlord") {
        $("#landlord-user-tabs").css("display", "flex"); // show landlord tab component
        $(".noi-chart-tab").click(); // default to chart view in finance tab
      }

      // UI for Tenant Profiles
      if (response.user_role === "Tenant") {
        localStorage.setItem(
          "userPropertyId",
          response.tenant_info.property_info.property_id,
        );

        $("#tenant-user-tabs").css("display", "flex"); // show tenant tab component

        // popuplate lease info card
        localStorage.setItem("unitId", response.tenant_info.unit_id);
        $("[data-profile=move_in_date]")
          .text(formatDateNoTime(response.tenant_info.move_in_date))
          .val(response.tenant_info.move_in_date);
        $("[data-profile=move_out_date]")
          .text(formatDateNoTime(response.tenant_info.move_out_date))
          .val(response.tenant_info.move_out_date);
        $("[data-profile=yearly_term]")
          .text(formatDateNoTime(response.tenant_info.yearly_term))
          .val(response.tenant_info.yearly_term);
        $("[data-profile=renewal_notice_deadline]")
          .text(formatDateNoTime(response.tenant_info.renewal_notice_deadline))
          .val(response.tenant_info.renewal_notice_deadline);
        $("[data-profile=yearly_rent_increase]")
          .text(response.tenant_info.yearly_rent_increase + "%")
          .val(response.tenant_info.yearly_rent_increase);
        $("[data-profile=security_deposit]")
          .text("$" + response.tenant_info.security_deposit)
          .val(response.tenant_info.security_deposit);
        $("[data-profile=monthly_rent]")
          .text("$" + response.tenant_info.monthly_rent)
          .val(response.tenant_info.monthly_rent);
        $("[data-profile=enable_payments]").prop("checked", response.tenant_info.enable_payments);
        $("[data-profile=auto_pay_date]")
          .text(response.tenant_info.auto_pay_date)
          .val(response.tenant_info.auto_pay_date);

        // bind unit address
        $("[data-profile=unit_property]").text(
          response.tenant_info.property_info.street,
        );
        $("[data-profile=unit]").text(response.tenant_info.unit_info.unit_name);
        $("[data-profile=unit_city]").text(
          response.tenant_info.property_info.city,
        );
        $("[data-profile=unit_state]").text(
          response.tenant_info.property_info.state,
        );
        $("[data-profile=unit_zip]").text(
          response.tenant_info.property_info.zip,
        );

        // bind unit info
        $("[data-profile=sqft]").text(response.tenant_info.unit_info.sqft);
        $("[data-profile=parking_spaces]").text(
          response.tenant_info.unit_info.parking_spaces,
        );
        $("[data-profile=tenants_proportionate_precentage]").text(
          response.tenant_info.unit_info.tenants_proportionate_precentage,
        );
        $("[data-profile=water_meter]").text(
          response.tenant_info.unit_info.water_meter,
        );
        $("[data-profile=electricity_meter]").text(
          response.tenant_info.unit_info.electricity_meter,
        );
        $("[data-profile=hvac]").text(response.tenant_info.unit_info.hvac);
      }

      $("[profile-tab-button='overview']").click(); // default to overview tab

      /* Nav Buttons Based on User Status */
      // update the buttons to reflect the users status
      if (response.user_status === "archived") {
        $("#archive-user").hide();
        $("#grant-access").hide();
        $("#unarchive-user").show();
      } else {
        $("#archive-user").show();
        $("#unarchive-user").hide();
      }

      if (response.user_status === "access-revoked") {
        $("#access-revoked").hide();
        $("#grant-access").show();
      } else {
        $("#access-revoked").show();
        $("#grant-access").hide();
      }
    },
    complete: function (response) {
      // Populate units select field when user edits lease info
      $("[modal='admin-edit-lease-info']").click(function () {
        // Fetch all units and populate the unit select field (for adding tenants and assigning to a unit)
        $.ajax({
          url: localStorage.baseUrl + "api:t2-fjTTj/get_units",
          method: "GET",
          dataType: "json",
          success: function (response) {
            // Clear previous options in the select field
            $("[data-profile='tenant_unit']").empty();

            // Add the placeholder to the select field
            $("[data-profile='tenant_unit']").append(
              $("<option>", {
                value: "0",
                text: "Change Unit",
                selected: true,
              }),
            );

            // Loop through each unit in the response
            $.each(response, function (index, unit) {
              // Create the option text
              var optionText =
                unit.property_info.street + " / " + unit.unit_name;

              // Append the new option to the select field
              $("[data-profile='tenant_unit']").append(
                $("<option>", {
                  value: unit.id,
                  text: optionText,
                }),
              );
            });
          },
          complete: function () {},
          error: function (error) {
            console.error("Error fetching units:", error);
          },
        });
      });

      const urlParams = new URLSearchParams(window.location.search);
      let user_id = urlParams.get("id");

      if (apiResponse.user_role === "Tenant") {
        dashActivityLog("user", apiResponse.user_id);

        $("[element=unit-grid-block]").click(function () {
          $("#unit").click();
          localStorage.setItem("pageId", "unit"); // update the page ID
          localStorage.setItem(
            "pageRefreshParam",
            apiResponse.tenant_info.unit_info.unit_id,
          ); // set the refresh parameter
          localStorage.setItem(
            "unitRecId",
            apiResponse.tenant_info.unit_info.id,
          ); // store the unit rec id
          localStorage.setItem(
            "activeTenant",
            apiResponse.tenant_info.unit_info.active_tenant,
          ); // set the active tenant
          localStorage.setItem(
            "activeTenantUserId",
            apiResponse.tenant_info.unit_info.user_id,
          ); // set the active tenant
          localStorage.setItem(
            "activeTenantUserUuid",
            apiResponse.tenant_info.unit_info.active_tenant_user_id,
          ); // set the active tenant
          history.pushState(
            "unit",
            null,
            "/app/unit?id=" + apiResponse.tenant_info.unit_info.unit_id,
          ); // update pushstate
        });
      } else {
        activityLog("user", user_id);
      }

      $(".loader").hide();
    },
    error: function (error) {},
  });
}

function adminUpdateUser(form) {
  // Handle 'Loading' State
  $(".modal__block").hide();
  $(".loader").css("display", "flex");

  const formData = {};

  // Iterate through form inputs with data-api-input attribute and collect key-value pairs
  $(form)
    .find("[data-api-input]")
    .each(function () {
      const input = $(this);
      const key = input.data("api-input"); // Get the data attribute value
      const value = input.val();
      formData[key] = value;
    });

  // Add additional data to formData
  formData["editor_uuid"] = localStorage.userId;
  formData["user_to_edit_uuid"] = localStorage.pageRefreshParam;
  formData["user_property_id"] = localStorage.userPropertyId;
  formData["enable_payments"] = $('#edit_enable_payments').is(':checked');
  formData["monthly_rent"] = $("[data-api-unit='monthly_rent']").val();

  
  // Make an AJAX POST request
  $.ajax({
    url: localStorage.baseUrl + "api:sElUkr6t/admin_edits_user",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: JSON.stringify(formData), // Convert formData to JSON
    contentType: "application/json", // Set the content type to JSON
    success: function (response) {   
      loadUserProfile(localStorage.pageRefreshParam);
    },
    error: function (error) {
      // Handle the error here
    },
  });
}

// for tenants
function dashActivityLog(type, user, property, unit) {
  var dashActivityLogContainer = $(
    ".dyn-container__activity-monitor__is--dashboard",
  );

  $.ajax({
    url: localStorage.baseUrl + "api:ZQGsxCfJ/get_activity_log",
    method: "GET",
    dataType: "json",
    data: {
      property_rec_id: property,
      user_id: user,
      unit_id: unit,
      type: type,
    },
    success: function (response) {
      var sampleLogItem = $(".dash-activity-log-sample-wrapper").find(
        ".dyn-item__activity-item__is--dashboard",
      );

      dashActivityLogContainer.empty();

      // loop through each logItem
      response.forEach((logItem) => {
        // clone the sample card for the logItem and append to users container
        let actLogItem = $(sampleLogItem)
          .clone()
          .appendTo(dashActivityLogContainer);

        // bind the logItem's data to the cloned card
        actLogItem
          .find("[data-dash-activity-log='timestamp']")
          .text(formatDateToCustomFormat(logItem.created_at));
        actLogItem
          .find("[data-dash-activity-log='description']")
          .text(logItem.description);
        actLogItem
          .find("[data-dash-activity-log='user']")
          .text(logItem.first_name + " " + logItem.last_name);
        actLogItem
          .find("[data-dash-activity-log='role']")
          .text(logItem.user_role);
      });
    },
    complete: function () {},
    error: function (error) {},
  });
}

// for all other users
function activityLog(type, user, property, unit, view) {
  var activityLogContainer = $("[dynamic-container=modal-activity-log]");

  $.ajax({
    url: localStorage.baseUrl + "api:ZQGsxCfJ/get_activity_log",
    method: "GET",
    dataType: "json",
    data: {
      property_rec_id: property,
      user_id: user,
      unit_id: unit,
      type: type,
    },
    success: function (response) {
      if (view === "dashboard") {
      } else {
        var sampleLogItem = $(".modal-activity-log-sample-wrapper").find(
          "[data='log-sample-item']",
        );

        activityLogContainer.empty();

        // loop through each logItem
        response.forEach((logItem) => {
          // clone the sample card for the logItem and append to users container
          let actLogItem = $(sampleLogItem)
            .clone()
            .appendTo(activityLogContainer);

          // bind the logItem's data to the cloned card
          actLogItem
            .find("[data-activity-log='timestamp']")
            .text(formatDateToCustomFormat(logItem.created_at));
          actLogItem
            .find("[data-activity-log='description']")
            .text(logItem.description);
        });
      }
    },
    complete: function () {
      activityLogContainer
        .find(".dyn-item__user:last")
        .css("border-bottom", "none");
      $(".loader").hide();
    },
    error: function (error) {},
  });
}


