document.addEventListener("DOMContentLoaded", function() {

  // main users tab clicked
  $('#users').on('click', function() {
    loadUsers('all');
  });

  // Unit tenant history tab clicked
  $("[api-button='tenant-history']").on('click', function() {
    loadUsers('unit',localStorage.unitRecId);
  });
  

});


function loadUsers(type,unit) {
  
  $('.loader').css('display','flex');

  var usersContainer = $('.dyn-item__user-scroll-block');
  $.ajax({
    url: localStorage.baseUrl + 'api:sElUkr6t/load_users',
    method: 'GET',
    headers: {
      'Authorization': "Bearer " + localStorage.authToken
    },
    dataType: 'json',
    data: { 
      type: type,
      unit: unit
    }, 
    success: function (response) {

      var sampleUser = $('.users-sample-card-wrapper').find("[data='user-sample-item']");
      
      usersContainer.empty();

      // loop through each user
      response.forEach((user) => {

        // clone the sample card for the user and append to users container
        let userItem = $(sampleUser).clone().appendTo(usersContainer);

        // bind the user's data to the cloned card
        userItem.attr("id", user.user_id);
        userItem.addClass("dyn-item__user");
        userItem.addClass(user.user_role);
        userItem.addClass(user.user_status); 

        if (user.profile_img) {
          userItem.find(".users__dyn-item__img").attr("src", user.profile_img); 
        }    

        userItem.find(".user-name").text(user.display_name);
        userItem.find("[data='user-role']").text(user.user_role);
        userItem.find("[data='status']").text(user.user_status);
        userItem.find(".user-phone").attr("href", "tel:" + user.mobile_phone).text(user.mobile_phone);
        userItem.find(".user-email").attr("href", "mailto:" + user.email).text(user.email);

        if (user.company_name) {
          userItem.find(".user-company").text(user.company_name);
        } else {
          userItem.find("[data=user-company-block]").hide();
        }

        // click handler to direct to each user's page
        $(userItem).find(".user-click-target").click(function () {
          var fetchedUserId = user.user_id; 
          $('#profile').click();
          localStorage.setItem("pageId", "profile");
          localStorage.setItem('pageRefreshParam', user.user_id);
          localStorage.setItem('userProfileRecId', user.id);
          history.pushState("profile", null, "/app/profile?id=" + fetchedUserId);
        });
      });

    },
    complete: function() {
      usersContainer.find('.dyn-item__user:last').css('border-bottom', 'none');
      $('.loader').hide();
      usersFiltering();
    },
    error: function (error) {

    }
  });
}

function usersFiltering() {
  
  function debounce(fn, delay) {
    let timeoutID = null;
    return function () {
      clearTimeout(timeoutID);
      const args = arguments;
      const that = this;
      timeoutID = setTimeout(function () {
        fn.apply(that, args);
      }, delay);
    };
  }

  var qsRegex;
  var currentStatusFilter = '*';
  var maintenanceComponents = document.querySelectorAll('.users-component');

  maintenanceComponents.forEach(function (component) {
    var iso = new Isotope(component.querySelector('.dyn-container__users'), {
      itemSelector: '.dyn-item__user',
      layoutMode: 'vertical',
      transitionDuration: 0
    });

    // default = show all except archived
    iso.arrange({
      filter: function() {
        return !this.classList.contains('archived');
      }
    });

    document.querySelectorAll('.user-filter-button').forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.preventDefault();

        var filterClass = event.currentTarget.getAttribute('user-filter');
        currentStatusFilter = filterClass;

        if (filterClass === '*') {
          iso.arrange({
            filter: function() {
              return !this.classList.contains('archived');
            }
          });
        } else if (filterClass === 'archived') {
          iso.arrange({
            filter: '.archived'
          });
        } else {
          iso.arrange({
            filter: '.' + filterClass
          });
        }
      });
    });

    var searchInput = component.querySelector('[element="users-search"]');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(function() {
        qsRegex = new RegExp(searchInput.value, 'gi');

        iso.arrange({
          filter: function() {
            const matchesSearch = qsRegex ? this.innerText.match(qsRegex) : true;

            let matchesStatus = true;

            if (currentStatusFilter === '*') {
              matchesStatus = !this.classList.contains('archived');
            } else if (currentStatusFilter === 'archived') {
              matchesStatus = this.classList.contains('archived');
            } else {
              matchesStatus = this.classList.contains(currentStatusFilter);
            }

            return matchesSearch && matchesStatus;
          }
        });
      }, 200));
    }
  });
}
