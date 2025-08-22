document.addEventListener("DOMContentLoaded", function() {

  createWorkOrder(); // init functionality to create work orders
  loadCategoriesInForm(); // init functinoality to load in work order categories
  loadUnitsForMaintenanceSelector(); // init functionalit to load in units in unit selector 

  // Main Maintenance Tab is clicked
  $('#maintenance').click(function(){

    $('#maintenance-unit-selector-wrapper').show(); // show unit selector in new work order form (since this is global)

    // verify which feed to load (admin or assigned user)
    if (localStorage.userRole === 'Admin') {
      loadWorkOrders('admin');
    }else{
      loadWorkOrders('assigned_user',localStorage.userRecId);
    }
    
  });

  // Maintenance Tab is Clicked (Profile Page or Unit Page)
  $("[api-button='maintenance']").click(function(){
    $('#maintenance-unit-selector-wrapper').hide(); // hide unit selector in new work order form (since this is unit based)

    if (localStorage.pageId === 'unit'){

      loadWorkOrders('unit','',localStorage.unitRecId);

    } else if (localStorage.pageId === 'profile'){

      loadWorkOrders('assigned_user',localStorage.userProfileRecId,'');
    }
    
  });

  /*---- Maintenance Categories Flows */

  newMaintenanceCategory();

  /* Maintenance Category Button Clicked */
  $(document).on('click', '.maintenance-new-cat-button', function() {   
    $('.modal__block').show().children().hide();
    $('#maintenance-new-cat').show();
    $('#cat-tab-button').click();
    loadCategories();
  });

  /* Delete Category Button Clicked */
  $(document).on('click', "[data-cat='delete-cat-button']", function () {
    // Retrieve the category ID
    var categoryId = $(this).attr('data-delete-cat-id');
    
    // Call the delete function with the ID
    deleteMaintenanceCat(categoryId);
  });

  /* ----- New Work Order Flows */

    /* New Work Oder Bttn Clicked */
    $(document).on('click', '.new-work-order', function() {   
      $('.modal__block').show().children().hide();
      $('#new-work-order').show();
      
    });

  /* ------ Update Work Order Flows */
    
    let workOrderToUpdate = null;

    $("[element='work-order-form-button']").click(function(){
      updateWorkOrder();
    });



});


function newMaintenanceCategory() {
  // Form Submission API Call
  $('#new-maintenance-category-form').submit(function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Handle 'Loading' State
    $('.modal__block').hide();
    $('.loader').css('display', 'flex');

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

    // Add additional data to formData
    formData['user_uuid'] = localStorage.userId;

    // Make an AJAX POST request
    $.ajax({
      url: localStorage.baseUrl + 'api:SRnaK1AT/create_new_category',
      type: 'POST',
      headers: {
        'Authorization': "Bearer " + localStorage.authToken
      },
      data: JSON.stringify(formData), // Convert formData to JSON
      contentType: 'application/json', // Set the content type to JSON
      success: function (response) {

        $('.loader').hide();
        showToast('Success! New Category Created')
        $('#new-cat-title').val('');

      },
      error: function (error) {
        // Handle the error here
      },
    });
  });
}

function loadCategories() {

  $('.loader').css('display', 'flex');
  var catContainer = $("[dyn-container='categories']");

  $.ajax({
    url: localStorage.baseUrl + 'api:SRnaK1AT/load_categories',
    method: 'GET',
    dataType: 'json',
    data: {},
    success: function (response) {
      var sampleCatItem = $('.category-sample-wrapper').find("[dyn-item='maintenance-category']");
      catContainer.empty();

      response.forEach((category) => {
        let catItem = $(sampleCatItem).clone().appendTo(catContainer);

        catItem.attr("id", category.id);
        // Bind data
        catItem.find("[data-maintenance-cat='title']").text(category.category_title);

        // Click handler - delete category
        catItem.find("[data-cat='delete-cat']").click(function () {
          let catId = $(this).closest("[dyn-item='maintenance-category']").attr("id");
          $('.delete-cat-wrapper').find("[data-maintenance-cat='title']").text(category.category_title);
          $('.delete-cat-wrapper').find("[data-cat='delete-cat-button']").attr('data-delete-cat-id', catId);
          $('.delete-cat-wrapper').css('display', 'flex');
        });

        // Click handler - edit category
        catItem.find("[data-cat='edit-cat']").click(function () {
          let catId = $(this).closest("[dyn-item='maintenance-category']").attr("id");
          let titleElement = $(this).closest("[dyn-item='maintenance-category']").find("[data-maintenance-cat='title']");

        // Make the title editable and focus on it
        titleElement.attr('contenteditable', 'true').focus().css({
          'padding': '10px',
          'border': '1px solid #412ACE', // Specify 'solid' here
          'border-radius': '5px',
          'outline': 'none',
          'margin': '-10px'
        });

          // Make the title editable and focus on it
          titleElement.attr('contenteditable', 'true').focus();

          // Save the original title in case we need to revert back
          var originalTitle = titleElement.text();

          // Event listener for when the user finishes editing
          titleElement.on('blur', function() {
            // Get the new title text
            var newTitle = titleElement.text();

            // If the new title is different, call the edit API
            if (newTitle !== originalTitle) {
              editCategory(catId, newTitle);
            }
            
            // Turn off contenteditable and remove the blur event listener to avoid multiple bindings
            titleElement.removeAttr('contenteditable').off('blur');
          });
        });
      });
    },
    complete: function() {
      $('.loader').hide();
    },
    error: function (error) {
      console.error("Error loading categories:", error);
    }
  });

}

