document.addEventListener("DOMContentLoaded", function() {

  if (localStorage.authToken == null) {
    //run code if they are not logged in
    alert("You are not logged in");
    window.location.href = "/app/login";
  } else {
    authUser();
    // ✅ Show "You're all caught up!" message ONLY when the dropdown is opened and there are no notifications
    document.getElementById("notification-toggle").addEventListener("click", function () {
      let $wrapper = document.getElementById("notification-list");
      let hasNotifications = document.querySelectorAll(".notification__item-wrapper").length > 0;

      if (!hasNotifications) {
          $wrapper.innerHTML = `<div class="notification__empty-message">You're all caught up!</div>`;
      }
    });
  }

});

/* Main App */

function initializeApp() {

  $('.modal__block').hide();
  /* --- Store Base URL ---*/

  /* Populate User Global Info */
  var displayName = localStorage.getItem('displayName');
  $('[data="first_name"]').text(displayName);

  // update profile image if applicable
  if (localStorage.profileImage) {
    $('[data="profile_img"]').attr('src', localStorage.profileImage);
  }

  /* ---  log out func ---- */
  $(".logout_button").on("click", function () {
    // Clear all local storage
    localStorage.clear();

    // Redirect user to /app/login
    window.location.href = "/app/login";
  });

  $('[global-func=logout]').on("click", function () {
    // Clear all local storage
    localStorage.clear();

    // Redirect user to /app/login
    window.location.href = "/app/login";
  });

    /* Global Ajax Errors Handling */
  $(document).ajaxError(function(event, jqXHR, settings, thrownError) {
    // Retrieve the error code and response text
    var errorCode = jqXHR.status;
    var errorMessage = jqXHR.responseText;

    console.log("AJAX Error Detected:");
    console.log("Error Code: " + errorCode);
    console.log("Error Message: " + errorMessage);

    // Try to parse the responseText to JSON if the API response is JSON
    try {
        var responseJson = JSON.parse(jqXHR.responseText);
        errorMessage = responseJson.message || responseJson.error || errorMessage;
    } catch (e) {
        // responseText wasn't JSON, use the raw responseText
    }

    console.log("Parsed Error Message: " + errorMessage);

    // Function to handle logout
    function logoutUser() {
        localStorage.clear();
        var logoutButton = $('.logout_button');
        if (logoutButton.length > 0) {
            console.log("Logout button found. Triggering click event.");
            logoutButton.click();
        } else {
            console.log("Logout button not found. Redirecting to logout URL.");
            window.location.href = "/app/login";
            localStorage.clear();
        }
    }

    // Check if the error is a 401 Unauthorized or 500 with the specific message
    if ((errorCode === 401 && (errorMessage.includes("This token is expired.") || errorMessage.includes("Invalid token"))) || 
        (errorCode === 500 && errorMessage.includes("Unable to locate auth: extras.user_id"))) {
        alert('Session Expired');
        logoutUser();
    } else if (errorMessage.includes("Unable to locate auth: extras.user_id")) {
        alert('Unable to locate auth: extras.user_id');
        logoutUser();
    } else {
        alert("Error " + errorCode + ": " + errorMessage);
        // Prepare the error data as a single JSON object
        var errorData = JSON.stringify({
          event_type: event.type,
          endpoint: settings.url,
          error_code: errorCode,
          error_message: errorMessage,
          xhr_status: jqXHR.statusText,
          xhr_responseText: jqXHR.responseText,
          request_data: settings.data ? JSON.stringify(settings.data) : '', // Stringify if the data is an object
          response_data: jqXHR.responseText,
          settings_url: settings.url,
          user: localStorage.displayName
      });

      // Send the error data to your server
      $.ajax({
          type: "POST",
          url: "https://xs9h-ivtd-slvk.n7c.xano.io/api:hhXosF91/errors",
          contentType: "application/json",
          data: errorData, // Send the stringified JSON object
          success: function(response) {
              console.log("Error logged successfully");
          },
          error: function(response) {
              console.log("Failed to log error");
          }
      });
    }


  });


  loadCurrentPage();
  urlRouting();
  userRoleInterface();
  loadUsersInFormSelectFields();
  fetchNotifications();
  setupCustomDropdown();
  loadConvos(localStorage.userId, "self");

  /* maintnenace tab button clear notifications */
  $("#maintenance").on("click", function () {
    $('[data-api=maintenance-counter]').hide();
  });

  /* ---- Modal Functionality ----- */

  $(document).on('click', '[element="modal"]', function() {
    // Show the .modal_block element and hide its children
    $('.modal__block').show().children().hide();
    
    // Read the modal attribute value from the clicked element
    var modalValue = $(this).attr('modal');
  
    // Show the modal with the corresponding ID
    $('#' + modalValue).show();
  });


  // close modal functionality
  $('.inverse-cta-bttn').on('click', function() {

    $('.modal__block').css('display', 'none');      // Hide .modal__block
    $('.modal__block').children().hide();           // Hide all children of .modal__block
  });


  /* ----------- Mobile Nav Buttons Menu Drawer ------ */

  $('#nav-create-user').click(function(){
    $('#nav-menu-button').click();
    setTimeout(function() {
      $('#create-user').click();
  }, 500); 

  });

  $('#nav-profile-settings').click(function(){
    $('#nav-menu-button').click();
    setTimeout(function() {
      $('#profile-settings').click();
  }, 500); 

  });

  $('#nav-documents').click(function(){
    $('#nav-menu-button').click();
    setTimeout(function() {
      $('#documents').click();
  }, 500); 

  });

  $('#nav-calendar').click(function(){
    $('#nav-menu-button').click();
    setTimeout(function() {
      $('#calendar').click();
  }, 500); 
  }); 
  
  /* -------- Element Dynamic Visibility ------- */

  if (localStorage.userRole === 'Admin') {
    $('[dynamic-visibility=admin-hidden]').remove();
  }

  if (localStorage.userRole === 'Employee') {
    $('[dynamic-visibility=employee-hidden]').remove();
  }

  if (localStorage.userRole === 'Landlord') {
    $('[dynamic-visibility=landlord-hidden]').remove();
  }

  if (localStorage.userRole === 'Tenant') {
    $('[dynamic-visibility=tenant-hidden]').remove();
  }

  if (localStorage.userRole === 'Employee' || localStorage.userRole === 'Landlord'|| localStorage.userRole === 'Tenant') {
    $('[dynamic-visibility=admin-only]').remove();
  }

  if (localStorage.userRole === 'Landlord'|| localStorage.userRole === 'Tenant') {
    $('[dynamic-visibility=users-only]').remove();
    $('[dynamic-visibility-2=true]').remove(); // remove update work order form button

  }

  if (localStorage.editPermissions === 'false') {
    $('#edit-property-button').remove();
  } else {
    $('#edit-property-button').show();
  }

  // hide modal on back button 
  $(window).on('popstate', function() {
  $('.modal__block').hide();
  });

  // conditional logic for testing (dummy tenant account)
  if(localStorage.userId === "2d3235a8-2520-4153-8d7b-760fe7545d7d" || localStorage.userId === "f7173331-dc22-4157-88c4-f8bc507ef267") {
    alert('Testing Mode!');
    $('[dynamic-visibility=test-mode]').show();
  } else {
    $('[dynamic-visibility=test-mode]').remove();
  }

  /* Tasks Functionality V4 */
  $(document).off('click', '[api-button="new-task"]')
  .on('click', '[api-button="new-task"]', function (e) {
    e.preventDefault();
    createTask();

    if (localStorage.getItem("pageId") === "unit") {
      $("#unit-overview-bttn").trigger("click");
    } else if (localStorage.getItem("pageId") === "profile") {
      $('[profile-tab-button=overview]').trigger("click");
    }

  });
      
}
/* Utlity Functions */
function showToast(message, duration = 3000) {
  const $toast = $("#toast");
  $toast.text(message).fadeIn(200);
  setTimeout(() => $toast.fadeOut(300), duration);
}

