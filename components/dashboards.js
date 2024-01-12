document.addEventListener("DOMContentLoaded", function () {
  /* Unit Dashboard */
  $("#unit").on("click", function () {
    $(".loader").css("display", "flex"); // show loader
    $("#unit-overview-bttn").click(); // defualt to overview tab

    setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      let unit_id = urlParams.get("id");
      loadUnitAndTenantData(unit_id); // load unit
      
    }, 100);
  });

  /* Landlord Dashboard */
  $("#dashboard").on("click", function () {
    $(".loader").css("display", "flex"); // show loaded
    dashActivityLog("landlord-dashboard", localStorage.userId);
    loadConvosInDashboard(localStorage.userId);
    loadWorkOrders("assigned_user", localStorage.userRecId, "", "dashboard"); // load in workorders
    loadPropertiesInDashboard(localStorage.userId);
    loadActiveTenants(localStorage.userRecId);
  });
});

function loadUnitAndTenantData(unit) {
  // Make API Call
  if (localStorage.unitEmpty === 'true') {
    
    $.ajax({
      url: localStorage.baseUrl + "api:t2-fjTTj/load_unit",
      type: "GET",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: {
        unit_id: unit,
      },
      success: function (response) {
        /* Set Local Storage */
        localStorage.setItem("propertyRecId", response.property_info.id);
        localStorage.setItem("unitRecId", response.id);
        localStorage.setItem("unitId", response.unit_id);
  
        /* Populate Banner Title */
        $("[data-unit='property_street']").text(response.property_info.street);
        $("[data-unit='unit_name']").text(response.unit_name);
  
        /* Populate Unit Info Card */
        $("[data-unit='sqft']").text(response.sqft);
        $("[data-unit='parking_spaces']").text(response.parking_spaces);
        $("[data-unit='tenants_proportionate_precentage']").text(
          response.tenants_proportionate_precentage + "%",
        );
        $("[data-unit='water_meter']").text(response.water_meter);
        $("[data-unit='electricity_meter']").text(response.electricity_meter);
        $("[data-unit='hvac']").text(response.hvac);
  
      },
      complete: function () {
        loadPropertyUsers();
        loadWorkOrders("unit", "", localStorage.unitRecId, "dashboard"); // load in workorders
        dashActivityLog("unit", "", "", localStorage.unitRecId);
        $(".loader").hide();
      },
      error: function (error) {},
    });
  } else {
    $.ajax({
      url: localStorage.baseUrl + "api:t2-fjTTj/load_unit",
      type: "GET",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: {
        unit_id: unit,
      },
      success: function (response) {
        /* Set Local Storage */
        localStorage.setItem("propertyRecId", response.property_info.id);
        localStorage.setItem("unitRecId", response.id);
        localStorage.setItem("unitId", response.unit_id);
        localStorage.setItem("activeTenant", response.active_tenant);
        localStorage.setItem(
          "activeTenantUserId",
          response.active_tenant_info.user_info.id,
        );
        localStorage.setItem(
          "activeTenantUserUuid",
          response.active_tenant_info.user_info.user_id,
        );
  
        /* Populate Banner Title */
        $("[data-unit='property_street']").text(response.property_info.street);
        $("[data-unit='unit_name']").text(response.unit_name);
  
        /* Populate Unit Info Card */
        $("[data-unit='sqft']").text(response.sqft);
        $("[data-unit='parking_spaces']").text(response.parking_spaces);
        $("[data-unit='tenants_proportionate_precentage']").text(
          response.tenants_proportionate_precentage + "%",
        );
        $("[data-unit='water_meter']").text(response.water_meter);
        $("[data-unit='electricity_meter']").text(response.electricity_meter);
        $("[data-unit='hvac']").text(response.hvac);
  
        /* Populate Lease Info Card */
        $("[data-unit='move_in_date']").text(
          formatDateNoTime(response.active_tenant_info.move_in_date),
        );
        $("[data-unit='move_out_date']").text(
          formatDateNoTime(response.active_tenant_info.move_out_date),
        );
        $("[data-unit='monthly_rent']").text(
          "$" + response.active_tenant_info.monthly_rent,
        );
        $("[data-unit='yearly_term']").text(
          formatDateNoTime(response.active_tenant_info.yearly_term),
        );
        $("[data-unit='yearly_rent_increase']").text(
          response.active_tenant_info.yearly_rent_increase + "%",
        );
        $("[data-unit='renewal_notice_deadline']").text(
          formatDateNoTime(response.active_tenant_info.renewal_notice_deadline),
        );
        $("[data-unit='security_deposit']").text(
          "$" + response.active_tenant_info.security_deposit,
        );
  
        /* Populate Balance Card */
        $("[data-unit='balance']").text(
          "$" + response.active_tenant_info.security_deposit,
        );
        $("[data-unit='next_months_charges']").text(
          "$" + response.active_tenant_info.next_months_charges,
        );
  
        /* Insurance Doc */
        $('[data-unit="insurance_doc"]').click(function () {
          window.open(response.active_tenant_info.insurance_doc, "_blank");
        });
  
        /* Populate Active Tenant Card */
        if (response.active_tenant_info.user_info.profile_img) {
          $("[data-unit='tenant_profile_img']").attr(
            "src",
            response.active_tenant_info.user_info.profile_img,
          );
        }
        $("[data-unit='tenant_name']").text(
          response.active_tenant_info.user_info.first_name +
            " " +
            response.active_tenant_info.user_info.last_name,
        );
        $("[data-unit='tenant_company']").text(
          response.active_tenant_info.user_info.company,
        );
        $("[data-unit='tenant_email']").text(
          response.active_tenant_info.user_info.email,
        );
        $("[data-unit='tenant_mobile_phone']").text(
          response.active_tenant_info.user_info.mobile_phone,
        );
        $("[data-unit='tenant_work_phone']").text(
          response.active_tenant_info.user_info.work_phone,
        );
        $(".unit-grid__user__name-wrapper")
          .off("click")
          .click(function () {
            var fetchedUserId = response.active_tenant_info.user_info.user_id;
            $("#profile").click();
            localStorage.setItem("pageId", "profile");
            localStorage.setItem(
              "pageRefreshParam",
              response.active_tenant_info.user_info.user_id,
            );
            localStorage.setItem(
              "userProfileRecId",
              response.active_tenant_info.user_info.id,
            );
            history.pushState(
              "profile",
              null,
              "/app/profile?id=" + fetchedUserId,
            );
          });
      },
      complete: function () {
        loadUnitBalances(unit_id);
        loadPropertyUsers();
        loadWorkOrders("unit", "", localStorage.unitRecId, "dashboard"); // load in workorders
        loadConvosInDashboard(localStorage.activeTenantUserUuid);
        dashActivityLog("unit", "", "", localStorage.unitRecId);
        $(".loader").hide();
      },
      error: function (error) {},
    });
  }

}