function deleteMaintenanceCat(categoryId) {

  $('.loader').css('display', 'flex');
  // Make sure categoryId is defined and is a number
  if (categoryId && !isNaN(categoryId)) {
    // Make API Call
    $.ajax({
      url: localStorage.baseUrl + "api:SRnaK1AT/delete_category",
      type: "POST",
      headers: {
        'Authorization': "Bearer " + localStorage.authToken
      },
      data: {
        user_uuid: localStorage.userId,
        cat_id: categoryId // Use the categoryId passed as a parameter
      },
      success: function (response) {
       
       $('.modal__block').hide();
      },
      complete: function() {
        $('.loader').hide();
        // Hide the modal
        showToast('Success! Category Deleted');
        $('.delete-cat-wrapper').css('display', 'none');
      },
      error: function (error) {
        // Handle errors here
      }
    });
  } else {
    console.error('Invalid category ID');
  }
}

function editCategory(categoryId, categoryTitle){

  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:SRnaK1AT/edit_category",
    type: "POST",
    headers: {
      'Authorization': "Bearer " + localStorage.authToken
    },
    data: {
      user_uuid: localStorage.userId,
      category_title: categoryTitle,
      category_id: categoryId
    },
    success: function (response) {
      showToast('Success! Category Updated');
      $('.modal__block').hide();

    },
    complete: function() {

      $('.loader').hide();

    },
    error: function (error) {

    }
  }); 

}

function createWorkOrder () {

  // Form Submission API Call
  $('#new-work-order-form').off('submit').on('submit', function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Handle 'Loading' State
    $('.modal__block').hide();
    $('.loader').css('display', 'flex');

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

    let message_formatted = $("[data-api-input='work_order_message']").val().replace(/\n/g, "<br>");


    // Add additional data to formData
    formData['message_formatted'] = message_formatted;
    formData['user_uuid'] = localStorage.userId;

    // update unit based on page (main maintenance page or unit page)
    if (localStorage.pageId === 'unit') { 
      formData['unit_id'] = localStorage.pageRefreshParam; // get unit from current unit page
    } else {
      formData['unit_id'] = $('#maintenance_unit').val(); // get unit from form select field
    }
    
    // Make an AJAX POST request
    $.ajax({
      url: localStorage.baseUrl + 'api:SRnaK1AT/create_work_order',
      type: 'POST',
      headers: {
        'Authorization': "Bearer " + localStorage.authToken
      },
      data: JSON.stringify(formData), // Convert formData to JSON
      contentType: 'application/json', // Set the content type to JSON
      success: function (response) {

      
        $('.loader').hide();
        showToast('Success! Work Order Created');
        // reset the form
        $("#new-work-order-form")[0].reset();

        // Reset the Uploadcare widget
        var widget = uploadcare.Widget('#work-order-media');
        widget.value(null);

        if (localStorage.pageId === 'unit'){
          loadWorkOrders('unit','',localStorage.unitRecId);
        } else {
          if (localStorage.userRole === 'Admin') {
            loadWorkOrders('admin');
          }else{
            loadWorkOrders('assigned_user',localStorage.userRecId);
          }
        }
        
        
      },
      error: function (error) {
        // Handle the error here
      },
    });
  });

}