function authUser() {

  const xanoBaseUrl = "https://xs9h-ivtd-slvk.n7c.xano.io/";
  localStorage.setItem('baseUrl', xanoBaseUrl);

  $.ajax({
    url: localStorage.baseUrl + "api:2yadJ61L/auth/me",
    type: "GET",
    headers: {
      'Content-Type': "application/json",
      'Authorization': "Bearer " + localStorage.authToken
    },
    success: function (data) {

      initializeApp();
    },
    error: function (error) {
      window.location.href = "/app/login";
    }
  });
}

function urlRouting() {
  // get all the nav links
  let navLinks = Array.from(document.getElementsByClassName("main-tabs__button"));

  navLinks.forEach((navLink) => {
    let navLinkId = navLink.id;

    navLink.addEventListener("click", (e) => {
      let adminPath = "/app/" + navLinkId;
      history.pushState(navLinkId, null, adminPath);
      localStorage.setItem("pageId", navLinkId);
      $(".main-tabs__button").removeClass("active-tab");
      $(navLink).addClass("active-tab");
    });
  });

  window.addEventListener("popstate", function (event) {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    const state = event.state;

    if (path.includes("/app/property")) {
      localStorage.setItem("pageId", "property");
      localStorage.setItem("pageRefreshParam", id);
      $("#property").click();
    } else if (path.includes("/app/unit")) {
      localStorage.setItem("pageId", "unit");
      localStorage.setItem("pageRefreshParam", id);
      $("#unit").click();
    } else if (path.includes("/app/profile")) {
      localStorage.setItem("pageId", "profile");
      localStorage.setItem("pageRefreshParam", id);
      $("#profile").click();
    } else if (state) {
      localStorage.setItem("pageId", state);
      localStorage.removeItem("pageRefreshParam"); // clear old ID
      $("#" + state).click();
    }
  });
}

