document.addEventListener("DOMContentLoaded", function() {


  createProperty();

  $('.property-filter-button').on('click', function() {
    // Reset the font color for all filter buttons
    $('.property-filter-button').css('color', ''); // Assuming the default color is set elsewhere or is inherited
    // Change the font color of the clicked button
    $(this).css('color', '#412ACE');
  });

  /* --------- Properties Tab ----------- */

  // load the properties on the main properties view 
  $("[api-button='load-properties']").on('click', function() { // when user clicks on 'properties' in main nav
      displayProperties('properties');
      $("[modal=create-property]").show();
  });

 
  /* ---------- User Profile Page ---------- */

  // load the properties associated to the selected user
  $("[profile-tab-button='load-user-properties']").on('click', function() { 
    displayProperties('profile',localStorage.userProfileRecId); 
    $("[modal=create-property]").hide(); 
  });

});


function displayProperties(page, user_profile) {



  var propertiesContainer = $("[data='properties-container']");

  $.ajax({
    url: localStorage.baseUrl + 'api:aJp1AxHb/load_properties', // Use the provided endpoint URL
    method: 'GET',
    dataType: 'json',
    headers: {
      'Authorization': "Bearer " + localStorage.authToken
    },
    data: {
      user_profile: user_profile,
      page: page,  
    },

    success: function (response) {

      var sampleProperty = $('.property-sample-wrapper [data="property-sample-item"]:first');
      propertiesContainer.empty();

      response.forEach((property) => {
        let propertyItem = $(sampleProperty).clone().appendTo(propertiesContainer);

        propertyItem.attr("id", property.property_id);
        propertyItem.addClass(property.status);
        if (property.property_img) {
          propertyItem.find("[data='property_img']").attr("srcset", property.property_img);
        }
        propertyItem.find("[data='property-street']").text(property.street);
        propertyItem.find("[data='property-city']").text(property.city);
        propertyItem.find("[data='property-state']").text(property.state);
        propertyItem.find("[data='property-zip']").text(property.zip);

        $(propertyItem).click(function () {

          var fetchedPropertyId = property.property_id;
          $('#property').click();
          localStorage.setItem("pageId", "property");
          localStorage.setItem('pageRefreshParam', property.property_id);
          localStorage.setItem('propertyId', property.property_id);
          localStorage.setItem('propertyRecId', property.id);
          localStorage.setItem('propertyStreet', property.street);
          history.pushState("property", null, "/app/property?id=" + fetchedPropertyId);

        });

      });
    },
    complete: function () {
      
      $('.loader').hide();
      propertiesFiltering();
         
    },
    error: function (error) {
      // Handle errors here
    }
  });
}

function createProperty(){

  /* Hanle Form Submission API Call */
  $('#create-property-form').submit(function (event) {

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
 
   // add to form data
   formData['user_uuid'] = localStorage.userId;
  
   
   $.ajax({
     url: localStorage.baseUrl + "api:aJp1AxHb/create_property", 
     type: "POST",
     headers: {
      'Authorization': "Bearer " + localStorage.authToken
    },
     data: formData,
     success: function (response) {
 
       $("#create-property-form")[0].reset();

      // Reset the Uploadcare widget
      var widget = uploadcare.Widget('#create-property-img');
      widget.value(null);

       $('.loader').hide();

     },
     complete: function () {

      $("[api-button='load-properties']").click();

     },
     error: function (error) {
     
       }
   });
     
 });
 
 
}

function propertiesFiltering() {
  
  // Debounce function to delay the search filtering
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
  // Query all .properties-component elements
  var propertComponent = document.querySelectorAll('.properties-component');

  propertComponent.forEach(function (component, index) {
    // Initialize Isotope on the .dyn-container__properties element
    var iso = new Isotope(component.querySelector('.dyn-container__properties'), {
      itemSelector: '.dyn-item__property',
      layoutMode: 'fitRows', // This will keep the grid layout intact
      transitionDuration: 0 // animation
    });

    /* Default to Active Properties
    // After initializing Isotope, default click on 'Active Properties'
    var activeButton = component.querySelector('[property-filter="active"]');
    if(activeButton) {
        activeButton.click();
    }*/

    document.querySelectorAll('.property-filter-button').forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        var filterClass = event.currentTarget.getAttribute('property-filter');
        var filterSelector = filterClass === '*' ? '*' : '.' + filterClass;
        iso.arrange({
          filter: filterSelector
        });
      });
    });

    // Initialize search functionality
    var searchInput = component.querySelector('[element="property-search"]');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(function() {
        qsRegex = new RegExp(searchInput.value, 'gi');
        iso.arrange({
          filter: function() {
            return qsRegex ? this.innerText.match(qsRegex) : true;
          }
        });
      }, 200)); // Adjust debounce delay as needed
    }
  });
}
