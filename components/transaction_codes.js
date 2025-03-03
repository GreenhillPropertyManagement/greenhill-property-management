document.addEventListener("DOMContentLoaded", function () {
  createTransCode();
  loadTransactionCodes();
  setupEditTransactionHandler();
  setupDeleteTransactionHandler();
});

// Function to load and display all transaction codes
function loadTransactionCodes() {
  $.ajax({
      url: localStorage.baseUrl + "api:ehsPQykn/get_transaction_codes",
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

          // Ensure delete functionality works on loaded items
          setupDeleteTransactionHandler();
      },
      error: function (error) {
          console.error("Error loading transaction codes:", error);
      }
  });
}

// Function to create a transaction code element dynamically
function createTransactionCodeElement(codeData) {
  return $(`
      <div class="transaction-code-item" data-id="${codeData.id}" data-code="${codeData.code}" data-title="${codeData.title}">
          <div class="transaction-code-item__title-wrapper">
              <div class="transaction-code-item__title-group">
                  <div class="transaction-code-item__code" data-api-input="code-number">${codeData.code}</div>
                  <div class="transaction-code-item__title" data-api-input="code-title">${codeData.title}</div>
              </div>
              <div class="transaction-code-item__icon-group">
                  <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/67c5c4d9f827e41bde48f874_pen-to-square-solid.svg" loading="lazy" alt="Edit" element="modal" modal="edit-trans-code" class="transaction-code-icon edit">
                  <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/67c5c4fd947da59ed5ba6096_trash-solid.svg" loading="lazy" alt="Delete" element="modal" modal="delete-transaction-code" class="transaction-code-icon delete">
              </div>
          </div>
          <div class="transaction-code-item__description" data-api-input="code-description">${codeData.description}</div>
      </div>
  `);
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

              // Ensure sorting
              if (typeof insertSortedTransactionCode === "function") {
                  insertSortedTransactionCode($newItem);
              } else {
                  $(".transcton-codes-container").append($newItem); // Default append if sorting fails
              }

              // Reinitialize delete functionality for new items
              setupDeleteTransactionHandler();

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

// Function to setup the delete transaction handler
function setupDeleteTransactionHandler() {
  $(document).on("click", ".transaction-code-icon.delete", function () {
      let $transactionItem = $(this).closest(".transaction-code-item");

      // Extract transaction details
      let transactionId = $transactionItem.attr("data-id");
      let transactionCode = $transactionItem.attr("data-code");
      let transactionTitle = $transactionItem.attr("data-title");

      // Update the popup text with "code - title"
      let transactionDisplay = `${transactionCode} - ${transactionTitle}`;
      $('[data=transaction-code]').text(transactionDisplay);

      // Store the transaction ID in a data attribute for deletion
      $('[data-api-button="delete-trans-code"]').attr("data-transaction-id", transactionId);
  });

  $(document).on("click", '[data-api-button="delete-trans-code"]', function () {

      $('.loader').css('display','flex'); //show loader
      let transactionId = $(this).attr("data-transaction-id");

      if (!transactionId) {
          console.error("No transaction ID found for deletion.");
          return;
      }

      $.ajax({
          url: localStorage.baseUrl + "api:ehsPQykn/delete_transaction_code",
          type: "POST",
          headers: {
              'Authorization': "Bearer " + localStorage.authToken,
              'Content-Type': 'application/json'
          },
          data: JSON.stringify({ transaction_code_id: transactionId }),
          success: function () {

              alert("Transaction Code Deleted Successfully!");
              $('.modal__block').hide(); //hide modal
              $('.loader').hide() //hide loader

              // Remove the deleted transaction from the list
              $(`.transaction-code-item[data-id="${transactionId}"]`).fadeOut(300, function () {
                  $(this).remove();
              });
          },
          error: function (error) {
              console.error("Error deleting transaction code:", error);
              alert("Something went wrong. Please try again.");
              $('.modal__block').hide(); //hide modal
              $('.loader').hide() //hide loader
          }
      });
  });
}

// Function to setup the edit transaction handler
function setupEditTransactionHandler() {
  $(document).on("click", ".transaction-code-icon.edit", function () {
      let $transactionItem = $(this).closest(".transaction-code-item");

      // Extract transaction details
      let transactionId = $transactionItem.attr("data-id");
      let transactionCode = $transactionItem.attr("data-code");
      let transactionTitle = $transactionItem.attr("data-title");
      let transactionDescription = $transactionItem.attr("data-description");

      // Populate form fields
      $("#edit-trans-code-number").val(transactionCode);
      $("#edit-trans-title").val(transactionTitle);
      $("#edit-trans-description").val(transactionDescription);

      // Store transaction ID in a hidden attribute for updating
      $("#edit-trans-code-form").attr("data-transaction-id", transactionId);
  });

  $("#edit-trans-code-form").submit(function (event) {
      event.preventDefault(); // Prevent default form submission

      $('.loader').css('display', 'flex'); // Show loader

      let transactionId = $(this).attr("data-transaction-id");
      let updatedCode = $("#edit-trans-code-number").val();
      let updatedTitle = $("#edit-trans-title").val();
      let updatedDescription = $("#edit-trans-description").val();

      if (!transactionId) {
          console.error("No transaction ID found for editing.");
          return;
      }

      let formData = {
          transaction_code_id: transactionId,
          number: updatedCode,
          title: updatedTitle,
          description: updatedDescription
      };

      $.ajax({
          url: localStorage.baseUrl + "api:ehsPQykn/edit_transaction_code",
          type: "POST",
          headers: {
              'Authorization': "Bearer " + localStorage.authToken,
              'Content-Type': 'application/json'
          },
          data: JSON.stringify(formData),
          success: function (response) {
              alert("Transaction Code Updated Successfully!");
              $('.modal__block').hide(); //hide modal

              // Find and update the UI with new values
              let $updatedItem = $(`.transaction-code-item[data-id="${transactionId}"]`);
              $updatedItem.attr("data-code", updatedCode);
              $updatedItem.attr("data-title", updatedTitle);
              $updatedItem.attr("data-description", updatedDescription);

              $updatedItem.find(".transaction-code-item__code").text(updatedCode);
              $updatedItem.find(".transaction-code-item__title").text(updatedTitle);
              $updatedItem.find(".transaction-code-item__description").text(updatedDescription);
          },
          error: function (error) {
              console.error("Error updating transaction code:", error);
              $('.modal__block').hide(); //hide modal
              alert("Something went wrong. Please try again.");
              $('.loader').hide(); // Hide loader
          },
          complete: function () {
              $('.loader').hide(); // Hide loader
          }
      });
  });
}