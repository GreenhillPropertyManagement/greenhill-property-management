document.addEventListener("DOMContentLoaded", function () {

  loadTransactionCodes()
  createTransCode();

});



// Function to load and display all transaction codes
function loadTransactionCodes() {
  $.ajax({
      url: localStorage.baseUrl + "api:ehsPQykn/get_transaction_codes", // Replace with actual API endpoint
      type: "GET",
      headers: {
          'Authorization': "Bearer " + localStorage.authToken,
      },
      success: function (response) {
          let $container = $(".transcton-codes-container");
          $container.empty(); // Clear existing items

          response.sort((a, b) => a.code.localeCompare(b.code)); // Sort by code

          response.forEach(code => {
              let $item = createTransactionCodeElement(code);
              $container.append($item);
          });
      },
      error: function (error) {
          console.error("Error loading transaction codes:", error);
      }
  });
}

// Function to create a transaction code element dynamically
function createTransactionCodeElement(codeData) {
  let $item = $(`
      <div class="transaction-code-item" data-id="${codeData.id}">
          <div class="transaction-code-item__title-wrapper">
              <div class="transaction-code-item__title-group">
                  <div class="transaction-code-item__code" data-api-input="code-number">${codeData.code}</div>
                  <div class="transaction-code-item__title" data-api-input="code-title">${codeData.title}</div>
              </div>
              <div class="transaction-code-item__icon-group">
                  <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/67c5c4d9f827e41bde48f874_pen-to-square-solid.svg" loading="lazy" alt="Edit" class="transaction-code-icon edit">
                  <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/67c5c4fd947da59ed5ba6096_trash-solid.svg" loading="lazy" alt="Delete" element="modal" modal="delete-transaction-code" class="transaction-code-icon delete">
              </div>
          </div>
          <div class="transaction-code-item__description" data-api-input="code-description">${codeData.description}</div>
      </div>
  `);

  return $item;
}

// Function to insert new transaction code in sorted order
function insertSortedTransactionCode($newItem) {
  let $container = $(".transcton-codes-container");
  let inserted = false;
  let newCode = $newItem.find(".transaction-code-item__code").text();

  $container.children(".transaction-code-item").each(function () {
      let existingCode = $(this).find(".transaction-code-item__code").text();
      if (newCode < existingCode) {
          $(this).before($newItem);
          inserted = true;
          return false; // Break loop
      }
  });

  if (!inserted) {
      $container.append($newItem); // Append if it's the highest number
  }
}

// Function to create a transaction code via AJAX
function createTransCode() {
  $("#code-transaction-form").submit(function (event) {
      event.preventDefault(); // Prevent default form submission

      $('.loader').css('display', 'flex'); // Show loader

      let formData = {};

      $(this).find('[data-api-input]').each(function () {
          let key = $(this).attr("data-api-input");
          let value = $(this).val();
          formData[key] = value;
      });

      $.ajax({
          url: localStorage.baseUrl + "api:ehsPQykn/create_transaction_code",
          type: "POST",
          headers: {
              'Authorization': "Bearer " + localStorage.authToken,
              'Content-Type': 'application/json'
          },
          data: JSON.stringify(formData),
          success: function (response) {
              alert('Success! Transaction Code Created.');

              // Create new item
              let $newItem = createTransactionCodeElement(response);

              // Ensure function is available before calling it
              if (typeof insertSortedTransactionCode === "function") {
                  insertSortedTransactionCode($newItem);
              } else {
                  console.error("insertSortedTransactionCode function is missing.");
              }

              // Clear form fields
              $("#code-transaction-form").trigger("reset");
          },
          error: function (error) {
              console.error("Error creating transaction code:", error);
              alert('Something Went Wrong. Please Try Again.');
          },
          complete: function () {
              $('.loader').hide(); // Hide loader
          }
      });
  });
}