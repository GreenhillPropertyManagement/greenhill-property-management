
let unitId

document.addEventListener("DOMContentLoaded", function () {

  $("#unit-overview-bttn").on("click",function() {
    loadUnitAndTenantData(unitId); // load unit
  });

  /* Unit Dashboard */
  $("#unit").on("click", function () {
    $(".loader").css("display", "flex"); // show loader
    $('.act-mon-loader').css("display","flex");

    setTimeout(() => {

      const urlParams = new URLSearchParams(window.location.search);
      unitId = urlParams.get("id");
      loadUnitAndTenantData(unitId)
      editUnit(unitId);
      

      $("#archive-unit").on("click", function() {
        archiveUnit(unitId);
      });

      $("#unit-overview-bttn").click(); // default to overview tab
      
    }, 150);

  });

  /* Landlord Dashboard */
  $("#dashboard").on("click", function () {
    $(".loader").css("display", "flex"); // show loader
    $.when(
      dashActivityLog("landlord-dashboard", localStorage.userId),
      loadConvosInDashboard(localStorage.userId),
      loadWorkOrders("assigned_user", localStorage.userRecId, "", "dashboard"),
      loadPropertiesInDashboard(localStorage.userId),
      loadActiveTenants(localStorage.userRecId)
    ).then(function() {
      $(".loader").hide(); // hide loader when all AJAX requests are complete
    });
  });
});



function loadUnitAndTenantData(unit) {

  // If unit is vacant
  if (localStorage.unitEmpty === 'true') {

    // make api call
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

        /* hide active tenant header */
        $('#active-tenant-header').css('display','none');


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

        // populate 'edit unit form fields
        $('#edit-unit-name').val(response.unit_name);
        $('#edit-sqft').val(response.sqft);
        $('#edit-parking-spaces').val(response.parking_spaces);
        $('#edit-unit-proportionate-share').val(response.tenants_proportionate_precentage);
        $('#edit-hvac').val(response.hvac);
        $('#edit-water-meter-number').val(response.water_meter);
        $('#edit-electricity-meter').val(response.electricity_meter);
        $('#edit-commission').val(response.commission);
        $('#edit-unit-misc').val(response.miscellaneous);

      },
      complete: function () {
        loadPropertyUsers();
        loadWorkOrders("unit", "", localStorage.unitRecId, "dashboard"); // load in workorders
        dashActivityLog("unit", "", "", localStorage.unitRecId);
            
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

        /* Show active tenant header*/
        $('#active-tenant-header').css('display','flex');
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
        $("[data-unit='monthly_rent']").text('$' + Number(response.active_tenant_info.monthly_rent).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }));
        $("[data-unit='yearly_term']").text(
          formatDateNoTime(response.active_tenant_info.yearly_term),
        );
        $("[data-unit='yearly_rent_increase']").text(
          response.active_tenant_info.yearly_rent_increase + "%",
        );
        $("[data-unit='renewal_notice_deadline']").text(
          formatDateNoTime(response.active_tenant_info.renewal_notice_deadline),
        );
        $("[data-unit='security_deposit']").text('$' + Number(response.active_tenant_info.security_deposit).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }));
        $('[data-unit=lease_document]').off('click').on('click', function() {
          window.open(response.active_tenant_info.lease_document, '_blank');
        });


  
        // populate balances card
        $("[data-tenant='current-balance']").text('$' + Number(response.active_tenant_info.balance).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }));
      
        $("[data-tenant='next_month_charges']").text('$' + Number(response.active_tenant_info.next_month_payment).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }));
  
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
          response.active_tenant_info.user_info.display_name
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
        $("#active-tenant-click")
          .off("click")
          .click(function () {
            var fetchedUserId = response.active_tenant_info.user_info.user_id;
            $('.modal__block').css('display', 'none');
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

        // populate 'edit unit form fields
        $('#edit-unit-name').val(response.unit_name);
        $('#edit-sqft').val(response.sqft);
        $('#edit-parking-spaces').val(response.parking_spaces);
        $('#edit-unit-proportionate-share').val(response.tenants_proportionate_precentage);
        $('#edit-hvac').val(response.hvac);
        $('#edit-water-meter-number').val(response.water_meter);
        $('#edit-electricity-meter').val(response.electricity_meter);
        $('#edit-commission').val(response.commission);
        $('#edit-unit-misc').val(response.miscellaneous);
      },
      complete: function () {

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
          .text(user.display_name); // bind name

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

  dashActivityLogContainer.empty();

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
    complete: function () {
   
      $('.act-mon-loader').hide();
    
    },
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
   
    },
    error: function (error) {
      // Handle errors here
    },
  });
}

function editUnit(unit) {

  // Form Submission API Call
  $("#edit-unit-form").off("submit").on("submit", function (event) {
  // Prevent the default form submission behavior
  event.preventDefault();

  // Handle 'Loading' State
  $(".modal__block").hide();
  $(".loader").css("display", "flex");

  // Make an AJAX POST request
  $.ajax({
    url: localStorage.baseUrl + "api:t2-fjTTj/edit_unit",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      unit_uuid: unit,
      unit_name: $('#edit-unit-name').val(),
      sqft: $('#edit-sqft').val(),
      parking_spaces: $('#edit-parking-spaces').val(),
      tenants_proportionate_precentage: $('#edit-unit-proportionate-share').val(),
      water_meter: $('#edit-water-meter-number').val(),
      electricity_meter: $('#edit-electricity-meter').val(),
      hvac: $('#edit-hvac').val(),
      commission: $('#edit-commission').val(),
      miscellaneous: $('#edit-unit-misc').val()
    },
    success: function (response) {
      alert("Success! Unit Updated.");
      loadUnitAndTenantData(unit);
      $(".loader").hide();

      
    },
    error: function (error) {
      // Handle the error here
    },
  });
});

}

function archiveUnit(unit) {

   // Handle 'Loading' State
  $(".modal__block").hide();
  $(".loader").css("display", "flex");

  // Make an AJAX POST request
  $.ajax({
    url: localStorage.baseUrl + "api:t2-fjTTj/archive_unit",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      unit_uuid: unit,
    },
    success: function (response) {
      alert("Success! Unit Archived.");
      loadUnitAndTenantData(unit);
      $(".loader").hide();    
    },
    error: function (error) {
      // Handle the error here
      $('.modal__block').hide();
      $('.loader').hide();
    },
  });

}