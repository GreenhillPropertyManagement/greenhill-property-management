const baseUrl = "https://xs9h-ivtd-slvk.n7c.xano.io/";

// Handle form submission
$("#login-form").submit(function (event) {

  // Prevent the default form submission behavior
  event.preventDefault();

  // Change the text of the submit button
  $(this).find('input[type="submit"]').val("Logging You In...");

  // Disable pointer events for the submit button
  $(this).find('input[type="submit"]').css("pointer-events", "none");

  // Create an object to store form data
  const formData = {};

  // Iterate through form inputs and collect key-value pairs
  $(this)
    .find("input, select, textarea")
    .each(function () {
      const input = $(this);
      const id = input.attr("id");
      if (id) {
        formData[id] = input.val();
      }
    });

  // Make an login AJAX POST request
  $.ajax({
    url: baseUrl + "api:2yadJ61L/auth/login",
    type: "POST",
    data: formData,
    success: function (response) {

      let userRole = response.user_info.user_role;

      /* Set Local Storage Data */
      localStorage.setItem('baseUrl',baseUrl);
      localStorage.setItem("authToken", response.authToken);
      localStorage.setItem("clientApiKey", response.user_info.client_api_key);
      localStorage.setItem("userId", response.user_info.user_id);
      localStorage.setItem("userRecId", response.user_info.id);
      localStorage.setItem("userRole", response.user_info.user_role);
      localStorage.setItem("firstName", response.user_info.first_name);
      localStorage.setItem("lastName", response.user_info.last_name);
      localStorage.setItem("email", response.user_info.email);
      localStorage.setItem("displayName", response.user_info.display_name);
      localStorage.setItem("introInitiated", response.user_info.intro_walkthrough_intiated);


      if (response.user_info.profile_img) {
        localStorage.setItem('profileImage', response.user_info.profile_img)
      }
      if (localStorage.userRole === 'Tenant') {
        localStorage.setItem("paymentsEnabled", response.user_info.tenant_info.enable_payments);
      }
      
      // hide edit property for landlords without edit permissions
      if (localStorage.userRole === 'Landlord' && response.user_info.landlord_info.edit_permissions === false) {
        localStorage.setItem("editPermissions", 'false');
      } else {
        localStorage.setItem("editPermissions", 'true');
      }       

      // if user access is revoked ----------------------
      if (response.user_info.user_status === 'access-revoked') {

        window.location.href = "/app/access-denied"; 

      // if tenant bank is pending on micro-deposits -----------------  
      } else if (response.user_info.user_role === 'Tenant' && response.user_info.tenant_info.bank_account_status === "pending" && response.user_info.tenant_info.bank_verification_method === "manual") {

          window.location.href = "/banking/verify-bank-account";

      // if tenant has not connected bank ----------------
      } else if (response.user_info.user_role === 'Tenant' && response.user_info.user_status !== 'pending' && response.user_info.tenant_info.enable_payments == true && response.user_info.tenant_info.bank_account_status === "pending" ) {

          window.location.href = "/banking/choose-method";       

      // if tenant has updated their bank without verification ----------------
      } else if (response.user_info.user_role === 'Tenant' && response.user_info.tenant_info.bank_account_status === "update-pending" && response.user_info.tenant_info.bank_verification_method === "manual") {

        $('#verify-bank-update').css('display','flex');

      // if tenant has not updated their info ------------------ 
      } else if (response.user_info.user_role === 'Tenant' && response.user_info.user_status === 'pending') {

          window.location.href = "/tenant/confirm-account?user=" + response.user_info.user_id;

      // if landlord has not updated their info  ------------------ 
      } else if (response.user_info.user_role === 'Landlord' && response.user_info.user_status === 'pending') {

          window.location.href = "/landlord/confirm-account?user=" + response.user_info.user_id;

      // if landlord has not connected bank -------------------
      } else if (response.user_info.user_role === 'Landlord' && response.user_info.landlord_info.bank_account_status === "not_connected") {
        window.location.href = "/banking/choose-method";

      // if landlord bank is waiting on micro deposits
      } else if (response.user_info.user_role === 'Landlord' && response.user_info.landlord_info.bank_account_status === "pending" && response.user_info.landlord_info.bank_verification_method === "manual") {
        window.location.href = "/banking/verify-bank-account";
        
      }
      else {

          /* update the default page ID depending on user role */
          let pageId; 

          if (userRole === "Landlord") {

              pageId = "dashboard";
              localStorage.setItem('landlordRecId', response.user_info.landlord_info.id)

          } else if (userRole === "Tenant") {

              pageId = "my-profile";
              localStorage.setItem('tenantRecId', response.user_info.tenant_info.id);
              localStorage.setItem('bankStatus',response.user_info.tenant_info.bank_account_status);
            

          } else if (userRole === "Admin" || userRole === "Employee") {

              pageId = "users";
          }

          // update page ID in local storage
          localStorage.setItem("pageId", pageId);

          //re-direct user to dashboard
          window.location.href = "/app/home";
          
      }

        
        
    },
    error: function (error) {
      // show error block
      $(".form__error-block").css("display", "block");
      // Change the text of the submit button
      $("#login-form").find('input[type="submit"]').val("Log In");
      $("#login-form").find('input[type="submit"]').css("pointer-events", "auto");
    }
  });
});