function loadPropertyUsers() {
  var employeesContainer = $(".dyn-container__unit-grid__members");
  var landlordsContainer = $(".dyn-container__unit-grid__landlords");

  $.ajax({
    url: localStorage.baseUrl + "api:t2-fjTTj/load_unit_users_dashbaord", // Use the provided endpoint URL
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    dataType: "json",
    data: {
      property_rec_id: localStorage.propertyRecId,
    },

    success: function (response) {
      var sampleItem = $(".grid-user-sample-wrapper").find(
        ".dyn-item__unit-grid__user",
      );

      employeesContainer.empty();
      landlordsContainer.empty();

      response.forEach((user) => {
        let dynItem = $(sampleItem).clone(); //.appendTo(dynContainer);

        dynItem
          .find("[data-unit-user='name']")
          .text(user.first_name + " " + user.last_name); // bind name

        // bind company name
        if (user.company_name) {
          dynItem.find("[data-unit-user='company']").text(user.company_name);
        } else {
          dynItem.find("[data-unit-user='company]").hide();
        }

        // bind profile image
        if (user.profile_img) {
          dynItem
            .find("[data-unit-user='profile_img']")
            .attr("src", user.profile_img);
        }

        if (user.user_role === "Landlord") {
          dynItem.appendTo(landlordsContainer);
        } else if (user.user_role === "Employee") {
          dynItem.appendTo(employeesContainer);
        }

        $(dynItem).click(function () {
          localStorage.setItem("pageId", "profile");
          localStorage.setItem("pageRefreshParam", user.user_id);
          localStorage.setItem("userProfileRecId", user.id);
          history.pushState(
            "profile",
            null,
            "/app/profile?id=" + localStorage.pageRefreshParam,
          );
          $("#profile").click();
        });
      });
    },
  });
}

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

function loadConvosInDashboard(target) {
  var dashCommContainer = $(".dyn-container__unit-grid__convos");
  let activeUserId;

  // Make API Call
  $.ajax({
    url:
      localStorage.baseUrl + "api:LEAuXkTc/fetch_user_conversations_dashboard",
    type: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      user_uuid: target,
    },
    success: function (response) {
      activeUserId = target;

      var sampleItem = $(".grid-user-sample-wrapper").find(
        ".dyn-item__unit-grid__convo",
      );
      dashCommContainer.empty();

      response.forEach((convo) => {
        let dashConvoItem = $(sampleItem).clone().appendTo(dashCommContainer);

        dashConvoItem.attr("id", convo.conversation_sid);

        // bind data
        dashConvoItem
          .find("[data-comm-grid='timestamp']")
          .text(formatDateToCustomFormat(convo.attributes.last_updated));
        dashConvoItem
          .find("[data-comm-grid='convo_title']")
          .text(convo.friendly_name);
        dashConvoItem
          .find("[data-comm-grid='convo_title']")
          .text(convo.friendly_name);

        if (convo.attributes.convo_type !== "blast") {
          const participants = convo.attributes.convo_participants;
          let otherParticipantInfo = null;

          participants.forEach(function (participant) {
            if (participant.id !== activeUserId) {
              otherParticipantInfo = participant.info;
              dashConvoItem
                .find("[data-comm-grid='last_message_sender']")
                .text(otherParticipantInfo);
            }
          });
        } else {
          dashConvoItem
            .find("[data-comm-grid='last_message_sender']")
            .text("Broadcast:" + " " + convo.attributes.property);
        }

        $(dashConvoItem).click(function () {
          $("#communications").click();
          localStorage.setItem("activeConvo", dashConvoItem.attr("id"));
          loadConvoMessages(dashConvoItem.attr("id"));
          $(".chat__input-wrapper").css("display", "flex"); // show chat input
        });
      });
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function (error) {},
  });
}

