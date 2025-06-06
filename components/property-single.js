
document.addEventListener("DOMContentLoaded", function () {
  
  createUnit();
  editProperty();
  messageBroadcast();

  /* ------------- Load View ----------------- */
  $("#property").on("click", function () {
    $(".loader").css("display", "flex");
    setTimeout(function () {
      const urlParams = new URLSearchParams(window.location.search);
      let property_id = urlParams.get("id");
      loadProperty(property_id);
    }, 100);
  });


  /* ------ Nav button functionality -------------*/

  // --- toggle units & NOI views
  $("[component='noi']").hide();

  $("[component-link='noi']").click(function () {
    $("[component='noi']").show();
    $("[component='units-feed']").hide();
  });

  $("[component-link='units-feed']").click(function () {
    $("[component='noi']").hide();
    $("[component='units-feed']").show();
  });

  // --- archive/un-archive property
  $("#archive-property-modal-button")
    .off("click")
    .on("click", function () {
      propertyArchivedState("archived");
    });

  $("#unarchive-property-modal-button")
    .off("click")
    .on("click", function () {
      propertyArchivedState("active");
    });

  // --- manage users
  $("[modal='manage-users']").click(function () {
    $("[api-button='load_assigned_users']").click();
  });

  // --- activity log
  $("[modal='property-activity-log']").click(function () {
    activityLog("property", "", localStorage.propertyRecId);
  });

  /* ------- Manage Users Component --------- */

  // load the users based on the tab button clicked

  // remove users is clicked
  $("[api-button='load_assigned_users']").click(function () {
    $("[data-property-user='dyn-item']").removeClass("selected-for-removal");
    managePropertyUsers($("[dyn-container='remove-users']"), "assigned_users");
  });

  // add employees is clicked
  $("[api-button='load_employees']").click(function () {
    $("[data-property-user='dyn-item']").removeClass("selected-add-user");
    managePropertyUsers($("[dyn-container='add-employees']"), "employees");
  });

  // add landlords is clicked
  $("[api-button='load_landlords']").click(function () {
    $("[data-property-user='dyn-item']").removeClass("selected-add-user");
    managePropertyUsers($("[dyn-container='add-landlords']"), "landlords");
  });
});

