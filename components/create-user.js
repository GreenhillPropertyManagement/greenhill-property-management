document.addEventListener("DOMContentLoaded", function() {  
  
  /* -----  Handle Form Submission When Creating User ---- */
  $("#create-user").on("click", function () {
    
    // Fetch all units and populate the unit select field (for adding tenants and assigning to a unit)
    $.ajax({
      url: localStorage.baseUrl + "api:t2-fjTTj/get_units",
      method: "GET",
      dataType: "json",
      success: function (response) {

        // Clear previous options in the select field
        $("#tenant_unit").empty();

        // Add the placeholder to the select field
        $("#tenant_unit").append(
          $("<option>", {
            value: "",
            text: "Select a unit",
            selected: true,
            disabled: true
          })
        );

        // Loop through each unit in the response
        $.each(response, function (index, unit) {
          // Create the option text
          var optionText = unit.property_info.street + " / " + unit.unit_name;

          // Append the new option to the select field
          $("#tenant_unit").append(
            $("<option>", {
              value: unit.id,
              text: optionText
            })
          );
        });
      },
      complete: function (){

      // Clear the Uploadcare uploader field
      const uploader = uploadcare.Widget('#profile_img');
      uploader.value(null); // Clear the value of the uploader
      
      },
      error: function (error) {
        console.error("Error fetching units:", error);
      }
    });
  
  });

});
