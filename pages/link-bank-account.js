
var linkToken
const baseUrl = "https://xs9h-ivtd-slvk.n7c.xano.io/";

$(document).ready(function () {

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
        'Content-Type': "application/json",
        'Authorization': "Bearer " + localStorage.authToken
      },
      success: function (data) {       
        createLinkToken();
      },
      error: function (error) {
        //run code if they are not logged in
        alert("You are not logged in");
        //window.location.href = "/app/login";
      }
    });
  
  }

function createLinkToken() {

  // AJAX request to fetch Link token
  $.ajax({
    type: 'POST',
    url: localStorage.baseUrl + 'api:WROWQVjv/create_plaid_link_token',
    contentType: 'application/json',
    success: function(response) {
      // Handle successful response
      // update linkToken with response
      linkToken = response;
    },
    complete: function(response) {

        (async function() {
            const configs = {
              token: linkToken,
              onLoad: function() {
                // The Link module finished loading.
              },
              onSuccess: function(public_token, metadata) {
                console.log('Public Token: ' + public_token);

                // Send public_token to your backend
                $.ajax({
                    url: localStorage.baseUrl + "api:WROWQVjv/Exchange_Public_Token",
                    type: "POST",
                    headers: {
                      'Content-Type': "application/json",
                    },
                    data: {
                        public_token: public_token
                    },
                    success: function (data) {       
                      
                    },
                    error: function (error) {
                    
                      alert("Something Went Wrong");
                      
                    }
                  });

              },
              onExit: async function(err, metadata) {
                if (err != null) {
                  // Handle errors
                }
              },
            };
            var linkHandler = Plaid.create(configs);
            document.getElementById('link-button').onclick = function() {
              linkHandler.open();
            };
          })();

    },
    error: function(xhr, status, error) {
      // Handle error response
      alert('Something Went Wrong');
    }
  });

}