function loadProperty(property_id) {
  $(".noi__component").hide(); // hide NOI Component
  $(".property-units-component").show(); // show units by default

  var unitsContainer = $(".dyn-container__property-units");

  $.ajax({
    url: localStorage.baseUrl + "api:aJp1AxHb/get_single_property",
    type: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      property_id: property_id,
    },
    success: function (response) {
      /* Dynamically Show Archive Property Buttons in Top Menu */

      if (response.status !== "archived") {
        $("[modal=archive-property]").show();
        $("[modal=unarchive-property]").hide();
      } else {
        $("[modal=archive-property]").hide();
        $("[modal=unarchive-property]").show();
      }

      localStorage.setItem("propertyId", response.property_id);

      /* ---- Bind Data for Create Unit Modal Form ---- */

      $("[data-property=street]").text(response.street);
      $("[data-api-input=commission]").val(response.default_commission);
      $("[data-property=default_landlord]").text(
        response.default_landlord_info.display_name
      );
      $("[data-property=bank_last_4]").text(
        response.default_landlord_info.stripe_bank_last_4,
      );

      // Get the select element
      const defaultLandlordSelect = $("#bank_account-select");
      $("#bank_account-select").empty();

      // Create a new option element
      const newOption = $("<option>", {
        value: "no-update", // Set the value for the new option
        text:
          response.default_landlord_info.display_name +
          " " +
          " : " +
          response.default_landlord_info.stripe_bank_last_4 +
          "  (Dafult Bank Account For Property)", // Set the text for the new option
        selected: true, // Set the new option as the default selection
      });

      // Add the new option as the first option (default) in the select element
      defaultLandlordSelect.prepend(newOption);

      // Create a new option element
      const defaultOption = $("<option>", {
        value: "link-new-bank", // Set the value for the new option
        text: "Link New Bank Account",
        // Set the new option as the default selection
      });

      defaultLandlordSelect.append(defaultOption);

      /* ------- Bind Data to Edit Property Modal -------*/

      $("#edit-property-form")
        .find('[data-api-input="street"]')
        .val(response.street);
      $("#edit-property-form")
        .find('[data-api-input="city"]')
        .val(response.city);
      $("#edit-property-form")
        .find('[data-api-input="state"]')
        .val(response.state);
      $("#edit-property-form").find('[data-api-input="zip"]').val(response.zip);
      $("#edit-property-form")
        .find('[data-api-input="default_commission"]')
        .val(response.default_commission);
      $("#edit-property-form")
        .find('[data-api-input="landlord_id"]')
        .val(response.default_landlord);

      /* --- Add the Units ---- */

      var sampleUnit = $(".unit-sample-wrapper").find(
        "[data='unit-sample-item']",
      );

      unitsContainer.empty();

      if (response.units.length > 0 && response.units !== null) {
        // loop through each unit
        response.units.forEach((unit) => {

          // clone the sample card for the unit and append to users container
          let unitItem = $(sampleUnit).clone().appendTo(unitsContainer);

          // bind the unit's data to the cloned card
          unitItem.attr("id", unit.unit_id);
          unitItem.find("[data-property='unit_name']").text(unit.unit_name);

          if (unit.active_tenant_info) {
            unitItem
              .find("[data-property='unit_tenant']")
              .text(
                unit.active_tenant_info.user_info.display_name
              );
            let formattedRent = Number(unit.active_tenant_info.monthly_rent).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
            
            unitItem
              .find("[data-property='unit_monthly_rent']")
              .text("$" + formattedRent);

            let formattedBalance = Number(unit.active_tenant_info.balance).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
            unitItem
              .find("[data-property='unit_balance']")
              .text("$" + formattedBalance);

            let formattedNextMonth = Number(unit.active_tenant_info.next_month_payment).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
            unitItem
              .find("[data-property='unit_next_charges']")
              .text("$" + formattedNextMonth);
            unitItem
              .find("[data-property='unit_move_in']")
              .text(formatDateNoTime(unit.active_tenant_info.move_in_date));
            unitItem
              .find("[data-property='unit_move_out']")
              .text(formatDateNoTime(unit.active_tenant_info.move_out_date));
          }


            if (unit.status === 'archived'){
              unitItem.find('.archived-unit-icon').show();
            } else {
              unitItem.find('.archived-unit-icon').hide();
            }

            // click handler to direct to each unit page
            $(unitItem).click(function () {
              if (unit.active_tenant === null){
                localStorage.setItem("pageId", "unit"); // update the page ID
                localStorage.setItem("pageRefreshParam", unit.unit_id); // set the refresh parameter
                localStorage.setItem("unitRecId", unit.id); // store the unit rec id
                history.pushState("unit", null, "/app/unit?id=" + unit.unit_id); // update pushstate
                localStorage.setItem('unitEmpty','true');
                $("#unit").click();
              } else {
                $("#unit").click();
                localStorage.setItem("pageId", "unit"); // update the page ID
                localStorage.setItem("pageRefreshParam", unit.unit_id); // set the refresh parameter
                localStorage.setItem("unitRecId", unit.id); // store the unit rec id
                localStorage.setItem("activeTenant", unit.active_tenant); // set the active tenant
                localStorage.setItem(
                  "activeTenantUserId",
                  unit.active_tenant_info.user_id,
                ); // set the active tenant
                localStorage.setItem(
                  "activeTenantUserUuid",
                  unit.active_tenant_info.user_info.user_id,
                ); // set the active tenant
                history.pushState("unit", null, "/app/unit?id=" + unit.unit_id); // update pushstate
                localStorage.removeItem('unitEmpty');
              }

            });
      
        });
      } else {
        unitsContainer.empty();
      }
    },
    complete: function () {
      
      $(".loader").hide();
      /*---- Create Unit Form UX/UI ----*/
      function toggleBankUnitBlock() {
        var selectedOption = $("#bank_account-select").val();
    
        // Toggle visibility of the bank info block based on the selected option
        if (selectedOption === "no-update") {
            $("#bank-info-block").hide();
            $('#create-default-landlord').attr('required', false);
            $('#edit-account-name').attr('required', false);
            $('#edit-account-type').attr('required', false);
            $('#edit-account-number').attr('required', false);
            $('#edit-routing-number').attr('required', false);
        } else {
            $("#bank-info-block").show();
            $('#create-default-landlord').attr('required', true);
            $('#edit-account-name').attr('required', true);
            $('#edit-account-type').attr('required', true);
            $('#edit-account-number').attr('required', true);
            $('#edit-routing-number').attr('required', true);
        }
    }
      
      // Event listeners for dropdown changes
      $("#bank_account-select").change(toggleBankUnitBlock);
      $("#create-default-landlord").change(toggleBankUnitBlock);
      $("#bank-info-block").css("display", "none");
    },
    error: function (error) {},
  });
}

