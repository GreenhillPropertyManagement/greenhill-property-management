
var linkToken

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
    url: 'https://xs9h-ivtd-slvk.n7c.xano.io/api:WROWQVjv/Create_Link_Token',
    contentType: 'application/json',
    data: JSON.stringify(requestData),
    success: function(response) {
      // Handle successful response
      // update linkToken with response
      linkToken = response;
    },
    complete: function(response) {
        
        (async function() {
            const configs = {
              token: 'YOUR_LINK_TOKEN',
              onLoad: function() {
                // The Link module finished loading.
              },
              onSuccess: function(public_token, metadata) {
                console.log('Public Token: ' + public_token);
                // Send public_token to your backend
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


