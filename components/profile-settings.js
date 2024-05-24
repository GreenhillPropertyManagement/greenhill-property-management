document.addEventListener("DOMContentLoaded", function() {
  
   $('#profile-settings').one('click', function() {

    $('.loader').css('display','flex');
    profileSettingsInit();

  }); 

});


function profileSettingsInit () {

  profileSettingsLoad();
  updateContactInfo();
  updateBillingInfo();
  updateBankInfo();
  updateProfilePic();
  updateNotificationsPref();

}

function profileSettingsLoad() {

  /* Get The Users Info */

 
  // Make an AJAX GET request to get User API endpoint
  $.ajax({
    url: localStorage.baseUrl + "api:sElUkr6t/get_user_profile",
    type: "GET",
    headers: {
      'Authorization': "Bearer " + localStorage.authToken
    },
    data: {
      user_id: localStorage.userId
    },
    success: function (response) {

      /* ------ Populate User Info   ----- */

      // Contact Info ----
      
      //first name
      $('[data="first_name"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.first_name);
        } else {
          $(this).text(response.first_name);
        }
      });

      //last name
      $('[data="last_name"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.last_name);
        } else {
          $(this).text(response.last_name);
        }
      });

      //email
      $('[data="email"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.email);
        } else {
          $(this).text(response.email);
        }
      });

      // mobile phone
      $('[data="mobile_phone"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.mobile_phone);
        } else {
          $(this).text(response.mobile_phone);
        }
      });

      // work phone
      $('[data="work_phone"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.work_phone);
        } else {
          $(this).text(response.work_phone);
        }
      });

      // company
      $('[data="company_name"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.company_name);
        } else {
          $(this).text(response.company_name);
        }
      });

      // billing street
      $('[data="billing_street"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.billing_street);
        } else {
          $(this).text(response.billing_street);
        }
      });

      // billing street 2
      $('[data="billing_street_2"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.billing_street_2);
        } else {
          $(this).text(response.billing_street_2);
        }
      });

      // billing city
      $('[data="billing_city"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.billing_city);
        } else {
          $(this).text(response.billing_city);
        }
      });

      // billing state
      $('[data="billing_state"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.billing_state);
        } else {
          $(this).text(response.billing_state);
        }
      });

      // billing zip
      $('[data="billing_zip"]').each(function() {
        if ($(this).is('input')) {
          $(this).val(response.billing_zip);
        } else {
          $(this).text(response.billing_zip);
        }
      });


      // bank account last 4 digits
      if (response.landlord_info){ 
        $('[data="bank_last_4"]').text(response.landlord_info.stripe_bank_last_4);
      }

      // bank account last 4 digits
      if (response.tenant_info){ 
        $('[data="bank_last_4"]').text(response.tenant_info.bank_last_4);
      }

      // profile img
      if (response.profile_img) {
        $('[data="profile_img"]').attr('src', response.profile_img);
      }


      //notification preferences
      
      $('#user_alerts').prop('checked', response.user_alerts);
      $('#transaction_alerts').prop('checked', response.transaction_alerts);
      $('#property_alerts').prop('checked', response.property_alerts);
      $('#maintenance_alerts').prop('checked', response.maintenance_alerts);
      $('#document_alerts').prop('checked', response.document_alerts);
      $('#legal_alerts').prop('checked', response.legal_alerts);
      $('#calendar_alerts').prop('checked', response.calendar_alerts);



      /* ------- Update UI based on User Role ------- */


      // Update UI for Admins & Employees
      if (response.user_role === 'Admin' || response.user_role === 'Employee') {

        $('#billing-info-block').remove(); // hide billing info
        $('#profile-bank-block').remove(); // remove bank block
        $('#company-block').hide(); // hide company info
        $('#work-phone-block').hide(); // hide work-phone info
        $('#edit-work-phone').hide(); // hide work phone input
        $('#edit-company').hide(); // hide company input

      }

      // Update UI For Landlords
      if (response.user_role === 'Landlord'){

        $('#user_alerts_toggle').remove(); // remove users alerts toggle
        $('#legal_alerts_toggle').remove(); // remove users alerts toggle

      }


      // Update UI For Tenants
      if (response.user_role === 'Tenant'){

        $('#alerts-block').remove(); // remove alerts configure block 

      }

      // Update UI For Tenants with Payments NOT Enabled...
      if (response.user_role === 'Tenant' && response.tenant_info.enable_payments == false){

        $('#profile-bank-block').remove(); // remove bank block

      }



     
    },
    error: function (error) {

    },
    complete: function () {

      $('.loader').hide(); //hide loader
        /* ----- Run form validation on the Notification Preferences Form ----- */
        // only enable the update button if the notification settings have changed 

        // Step 1: Add 'disabled' class to the button when the page is loaded
        const updateButton = document.getElementById('update-alerts-bttn');
        updateButton.classList.add('disabled');
        
        // Get the form
        const form = document.getElementById('update-notifications-form');
        
        if (form) {
            // Step 2: Add event listener to each toggle input within the form
            const toggleInputs = form.querySelectorAll('input[type="checkbox"]');
            
            toggleInputs.forEach(input => {
                // Store the original value of the checkbox
                input.dataset.originalValue = input.checked;
                
                input.addEventListener('change', function() {
                    // Check if the current value is different from the original value
                    if (input.checked.toString() !== input.dataset.originalValue) {
                        // Step 3: Remove 'disabled' class from the button if any toggle is changed
                        updateButton.classList.remove('disabled');
                    } else {
                        // Check all toggles to see if any are different from their original values
                        let anyChanged = Array.from(toggleInputs).some(toggle => toggle.checked.toString() !== toggle.dataset.originalValue);
                        
                        // If none are changed, add the 'disabled' class back to the button
                        if (!anyChanged) updateButton.classList.add('disabled');
                    }
                  });
              });
          }

    }
  });



}