function loadCurrentPage() {

  /* This function loads the correct screen if the user refreshes a page */
  let currentPage = localStorage.getItem("pageId");
  setTimeout(() => {
    $("#" + currentPage).click(); // open tab of page id
    history.pushState(currentPage, null, "/app/" + currentPage); // log history and update url

    // Check if the currentPage is "profile," "property," or "unit"
    if (["profile", "property", "unit"].includes(currentPage)) {
      // Get the value from local storage
      let pageRefreshParam = localStorage.getItem("pageRefreshParam");

      // Add the URL parameter to the history
      history.pushState(
        currentPage,
        null,
        "/app/" + currentPage + "?id=" + pageRefreshParam
      );
    }
  }, 100);


}

function userRoleInterface () {

  /* ----- This function updates the user interface depending on which user type is logged in */
  //--------------------------------------------------------------------------------------------

  // Get the user role from local storage


  let userRole = localStorage.userRole;

  // Update Nav Links
  if (userRole === 'Admin' || userRole ==='Employee') {
  
    // remove the nav links, not associated with the admins or employees
    $('#dashboard').remove();
    $('#finance').remove();
    $('#my-profile').remove();
    $('#pay-rent').remove();

    } else if (userRole === 'Landlord') { 

      // remove the nav links, not associated with the landlords   
      $('#users').remove();
      $('#create-user').remove();
      $('#my-profile').remove();
      $('#pay-rent').remove();

  

    } else if (userRole === 'Tenant') {

      // remove the nav links, not associated with the Tenants
      $('#dashboard').remove();
      $('#finance').remove();
      $('#users').remove();
      $('#create-user').remove();
      $('#properties').remove();
      $('#property').remove();
      $('#unit').remove();
      $('#profile').remove();
      $('#legal').remove();

  
      $('#calendar').remove();
      
      if (localStorage.paymentsEnabled === "false") {
        $('#pay-rent').remove();
      }


    }


 }