function editProperty() {
  // Form Submission API Call
  $("#edit-property-form").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Handle 'Loading' State
    $(".modal__block").hide();
    $(".loader").css("display", "flex");

    const formData = {};

    // Iterate through form inputs with data-api-input attribute and collect key-value pairs
    $(this)
      .find("[data-api-input]")
      .each(function () {
        const input = $(this);
        const key = input.data("api-input"); // Get the data attribute value
        const value = input.val();
        formData[key] = value;
      });

    // Add additional data to formData
    formData["user_uuid"] = localStorage.userId;
    formData["property_rec_id"] = localStorage.propertyRecId;

    // Make an AJAX POST request
    $.ajax({
      url: localStorage.baseUrl + "api:aJp1AxHb/edit_property",
      type: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: JSON.stringify(formData), // Convert formData to JSON
      contentType: "application/json", // Set the content type to JSON
      success: function (response) {
        $(".loader").hide();
      },
      complete: function () {
        $("#edit-property-form")[0].reset();
        $("#create-property-form")[0].reset();
        loadProperty(localStorage.pageRefreshParam);

        // Reset the Uploadcare widget
        var widget = uploadcare.Widget("#edit-property-img");
        widget.value(null);
      },
      error: function (error) {
        // Handle the error here
      },
    });
  });
}

function propertyArchivedState(archivedState) {
  $(".loader").css("display", "flex");

  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:aJp1AxHb/archive_property",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      user_uuid: localStorage.userId,
      property_rec_id: localStorage.propertyRecId,
      archived_state: archivedState,
    },
    success: function (response) {
      $(".modal__block").hide();
    },
    complete: function () {
      $("#properties").click();
      $(".loader").hide();
    },
    error: function (error) {
      // Handle the error here
    },
  });
}

function createUnit() {

  // Form Submission API Call
  $("#create-unit-form").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Handle 'Loading' State
    $(".modal__block").hide();
    $(".loader").css("display", "flex");

    const formData = {};

    // Iterate through form inputs with data-api-input attribute and collect key-value pairs
    $(this)
      .find("[data-api-input]")
      .each(function () {
        const input = $(this);
        const key = input.data("api-input"); // Get the data attribute value
        const value = input.val();
        formData[key] = value;
      });

    // Add additional data to formData
    formData["created_by"] = localStorage.userRecId;
    formData["property_id"] = localStorage.propertyRecId;

    // Make an AJAX POST request
    $.ajax({
      url: localStorage.baseUrl + "api:t2-fjTTj/create_unit",
      type: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: JSON.stringify(formData), // Convert formData to JSON
      contentType: "application/json", // Set the content type to JSON
      success: function (response) {
        $("#create-unit-form")[0].reset();
        $(".loader").hide();
      },
      complete: function(){
        $("#property").click();
      },
      error: function (error) {
        // Handle the error here
      },
    });
  });
}

/* -- Fucntions for Manage Users Component -- */

