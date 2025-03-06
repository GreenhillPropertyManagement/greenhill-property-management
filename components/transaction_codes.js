document.addEventListener("DOMContentLoaded", function () {
  if (localStorage.userRole === "Admin") {

    createTransCode();
    loadTransactionCodes();
    setupEditTransactionHandler();
    setupDeleteTransactionHandler();
  }
   
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
            let $linkedExpenseSelect = $("#code-type-2"); // Get the linked_expense select field

            $container.empty(); // Clear existing items
            $linkedExpenseSelect.empty(); // Clear existing options

            response.sort((a, b) => a.code.localeCompare(b.code)); // Sort by code

            // Populate transaction codes in UI
            response.forEach(code => {
                let $item = createTransactionCodeElement(code);
                $container.append($item);
            });

            // Always add a default option to the linked_expense dropdown
            $linkedExpenseSelect.append(`<option value="">Select Expense</option>`);

            // Filter and add only expense-type transaction codes
            let expenseCodes = response.filter(code => code.type === "expense");

            expenseCodes.forEach(expenseCode => {
                let option = `<option value="${expenseCode.id}">${expenseCode.code} - ${expenseCode.title}</option>`;
                $linkedExpenseSelect.append(option);
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
      <div class="transaction-code-item" 
          data-id="${codeData.id}" 
          data-code="${codeData.code}" 
          data-title="${codeData.title}" 
          data-description="${codeData.description}">
          
          <div class="transaction-code-item__title-wrapper">
              <div class="transaction-code-item__title-group">
                  <div class="transaction-code-item__code" data-api-input="code-number">${codeData.code}</div>
                  <div class="transaction-code-item__title" data-api-input="code-title">${codeData.title}</div>
              </div>
              <div class="transaction-code-item__icon-group">
                  <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/67c5c4d9f827e41bde48f874_pen-to-square-solid.svg" 
                      loading="lazy" alt="Edit" element="modal" modal="edit-trans-code" class="transaction-code-icon edit">
                  <img src="https://cdn.prod.website-files.com/64ef87a21e6d1b3957b7416b/67c5c4fd947da59ed5ba6096_trash-solid.svg" 
                      loading="lazy" alt="Delete" element="modal" modal="delete-transaction-code" class="transaction-code-icon delete">
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

// Funciton to create new transaction code
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
  
                // If the newly created transaction is an expense, add it to the linked_expense select field
                if (response.type === "expense") {
                    let $linkedExpenseSelect = $("#code-type-2");
                    let newOption = `<option value="${response.id}">${response.code} - ${response.title}</option>`;
                    $linkedExpenseSelect.append(newOption);
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

function setupDeleteTransactionHandler() {
    // Remove previous click event to prevent duplicates
    $(document).off("click", ".transaction-code-icon.delete").on("click", ".transaction-code-icon.delete", function () {
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

    // Ensure the delete button only sends one request
    $(document).off("click", '[data-api-button="delete-trans-code"]').on("click", '[data-api-button="delete-trans-code"]', function () {
        $('.loader').css('display','flex');
        let transactionId = $(this).attr("data-transaction-id");

        if (!transactionId) {
            console.error("No transaction ID found for deletion.");
            return;
        }

        // Disable the button to prevent multiple clicks
        $(this).prop("disabled", true);

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
                $('.modal__block').hide();
                $('.loader').hide();

                // Remove the deleted transaction from the list
                $(`.transaction-code-item[data-id="${transactionId}"]`).fadeOut(300, function () {
                    $(this).remove();
                });
            },
            error: function (error) {
                console.error("Error deleting transaction code:", error);
                alert("Something went wrong. Please try again.");
                $('.modal__block').hide();
                $('.loader').hide();
            },
            complete: function () {
                // Re-enable the button after the request is completed
                $('[data-api-button="delete-trans-code"]').prop("disabled", false);
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
        let transactionType = $transactionItem.attr("data-type"); // Get type
        let transactionLinkedExpense = $transactionItem.attr("data-linked-expense"); // Get linked expense ID

        // Populate form fields
        $("#edit-trans-code-number").val(transactionCode);
        $("#edit-trans-title").val(transactionTitle);
        $("#edit-trans-description").val(transactionDescription);
        $("#edit-trans-type").val(transactionType); // Set type
        $("#edit-trans-linked-expense").val(transactionLinkedExpense); // Set type


        // Show/hide linked_expense based on type
        toggleLinkedExpenseField(transactionType, "#edit-trans-linked-expense");

        // Populate linked_expense select field
        populateLinkedExpenseSelect(transactionLinkedExpense);

        // Store transaction ID in a hidden attribute for updating
        $("#edit-trans-code-form").attr("data-transaction-id", transactionId);
    });

    // When the type field changes, show/hide linked_expense dynamically
    $("#edit-trans-type").on("change", function () {
        let selectedType = $(this).val();
        toggleLinkedExpenseField(selectedType, "#edit-trans-linked-expense");
    });

    // form submission
    $("#edit-trans-code-form").submit(function (event) {
        event.preventDefault(); // Prevent default form submission
    
        $('.loader').css('display', 'flex'); // Show loader
    
        let transactionId = $(this).attr("data-transaction-id");
    
        if (!transactionId) {
            console.error("No transaction ID found for editing.");
            return;
        }
    
        let formData = {};
        $(this).find('[data-api-input]').each(function () {
            let key = $(this).attr("data-api-input");
            let value = $(this).val();
            formData[key] = value;
        });
    
        formData["transaction_code_id"] = transactionId; // Ensure ID is included
    
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
                $('.modal__block').hide(); // Hide modal
    
                // Find and update the UI with new values
                let $updatedItem = $(`.transaction-code-item[data-id="${transactionId}"]`);
                $updatedItem.attr("data-code", response.code);
                $updatedItem.attr("data-title", response.title);
                $updatedItem.attr("data-description", response.description);
                $updatedItem.attr("data-type", response.type);
                $updatedItem.attr("data-linked-expense", response.linked_expense || "");
    
                $updatedItem.find(".transaction-code-item__code").text(response.code);
                $updatedItem.find(".transaction-code-item__title").text(response.title);
                $updatedItem.find(".transaction-code-item__description").text(response.description);
    
                // Ensure linked_expense is updated correctly
                if (response.type === "payment" || response.type === "credit") {
                    $("#edit-trans-linked-expense").closest(".form__item").show();
                } else {
                    $("#edit-trans-linked-expense").closest(".form__item").hide();
                }
            },
            error: function (error) {
                console.error("Error updating transaction code:", error);
                alert("Something went wrong. Please try again.");
            },
            complete: function () {
                $('.loader').hide(); // Hide loader
            }
        });
    });
}

// Function to show/hide linked_expense field
function toggleLinkedExpenseField(type, selector) {
    if (type === "payment" || type === "credit") {
        $(selector).closest("#edit-trans-linked-expense").show();
    } else {
        $(selector).closest("#edit-trans-linked-expense").hide();
        $(selector).val(""); // Reset value when hidden
    }
}

// Function to populate linked_expense select field with all expenses
function populateLinkedExpenseSelect(selectedExpenseId) {
    let $linkedExpenseSelect = $("#edit-trans-linked-expense");
    $linkedExpenseSelect.empty(); // Clear existing options

    // Add default option
    $linkedExpenseSelect.append(`<option value="">Select one</option>`);

    // Fetch all transaction codes
    $.ajax({
        url: localStorage.baseUrl + "api:ehsPQykn/get_transaction_codes",
        type: "GET",
        headers: {
            'Authorization': "Bearer " + localStorage.authToken,
        },
        success: function (response) {
            let expenseCodes = response.filter(code => code.type === "expense");

            expenseCodes.forEach(expenseCode => {
                let isSelected = selectedExpenseId && expenseCode.id === selectedExpenseId ? "selected" : "";
                let option = `<option value="${expenseCode.id}" ${isSelected}>${expenseCode.code} - ${expenseCode.title}</option>`;
                $linkedExpenseSelect.append(option);
            });
        },
        error: function (error) {
            console.error("Error loading expense codes:", error);
        }
    });
}