function loadUsersInFormSelectFields(){

// Make API Call
$.ajax({

url: localStorage.baseUrl + "api:aJp1AxHb/select_users_property_form",
type: "GET",
data: {},
success: function (response) {
  
    /* Populate Landlord Select Field */
    // Clear previous options in the select field
    $('[select-field=landlords]').empty();

    // Add the placeholder to the select field
    $('[select-field=landlords]').append(
      $("<option>", {
        value: "",
        text: "Select a Landlord",
        selected: true,
        disabled: true
      })
    );

    // Loop through each landlord in the response
    $.each(response.landlords, function (index, landlord) {
        // Create the option text
        var optionText = landlord.display_name;

        // Append the new option to the select field
        $('[select-field=landlords]').append(
          $("<option>", {
            value: landlord.id,
            text: optionText
          })
        );
    });


    /* Populate Employee Select Field */
    // Clear previous options in the select field
    $('[select-field=employees]').empty();

    // Add the placeholder to the select field
    $('[select-field=employees]').append(
      $("<option>", {
        value: "",
        text: "Select an Employee",
        selected: true,
        disabled: true
      })
    );

    // Loop through each landlord in the response
    $.each(response.employees, function (index, employee) {
        // Create the option text
        var optionText = employee.display_name;

        // Append the new option to the select field
        $('[select-field=employees]').append(
          $("<option>", {
            value: employee.id,
            text: optionText
          })
        );
      });

},
complete: function() {

  $('.loader').hide();

},
error: function (error) {

}
}); 

}

function formatDateToCustomFormat(dateString) {

  const dateObj = new Date(dateString);

  // Ensure the date is treated as UTC
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');  // +1 because months are 0-based
  const year = String(dateObj.getUTCFullYear()).slice(-2);  // Last two digits of the year

  // Get hours and minutes
  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const amOrPm = hours >= 12 ? 'pm' : 'am';
  
  hours = hours % 12;
  hours = hours ? hours : 12;  // If 0, make it 12

  return `${month}/${day}/${year} ${hours}:${minutes}${amOrPm}`;
}

function formatDateNoTime(dateString) {
  const dateObj = new Date(dateString);

  // Ensure the date is treated as UTC
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');  // +1 because months are 0-based
  const year = String(dateObj.getUTCFullYear()).slice(-2);  // Last two digits of the year

  return `${month}/${day}/${year}`;
}

function formatDateToLocalTimezone(dateString) {
  const dateObj = new Date(dateString);

  // Extract the formatted date
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);

  // Extract the formatted time
  const formattedTime = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // Ensures AM/PM format
  }).format(dateObj);

  // Concatenate without a comma
  return `${formattedDate} ${formattedTime}`;
}

function fetchNotifications() {
  $.ajax({
      url: "https://xs9h-ivtd-slvk.n7c.xano.io/api:1GhG-UUM/get_user_notifications",
      method: "GET",
      dataType: "json",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      success: function(response) {
          updateNotifications(response);
      },
      error: function(xhr, status, error) {
          console.error("Error fetching notifications:", error);
      }
  });
}