function updateContactInfo(){


  /* --------- API Call - Edit Contact Info ------- */

  // Handle Form Submission API Call
  $("#edit-contact-info-form").submit(function (event) {

    // Prevent the default form submission behavior
    event.preventDefault();

    $('.modal__block').hide();
    $('.loader').css('display','flex');


    const formData = {};


    // Iterate through form inputs with data-api-input attribute and collect key-value pairs
    $(this)
    .find('[data-api-input]')
    .each(function () {
      const input = $(this);
      const key = input.data('api-input'); // Get the data attribute value
      const value = input.val();
      formData[key] = value;
    });

    formData['user_id'] = localStorage.userRecId


    // Make an login AJAX POST request
    $.ajax({
      url: localStorage.baseUrl + "api:sElUkr6t/edit_user",
      type: "POST",
      headers: {
        'Authorization': "Bearer " + localStorage.authToken
      },
      data: formData,
      success: function (response) {
               
        profileSettingsLoad();

      },
      error: function (error) {

        }
      });
  });


}

function updateBillingInfo() {

  /* ------ API Call - Edit Billing Info ------- */


  // Handle Form Submission API CALL
  $("#edit-billing-info-form").submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Handle 'Loading' State
    $('.modal__block').hide();
    $('.loader').css('display','flex');
    

    const formData = {};

    // Iterate through form inputs with data-api-input attribute and collect key-value pairs
    $(this)
    .find('[data-api-input]')
    .each(function () {
      const input = $(this);
      const key = input.data('api-input'); // Get the data attribute value
      const value = input.val();
      formData[key] = value;
    });

      formData['user_id'] = localStorage.userRecId


    // Make an login AJAX POST request
    $.ajax({
      url: localStorage.baseUrl + "api:sElUkr6t/edit_user",
      type: "POST",
      headers: {
        'Authorization': "Bearer " + localStorage.authToken
      },
      data: formData,
      success: function (response) {
      
        profileSettingsLoad();

      },
      error: function (error) {
       
        }
      });
  });


}

function updateBankInfo() {

  /* ------- API Call - Edit Bank Info -------- */


  // Handle Form Submission API CALL
  const editBankForm = $('#edit-bank-info-form');

  $(editBankForm).submit(function (event) {
  // Prevent the default form submission behavior
  event.preventDefault();

  // Handle 'Loading' State
  $('.modal__block').hide();
  $('.loader').css('display','flex');
  

  const formData = {};

  // Iterate through form inputs with data-api-input attribute and collect key-value pairs
  $(this)
  .find('[data-api-input]')
  .each(function () {
    const input = $(this);
    const key = input.data('api-input'); // Get the data attribute value
    const value = input.val();
    formData[key] = value;
  });

  formData['user_uuid'] = localStorage.userId
  formData['user_role'] = localStorage.userRole


  // Make an login AJAX POST request
  $.ajax({
    url: localStorage.baseUrl + "api:sElUkr6t/update_bank_account", 
    type: "POST",
    headers: {
      'Authorization': "Bearer " + localStorage.authToken
    },
    data: formData,
    success: function (response) {
      
      profileSettingsLoad();

    },
    error: function (error) {
     
      }
    });
  });

}

function updateProfilePic() {

  /* ------------ Upload Profile Pic Functionality ------------ */

  const widget = uploadcare.Widget("#my-profile-pic", {
    crop: "1:1",
    imagesOnly: true,
    imageShrink: "1000x1000",
  });

  widget.onDialogOpen(() => {
    // Set the preview step to crop
    widget.config.previewStep = 'crop';
  });

  $('.user-img').click(function() {
    widget.openDialog();
    $('.loader').css('display', 'flex');
  });

  widget.onUploadComplete(function(info) {

    $('.loader').css('display', 'flex');
    // Get the URL of the uploaded image
    const imageUrl = info.cdnUrl;

    // Make the API call to save the image URL
    $.ajax({
      url: localStorage.baseUrl + "api:sElUkr6t/edit_user",
      type: "POST",
      headers: {
        'Authorization': "Bearer " + localStorage.authToken
      },
      data: {
        user_id: localStorage.userRecId,
        profile_img: imageUrl
      },
      success: function(response) {
        profileSettingsLoad();
      },
      error: function(error) {

      }
    });
  });

}


function updateNotificationsPref () {

    /* --------- Updating Notification Prefrences ---------- */


    const notificationsForm = $('#update-notifications-form');

    $(notificationsForm).submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();
  
    // Handle 'Loading' State
    $('.loader').css('display','flex');
   
  
    const formData = {};
  
    // Iterate through form inputs and collect key-value pairs
    $("form#update-notifications-form :checkbox").each(function () {
      const input = $(this);
      formData[input.attr("id")] = input.prop("checked"); // Store as boolean
    });
  
    formData['user_id'] = localStorage.userRecId;
    formData['notifications'] = 'true';
  
    // Make an AJAX POST request
    $.ajax({
      url: localStorage.baseUrl + "api:sElUkr6t/edit_user",
      type: "POST",
      headers: {
        'Authorization': "Bearer " + localStorage.authToken
      },
      data: formData,
      success: function (response) {
  
        profileSettingsLoad();

      },
      error: function (error) {
       
      }
    }); 
  
   });
  
  
}
