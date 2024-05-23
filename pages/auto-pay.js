const baseUrl = "https://xs9h-ivtd-slvk.n7c.xano.io/";

document.addEventListener("DOMContentLoaded", function() {
    if (localStorage.authToken == null) {
        // Run code if they are not logged in
        alert("You are not logged in");
        window.location.href = "/app/login";
    } else {
        authUser();
    }
});


function authUser() {

    $.ajax({
      url: localStorage.baseUrl + "api:2yadJ61L/auth/me",
      type: "GET",
      headers: {
        'Content-Type': "application/json",
        'Authorization': "Bearer " + localStorage.authToken
      },
      success: function (data) {       
       enableAutopay();
      },
      error: function (error) {
        //run code if they are not logged in
        alert("You are not logged in");
        //window.location.href = "/app/login";
      }
    });
  
  }

  function enableAutopay() {

    $('#accept-autopay-button').click(function(){

        $.ajax({
            url: localStorage.baseUrl + "api:sElUkr6t/enable_autopay",
            type: "POST",
            headers: {
              'Content-Type': "application/json",
              'Authorization': "Bearer " + localStorage.authToken
            },
            success: function (data) {   
                
                alert('Success! You are now enrolled in Auto-Pay'); // alert confirmation
                window.location.href = "/app/home"; // refirect user to their dashboard
  
            },
            error: function (error) {
              //run code if they are not logged in
              alert("Failed to Enable Autopay");
           
            }
          });

    })
  }