function loadPropertiesInDashboard(user) {
  var dynContainer = $(".dyn-container__landlord-properties-dashboard");

  $.ajax({
    url: localStorage.baseUrl + "api:aJp1AxHb/load_properties_dashboard", // Use the provided endpoint URL
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    dataType: "json",
    data: {
      user_id: user,
    },

    success: function (response) {
      var sampleItem = $(".landlord-dashboard-sample-wrapper").find(
        ".dyn-item__dasboard-landlord-active-property",
      );

      dynContainer.empty();

      response.forEach((property) => {
        let dynItem = $(sampleItem).clone().appendTo(dynContainer);

        dynItem.attr("id", property.property_id);

        // conditional content check on img
        if (property.property_img) {
          dynItem
            .find("[data-landlord-property='img']")
            .attr("srcset", property.property_img);
        }

        // bind data
        dynItem.find("[data-landlord-property='street']").text(property.street);
        dynItem
          .find("[data-landlord-property='city']")
          .text(property.city + "," + property.state + " " + property.zip);

        $(dynItem).click(function () {
          var fetchedPropertyId = property.property_id;
          $("#property").click();
          localStorage.setItem("pageId", "property");
          localStorage.setItem("pageRefreshParam", property.property_id);
          localStorage.setItem("propertyId", property.property_id);
          localStorage.setItem("propertyRecId", property.id);
          localStorage.setItem("propertyStreet", property.street);
          history.pushState(
            "property",
            null,
            "/app/property?id=" + fetchedPropertyId,
          );
        });
      });
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function (error) {
      // Handle errors here
    },
  });
}

function loadActiveTenants(user) {
  var dynContainer = $(".dyn-container__landlord-dash-active-tenants");

  $.ajax({
    url:
      localStorage.baseUrl +
      "api:sElUkr6t/load_active_tenants_landlord_dashboard", // Use the provided endpoint URL
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    dataType: "json",
    data: {
      user: user
    },
    success: function (response) {
      var sampleItem = $(".landlord-dashboard-sample-wrapper").find(
        ".dyn-item__landlord-dash__active-tenant",
      );
      dynContainer.empty();

      response.forEach((activeTenant) => {
        let dynItem = $(sampleItem).clone().appendTo(dynContainer);

        dynItem.attr("id", activeTenant.user_id);

        // conditional content check on img
        if (activeTenant.profile_img) {
          dynItem
            .find("[data-active-tenant='img']")
            .attr("srcset", activeTenant.profile_img);
        }

        // bind data
        dynItem
          .find("[data-active-tenant='name']")
          .text(activeTenant.first_name + " " + activeTenant.last_name);
        dynItem
          .find("[data-active-tenant='company']")
          .text(activeTenant.company_name);

        $(dynItem).click(function () {
          var fetchedUserId = activeTenant.user_id;
          $("#profile").click();
          localStorage.setItem("pageId", "profile");
          localStorage.setItem("pageRefreshParam", activeTenant.user_id);
          localStorage.setItem("userProfileRecId", activeTenant.id);
          history.pushState(
            "profile",
            null,
            "/app/profile?id=" + fetchedUserId,
          );
        });
      });
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function (error) {
      // Handle errors here
    },
  });
}

function loadUnitBalances(target) {
  $.ajax({
    url: localStorage.baseUrl + "api:t2-fjTTj/get_unit_balances",
    type: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      target: target,
    },
    success: function (response) {
      // Update current balance with formatting
      var formattedCurrentBalance = "$" + response.balance.toLocaleString();
      $('[data-tenant="current-balance"]').text(formattedCurrentBalance);

      // Calculate next month's charges
      var nextMonthCharges = 0;
      var currentDate = new Date();
      var nextMonthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1,
      );
      var nextMonthEnd = new Date(
        nextMonthStart.getFullYear(),
        nextMonthStart.getMonth() + 1,
        1,
      );

      response.transactions.forEach(function (transaction) {
        var transactionDate = new Date(transaction.transaction_date);
        if (
          transactionDate >= nextMonthStart &&
          transactionDate < nextMonthEnd &&
          transaction.type === "charge"
        ) {
          nextMonthCharges += transaction.amount;
        }
      });

      // Format and update next month's charges
      var formattedNextMonthCharges = "$" + nextMonthCharges.toLocaleString();
      $('[data-tenant="next_month_charges"]').text(formattedNextMonthCharges);
    },
    error: function (error) {
      console.log("Error:", error);
    },
  });
}