function setupCustomDropdown() {
  const toggleButton = document.getElementById("notification-toggle");
  const dropdownList = document.getElementById("notification-list");

  // Toggle dropdown visibility
  toggleButton.addEventListener("click", function (event) {
      event.stopPropagation(); // Prevent click from propagating to body
      dropdownList.style.display = dropdownList.style.display === "block" ? "none" : "block";
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (event) {
      if (!toggleButton.contains(event.target) && !dropdownList.contains(event.target)) {
          dropdownList.style.display = "none";
      }
  });
}

function updateNotifications(notifications) {

  let $counter = document.querySelector("[data-api='notification-count']");
  let $maintenanceCounter = document.querySelector("[data-api='maintenance-counter']");
  let $wrapper = document.getElementById("notification-list");

  $wrapper.innerHTML = ""; // Clear old notifications

  let workOrderCount = 0; // Track "work-order" notifications

  notifications.forEach(notification => {
      let notificationId = notification.id;
      let timestamp = notification.activity_record.created_at;
      let formattedTimestamp = formatDateToLocalTimezone(timestamp);
      let description = notification.activity_record.description;
      let notificationType = notification.type;

      // ✅ Count "work-order" notifications
      if (notificationType === "work-order") {
          //$maintenanceCounter.css("display","flex");
          workOrderCount++;
      }

      let notificationItem = document.createElement("div");
      notificationItem.classList.add("notification__item-wrapper");
      notificationItem.setAttribute("data-id", notificationId);
      notificationItem.setAttribute("data-type", notificationType);
      notificationItem.innerHTML = `
          <div class="notification__item__text">${description}</div>
          <div class="notification__timestamp">${formattedTimestamp}</div>
      `;

      // Attach click event to mark notification as seen and trigger logic based on user role
      notificationItem.addEventListener("click", function () {
          let userRole = localStorage.getItem("userRole"); // Get user role from localStorage
          
          // Handle different click actions based on notification type and userRole
          if (notificationType === "transaction" && userRole === "Tenant") {
              document.getElementById("pay-rent").click(); 
          }
          if (notificationType === "transaction" && userRole === "Landlord") {
              document.getElementById("finance").click(); 
          }
          if (notificationType === "work-order") {
              document.getElementById("maintenance").click();
          }

          // ✅ Mark as seen and update UI
          markNotificationAsSeen(notificationId);
          this.style.opacity = "0";
          setTimeout(() => {
              this.remove(); // Remove from DOM
              
              // ✅ Update counter dynamically
              let remainingNotifications = document.querySelectorAll(".notification__item-wrapper").length;
              
              // ✅ Update maintenance counter dynamically
              if (notificationType === "work-order") {
                  workOrderCount--;
              }

              // Hide or update maintenance counter
              if (workOrderCount === 0) {
                  $maintenanceCounter.style.setProperty("display", "none", "important");
              } else {
                  $maintenanceCounter.textContent = workOrderCount;
                  $maintenanceCounter.style.setProperty("display", "flex", "important");
              }

              if (remainingNotifications === 0) {
                  $counter.style.setProperty("display", "none", "important"); // Hide counter
              } else {
                  $counter.textContent = remainingNotifications;
                  $counter.style.setProperty("display", "flex", "important"); // Show counter
              }
          }, 300);
      });

      $wrapper.appendChild(notificationItem);
  });

  // ✅ Update notification counter visibility
  if (notifications.length === 0) {
      $counter.style.setProperty("display", "none", "important"); // Hide counter
  } else {
      $counter.textContent = notifications.length;
      $counter.style.setProperty("display", "flex", "important"); // Show counter
  }

  // ✅ Show or hide maintenance counter based on work-order notifications
  if (workOrderCount === 0) {
      $maintenanceCounter.style.setProperty("display", "none", "important");
  } else {
      $maintenanceCounter.textContent = workOrderCount;
      $maintenanceCounter.style.setProperty("display", "flex", "important");
  }
}

function markNotificationAsSeen(notificationId) {
  $.ajax({
      url: "https://xs9h-ivtd-slvk.n7c.xano.io/api:1GhG-UUM/view_notification",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ notification_id: notificationId }),
      headers: {
          Authorization: "Bearer " + localStorage.authToken,
      },
      success: function(response) {
          console.log("Notification marked as seen:", response);
      },
      error: function(xhr, status, error) {
          console.error("Error marking notification as seen:", error);
      }
  });
}

function updateNotificationCounter(change) {
  let $counter = $("[data-api='notification-count']");
  let currentCount = parseInt($counter.text()) || 0;
  let newCount = Math.max(currentCount + change, 0); // Prevent negative count

  if (newCount > 0) {
      $counter.text(newCount).show();
  } else {
      $counter.hide();
  }
}