function loadCategoriesInForm () {

  $.ajax({
    url: localStorage.baseUrl + "api:SRnaK1AT/load_categories",
    method: "GET",
    dataType: "json",
    success: function (response) {

      // Clear previous options in the select field
      $("[data-api-input='work_order_category']").empty();

      // Add the placeholder to the select field
      $("[data-api-input='work_order_category']").append(
        $("<option>", {
          value: "",
          text: "Choose a Category",
          selected: true,
          disabled: true
        })
      );

      // Loop through each unit in the response
      $.each(response, function (index, category) {
        // Create the option text
        var optionText = category.category_title;

        // Append the new option to the select field
        $("[data-api-input='work_order_category']").append(
          $("<option>", {
            value: category.id,
            text: optionText
          })
        );
      });
    },
    complete: function (){
    
    },
    error: function (error) {
      console.error("Error fetching units:", error);
    }
  });
}

function updateWorkOrder() {

  $('.loader').css('display','flex');

  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:SRnaK1AT/update_work_order",
    type: "POST",
    headers: {
      'Authorization': "Bearer " + localStorage.authToken
    },
    data: {
      user_uuid: localStorage.userId,
      work_order: workOrderToUpdate,
      status: $("#work-order-status-select").val()
    },
    success: function (response) {
      
      $('.modal__block').hide();
      showToast('Success! Work Order Updated!');

    },
    complete: function() {

      if (localStorage.pageId === 'unit'){
        loadWorkOrders('unit','',localStorage.unitRecId);
      } else{
        if (localStorage.userRole === 'Admin') {
          loadWorkOrders('admin');
        }else{
          loadWorkOrders('assigned_user',localStorage.userRecId);
        }
      }

    },
    error: function (error) {

    }
  }); 

}

function loadWorkOrders (type,user,unit,view) {

  //show loader
  $('.loader').css('display', 'flex');

  var workOrdersContainer = $("[dyn-container='work-orders']");

  $.ajax({
    url: localStorage.baseUrl + 'api:SRnaK1AT/load_work_orders', // Use the provided endpoint URL
    method: 'GET',
    dataType: 'json',
    headers: {
      'Authorization': "Bearer " + localStorage.authToken
    },
    data: {
      type: type,
      user_rec_id: user,
      unit_rec_id: unit,
      view: view   
    },

    success: function (response) {
     
      if (view=== 'dashboard') {

        var sampleItem = $('.work-orders-sample-wrapper').find("[data-dyn-item=dashboard-work-order]")
      } else {
        var sampleItem = $('.work-orders-sample-wrapper').find("[dyn-item=sample-work-order]")
      }
      
      workOrdersContainer.empty();

      response.forEach((workOrder) => {

        let workOrderItem = $(sampleItem).clone().appendTo(workOrdersContainer);

        workOrderItem.attr("id", workOrder.ticket_id);

        // bind data
        workOrderItem.find("[data-work-order=timestamp]").text(formatDateToCustomFormat(workOrder.created_at)); // bind timestamp
        workOrderItem.find("[data-work-order=title]").text(workOrder.title); // bind title
        workOrderItem.find("[data-work-order=property]").text(workOrder.property.street); //bind property street
        workOrderItem.find("[data-work-order=unit]").text(workOrder.unit.unit_name); // bind unit 
        workOrderItem.find("[data-work-order=category]").text(workOrder.category_title); // bind category


        // update status
        workOrderItem.find("[data-work-order=status]").text(workOrder.status); // bind status
        workOrderItem.attr('data-work-order-status',workOrder.status); // set attribute for isotope filtering

        if (workOrder.status === 'open'){
          workOrderItem.find("[data-work-order=status]").css('background-color','#BB342F');
        } else if (workOrder.status === 'in-progress') {
          workOrderItem.find("[data-work-order=status]").css('background-color','#DEA921');
        } else if (workOrder.status === 'closed') {
          workOrderItem.find("[data-work-order=status]").css('background-color','#53C76D');
        }
        
        // click handler for work orders
        $(workOrderItem).click(function () {

          workOrderToUpdate = $(this).attr('id');

          $('.modal__block').show().children().hide(); // show modal
          $('#maintenance-record-view').show(); // show work order card
          $("[data-work-order='view-street']").text(workOrder.property.street); // bind the property street
          $("[data-work-order-view='title']").text(workOrder.title); // bind the title
          $("[data-work-order=view-unit]").text(workOrder.unit.unit_name); // bind the unit name
          $("#work-order-status-select").val(workOrder.status); // bind the status of the work order to select field 
          $("[data-work-order=view-timestamp]").text(formatDateToCustomFormat(workOrder.created_at)); // bind the timestamp
          $("[data-work-order='message']").html(workOrder.description.replace(/\n/g, '<br>')); // bind the message
          $(".dyn-container__maintenance-record-imgs").empty(); // empty the images container so new ones can be added

          // Check if there are images in the message
          if (workOrder.media) {

            // show images container
            $('#work-order-photo-label').show();
            $('.dyn-container__maintenance-record-imgs').show();

            // inject photos
            const mediaUrl = workOrder.media;
            const [uuid, numImages] = mediaUrl.split('~');
            const numImagesInt = parseInt(numImages);
        
            for (let i = 0; i < numImagesInt; i++) {
              const imageUrl = `${mediaUrl}/nth/${i}/`;
              const imageElement = $('<img>');
              imageElement.attr('src', imageUrl);
              imageElement.attr('alt', 'Image');
              imageElement.css('max-width', '300px');
              imageElement.css('max-height', '200px');
              imageElement.css('margin-bottom', '10px');
              imageElement.css('border-radius', '7px'); // Add padding to the bottom of each image
        
              // Add a click handler to the image element
              imageElement.click(function() {
                window.open(imageUrl, '_blank'); // Open the image URL in a new tab when the image is clicked
              });
        
              const imageDiv = $('<div>');
              imageDiv.append(imageElement);
        
              $(".dyn-container__maintenance-record-imgs").append(imageDiv); // Append the image div to the user message container
            }
          } else {
            $('#work-order-photo-label').hide();
            $('.dyn-container__maintenance-record-imgs').hide();
          }
          
        });

      });

    },
    complete: function () {

      $('.loader').hide();
      workOrdersFiltering();
    
    },
    error: function (error) {
    
    }
  });
}

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