function managePropertyUsers(injectContainer, userType) {
  var selectedUserIds = []; // Array to store selected user IDs
  var userCounterElement = $("[data-property=user-counter]");
  var usersContainer = injectContainer;

  // Hide the user counter element initially
  userCounterElement.hide();

  $.ajax({
    url: localStorage.baseUrl + "api:aJp1AxHb/manage_property_load_users",
    type: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      property_rec_id: localStorage.propertyRecId,
      user_type: userType,
    },
    success: function (response) {
      selectedUserIds.splice(0); // clear the selected user array

      var sampleUser = $(".user-item-sample-wrapper").find(
        "[data-property-user='dyn-item']"
      );

      usersContainer.empty();

      // Separate users
      const defaultLandlordUser = response.users.find(
        (u) => u.id === response.default_landlord
      );

      const otherUsers = response.users.filter(
        (u) => u.user_role !== "Tenant" && u.id !== response.default_landlord
      );

      const orderedUsers = [];
      if (defaultLandlordUser) orderedUsers.push(defaultLandlordUser);
      orderedUsers.push(...otherUsers);

      orderedUsers.forEach((user) => {
        // Clone the sample card for the user and append to users container
        let userItem = $(sampleUser).clone().appendTo(usersContainer);

        // Set user ID
        userItem.attr("id", user.id);

        // Profile image
        if (user.profile_img) {
          userItem
            .find(".users__dyn-item__img")
            .attr("src", user.profile_img);
        }

        // Name (leave as-is to keep truncating intact)
        userItem
          .find("[data-property-user='name']")
          .text(user.display_name);

        // Role (add "Default" prefix if this is the default landlord)
        const roleText =
          user.id === response.default_landlord
            ? "Default " + user.user_role
            : user.user_role;

        userItem
          .find("[data-property-user='user_role']")
          .text(roleText);

        // Add class to visually mark the default landlord (optional styling)
        if (user.id === response.default_landlord) {
          userItem.addClass("default-landlord");
        }

        // Only bind click for non-default landlords
        if (user.id !== response.default_landlord) {
          userItem.click(function () {
            if (userType === "assigned_users") {
              userItem.toggleClass("selected-for-removal");

              var userId = user.id;
              var index = selectedUserIds.indexOf(userId);

              if (index === -1) {
                selectedUserIds.push(userId);
              } else {
                selectedUserIds.splice(index, 1);
              }

              if (selectedUserIds.length > 0) {
                userCounterElement.text(selectedUserIds.length);
                userCounterElement.show();
              } else {
                userCounterElement.hide();
              }
            }

            if (userType === "employees" || userType === "landlords") {
              userItem.toggleClass("selected-add-user");

              var userId = user.id;
              var index = selectedUserIds.indexOf(userId);

              if (index === -1) {
                selectedUserIds.push(userId);
              } else {
                selectedUserIds.splice(index, 1);
              }

              if (selectedUserIds.length > 0) {
                userCounterElement.text(selectedUserIds.length);
                userCounterElement.show();
              } else {
                userCounterElement.hide();
              }
            }
          });
        }
      });
    },
    complete: function () {
      $(".loader").hide();

      $("[api-button='remove_users_button']")
        .off("click")
        .on("click", function () {
          updateAssignedUsers(selectedUserIds, "assigned_users");
        });

      $("[api-button='add_employees_button']")
        .off("click")
        .on("click", function () {
          updateAssignedUsers(selectedUserIds, "employees");
        });

      $("[api-button='add_landlords_button']")
        .off("click")
        .on("click", function () {
          updateAssignedUsers(selectedUserIds, "landlords");
        });
    },
    error: function (error) {},
  });
}

function updateAssignedUsers(selectedUserIds, userType) {
  $(".loader").css("display", "flex");
  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:aJp1AxHb/update_property_users",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      user_ids: selectedUserIds,
      property_id: localStorage.propertyRecId,
      user_type: userType,
    },
    success: function (response) {},
    complete: function () {
      showToast("Success! Users Updated!");
      $(".modal__block").hide();
      $(".loader").hide();
    },
    error: function (error) {},
  });
}

function messageBroadcast() {
  // Form Submission API Call
  $("#message-broadcast-form").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Handle 'Loading' State
    $(".modal__block").hide();
    $(".loader").css("display", "flex");

    const formData = {};

    // Get the message input value and replace line breaks with '\n'
    const messageInput = $("#broadcast-message");
    const messageValue = messageInput.val().replace(/\r?\n/g, "\n");

    // Collect other key-value pairs from form inputs
    $(this)
      .find("[data-api-input]")
      .each(function () {
        const input = $(this);
        const key = input.data("api-input"); // Get the data attribute value
        const value = input.val();
        formData[key] = value;
      });

    // Add the message value to formData
    formData["broadcast_message"] = messageValue;
    formData["user_uuid"] = localStorage.userId;
    formData["property_uuid"] = localStorage.pageRefreshParam;

    // Make an AJAX POST request
    $.ajax({
      url: localStorage.baseUrl + "api:LEAuXkTc/property_message_broadcast",
      type: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: JSON.stringify(formData), // Convert formData to JSON
      contentType: "application/json", // Set the content type to JSON
      success: function (response) {
        $(".loader").hide();
        showToast("Success! Message Sent!");
      },
      complete: function () {
        // Reset Form
        $("#message-broadcast-form")[0].reset();

        // Reset the Uploadcare widget
        var widget = uploadcare.Widget("#broadcast-media");
        widget.value(null);
      },
      error: function (error) {
        // Handle the error here
      },
    });
  });
}

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
          actLogItem
            .find("[data-activity-log='action_user']")
            .text(logItem.action_user);
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