function createTask() {

  // load user to assign task to 

  const page = localStorage.getItem('pageId');
  const activeTenantUserId = localStorage.getItem('activeTenantUserId');
  const unitRecId = localStorage.getItem('unitRecId');
  const tenant = localStorage.getItem('userProfileRecId');

  $.ajax({
    url: localStorage.baseUrl + 'api:RqXDqOO9/load_assign_users',
    method: 'GET',
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    dataType: 'json',
    data: {
      unit_rec_id: unitRecId,
      page: page,
      tenant: tenant
    },
    success: function (response) {
      const select = $('#assigned_to_user');
      select.empty();
    
      // Normalize to array in case of single object
      const users = Array.isArray(response) ? response : [response];
    
      // Check if it's the profile page and only one user
      const isProfilePage = page === "profile";
      const isSingleUser = users.length === 1;
    
      if (!isProfilePage || !isSingleUser) {
        // Add default placeholder if multiple choices are expected
        select.append('<option value="" disabled selected>Select a User..</option>');
      }
    
      users.forEach(function (user) {
        // Create the option
        const option = $('<option>', {
          value: user.id,
          text: user.display_name
        });
    
        // If profile page and one user, pre-select it
        if (isProfilePage && isSingleUser) {
          option.prop('selected', true);
        }
    
        // Add the option
        if (isProfilePage) {
          select.append(option); // Always append if profile page
        } else {
          // Filter tenants unless activeTenant
          const isTenant = user.user_role === 'Tenant';
          const isActiveTenant = user.id.toString() === activeTenantUserId;
    
          if (!isTenant || isActiveTenant) {
            select.append(option);
          }
        }
      });
    },
    error: function (err) {
      console.error('Failed to load users:', err);
    }
  });


  // Create New Task on Form Submit

  $(document).off('submit', '[data-api-form="new-task"]').on('submit', '[data-api-form="new-task"]', function (e) {
    e.preventDefault();

    $('.loader').css('display','flex'); //show loader
  
    const page = localStorage.getItem('pageId');
    const unitRecId = localStorage.getItem('unitRecId');
    const activeTenantUserId = localStorage.getItem('activeTenantUserId');
  
    // Dynamically get form inputs using their data-api-input attributes
    const calendarDate = $('[data-api-input="calendar_date"]').val();
    const assignedUserId = $('[data-api-input="assigned_to_user"]').val();
    const taskMessage = $('[data-api-input="task_message"]').val();
    const taskTitle = $('[data-api-input="task_title"]').val();
  
    // Get the user role from the global list if available
    let assignedUserRole = null;
    const lastFetchedUsers = window.lastAssignUsers || [];
  
    const assignedUser = lastFetchedUsers.find(user => user.id.toString() === assignedUserId);
    if (assignedUser) {
      assignedUserRole = assignedUser.user_role;
    }
  
    // Build payload
    const payload = {
      calendar_date: calendarDate,
      assigned_to_user: assignedUserId,
      task_message: taskMessage,
      user_role: assignedUserRole,
      task_title: taskTitle
    };
  
    if (page === "unit") {
      payload.unit_rec_id = unitRecId;
    } else {
      payload.unit_rec_id = null;
    }
  
    // Submit the task to Xano
    $.ajax({
      url: localStorage.baseUrl + 'api:RqXDqOO9/create_task',
      method: 'POST',
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function (res) {
        alert('Task Successfully Created!');
        $('[data-api-form="new-task"]')[0].reset();
        $('.modal__block').hide(); // Hide modal
        $('.loader').hide();

      },
      error: function (err) {
        alert('An Unexpected Error Occured.');
        $('[data-api-form="new-task"]')[0].reset();
        $('.modal__block').hide(); // Hide modal
        $('.loader').hide();

      }
    });
  });

}