function workOrdersFiltering() {
  var qsRegex;
  // Query all .maintenance-component elements
  var maintenanceComponents = document.querySelectorAll('.maintenance-component');

  maintenanceComponents.forEach(function (component, index) {
    // Initialize Isotope on the .dyn-container__maintenance-records element
    var iso = new Isotope(component.querySelector('.dyn-container__maintenance-records'), {
      itemSelector: '[dyn-item="sample-work-order"]',
      layoutMode: 'vertical', // This will keep the grid layout intact
      transitionDuration: 0 // disable animation
    });

    // Add event listener to filter buttons
    component.querySelectorAll('[filter-work-order]').forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        var filterValue = event.currentTarget.getAttribute('filter-work-order');
        filterValue = filterValue === 'all' ? '*' : '[data-work-order-status="' + filterValue + '"]';
        iso.arrange({ filter: filterValue });
      });
    });

    // Initialize search functionality
    var searchInput = component.querySelector('[element="search-work-orders"]');
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

function loadUnitsForMaintenanceSelector() {

    // Fetch all units and populate the unit select field (for adding tenants and assigning to a unit)
    $.ajax({
      url: localStorage.baseUrl + "api:SRnaK1AT/get_units_for_maintenance",
      method: "GET",
      dataType: "json",
      headers: {
        'Authorization': "Bearer " + localStorage.authToken
      },
      success: function (response) {
        // Clear previous options in the select field
        $("#maintenance_unit").empty();
    
        // Add the placeholder to the select field
        $("#maintenance_unit").append(
          $("<option>", {
            value: "",
            text: "Select a unit",
            selected: true,
            disabled: true
          })
        );
    
        // Ensure response is an array
        if (!Array.isArray(response)) {
          response = [response];
        }
    
        // Loop through each unit in the response
        $.each(response, function (index, unit) {
          // Create the option text
          var optionText = unit.property_info.street + " / " + unit.unit_name;
    
          // Append the new option to the select field
          $("#maintenance_unit").append(
            $("<option>", {
              value: unit.unit_id,
              text: optionText
            })
          );
        });
      },
      complete: function (){
      
      },
      error: function (error) {
        console.error("Error fetching units:", error);
      }
    });

}

function loadTransactionCodesInForm() {
  $.ajax({
    url: localStorage.baseUrl + "api:ehsPQykn/load_transaction_codes_form",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
      "Content-Type": "application/json"
    },
    success: function (response) {
      const $select = $('[data-api-input="transaction_code"]');

      $select.empty();
      $select.append('<option selected disabled value="">Select Transaction Code...</option>');

      response.forEach(item => {
        const option = `<option value="${item.id}">${item.code} - ${item.title}</option>`;
        $select.append(option);
      });
    },
    error: function (xhr) {
      console.error("Error loading transaction codes:", xhr.responseText);
    },
    complete: function () {
      console.log("Transaction codes loaded.");
    }
  });
}