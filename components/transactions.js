let transactionToDelete;
let amount;
document.addEventListener("DOMContentLoaded", function () {

  /* Load Outstanding Transactions Func (Tenant Screen) */
  $(document).on("click", '[data-api="load-transactions"]', function (e) {
    e.preventDefault();
    loadOutstandingTransactions();
  });

  createPropertyTransaction(); // init property transaction creation

  /* HANDLE FORM UX FOR TRANSACTION FORMS */
  // Select all forms with the 'api-form="user-transaction"' attribute
  var transactionForms = document.querySelectorAll(
    'form[api-form="user-transaction"]',
  );
  transactionForms.forEach(function (form) {
    var freqField = form.querySelector('[data-api-input="frequency"]');
    var transDateField = form.querySelector(
      '[data-api-input="transaction_date"]',
    );
    var startDateField = form.querySelector(
      '[data-api-input="transaction_start_date"]',
    );
    var endDateField = form.querySelector(
      '[data-api-input="transaction_end_date"]',
    );

    // Initialize by hiding and disabling form items
    [transDateField, startDateField, endDateField].forEach(function (field) {
      field.closest(".form__item").style.display = "none";
      field.removeAttribute("required");
    });

    // Add event listener to the frequency field
    freqField.addEventListener("change", function () {
      var selectedFreq = freqField.value;

      // Logic for showing/hiding form items based on selected frequency
      if (selectedFreq === "one-time") {
        transDateField.closest(".form__item").style.display = "block";
        transDateField.setAttribute("required", "");
        startDateField.closest(".form__item").style.display = "none";
        startDateField.removeAttribute("required");
        endDateField.closest(".form__item").style.display = "none";
        endDateField.removeAttribute("required");
      } else if (selectedFreq === "recurring") {
        transDateField.closest(".form__item").style.display = "none";
        transDateField.removeAttribute("required");
        startDateField.closest(".form__item").style.display = "block";
        startDateField.setAttribute("required", "");
        endDateField.closest(".form__item").style.display = "block";
        endDateField.setAttribute("required", "");
      }
    });
  });

  // load property transactions
  $("#property").click(function () {
    loadPropertyTransactions();
  });

  // 'Transactions' Tab clicked - Profile
  $("[api-button='user-transactions']").click(function () {
    $("[data-api-input='recipient']").val("tenant");
    $("[dynamic-element='recipient']").hide();
    $("[api-button='all-user-transactions']").click();
  });

  // 'Transactions' Tab clicked - Unit
  $("[api-button='unit-transactions']").click(function () {
    $("[api-button='all-user-transactions']").click();
    $("[data-api-input='recipient']").val("");
    $("[dynamic-element='recipient']").show();
  });

  // 'Past Transactions' Tab clicked
  $("[api-button='all-user-transactions']").click(function () {
    if (localStorage.pageId === "profile") {
      loadUserTransactions("profile", "all");
    } else if (localStorage.pageId === "unit") {
      loadUserTransactions("active-tenant", "all");
    }
  });

  // 'Recurring Transactions' Tab clicked
  $("[api-button='recurring-user-transactions']").click(function () {
    if (localStorage.pageId === "profile") {
      loadUserTransactions("profile", "recurring");
    } else if (localStorage.pageId === "unit") {
      loadUserTransactions("active-tenant", "recurring");
    }
  });

  // Create Transaction
  // Create Transaction - Bind individually to each user-transaction form
  $("[api-form='user-transaction']").each(function () {
    const form = $(this);

    form.off("submit").on("submit", function (event) {
      event.preventDefault();

      // Prevent double-clicks
      form.find("button[type='submit']").prop("disabled", true);

      console.log("Submitting transaction for form:", form);

      if (localStorage.pageId === "unit") {
        createUserTransaction("unit", form);
      } else if (localStorage.pageId === "profile") {
        createUserTransaction("profile", form);
      }
    });
  });

  // 'past trans' tab button clicked (Property Transactions)
  $("[api-button='all-prop-trans']").click(function () {
    loadPropertyTransactions("all");
  });

  // 'recurring trans' tab button clicked (Property Transactions)
  $("[api-button='recurring-prop-trans']").click(function () {
    loadPropertyTransactions("recurring");
  });

  $("[modal='property-transaction']").click(function () {
    $("[api-button='all-prop-trans']").click();
  });

  /* ----- Tenant Makes Payment ----*/

  // Validate payment form so that tenant cannot make payment greater than $6000
  $(document).ready(function() {
    $('#rent-trans-amount').on('input', function() {
      var inputValue = parseFloat($(this).val());
      if (inputValue > 30000) {
        $('.payment-validator-message').show();
        $('#payment-init-button').addClass('button-inactive');
      } else {
        $('.payment-validator-message').hide();
        $('#payment-init-button').removeClass('button-inactive');
      }
    });
  });

  $("#pay-rent-form")
    .off("submit")
    .submit(function (event) {
      event.preventDefault(); // Corrected typo here
      amount = parseFloat($("#rent-trans-amount").val());
      let formattedAmount = amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      $("[data-transaction=payment-amount]").text("$" + formattedAmount);
    });
  $("#confirm-payment-button")
    .off("click")
    .click(function () {
      tenantMakesPayment(amount);
    });
});

function createPropertyTransaction() {
  /* Api Call on Form Submission */

  $("#property-transaction-form")
    .off("submit")
    .submit(function (event) {
      // Prevent the default form submission behavior
      event.preventDefault();

      // Handle 'Loading' State
      $(".modal__block").hide();
      $(".loader").css("display", "flex");

      const formData = {};

      // Iterate through form inputs with data-api-input attribute and collect key-value pairs
      $(this)
        .find("[data-api-input]")
        .each(function () {
          const input = $(this);
          const key = input.data("api-input"); // Get the data attribute value
          const value = input.val();
          formData[key] = value;
        });

      // Add additional data to formData
      formData["property_id"] = localStorage.propertyRecId;

      // Make an AJAX POST request
      $.ajax({
        url: localStorage.baseUrl + "api:rpDXPv3x/create_property_transaction",
        type: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.authToken,
        },
        data: JSON.stringify(formData), // Convert formData to JSON
        contentType: "application/json", // Set the content type to JSON
        success: function (response) {
          alert("Success! Property Transaction Created.");
          $(".loader").hide();
          const urlParams = new URLSearchParams(window.location.search);
          let property_id = urlParams.get("id");
          loadProperty(property_id);
          $("#property-transaction-form")[0].reset();
        },
        complete: function () {
          $("[api-button='all-prop-trans']").click();
        },
      });
    });
}

function loadPropertyTransactions(type) {
  $(".pocket-loader").css("display", "flex");

  if (type === "recurring") {
    var propTransContainer = $("#recurring-prop-trans-container");
  } else {
    var propTransContainer = $("#prop-trans-container");
  }

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/get_property_transactions", // Use the provided endpoint URL
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    dataType: "json",
    data: {
      property_id: localStorage.propertyRecId,
      type: type,
    },

    success: function (response) {
      var sampleItem = $(".prop-trans-sample-wrapper").find(
        '[data-dyn-item="prop-trans"]',
      );
      propTransContainer.empty();

      response.forEach((propTrans) => {
        let propTransItem = $(sampleItem).clone().appendTo(propTransContainer);

        propTransItem.attr("id", propTrans.transaction_id);

        // bind data
        propTransItem
          .find("[data-prop-trans='description']")
          .text(propTrans.description);
        propTransItem
          .find("[data-prop-trans='created-at']")
          .text(formatDateNoTime(propTrans.created_at));
        propTransItem
          .find("[data-prop-trans='recipient']")
          .text(propTrans.recipient_type);
        propTransItem.find("[data-prop-trans='type']").text(propTrans.type);

        // format transaction date
        if (propTrans.frequency === "recurring") {
          propTransItem
            .find("[data-prop-trans='created-at']")
            .text(
              formatDateNoTime(propTrans.transaction_start_date) +
                " " +
                "-" +
                " " +
                formatDateNoTime(propTrans.transaction_end_date),
            );
          // click handler for delete button
          propTransItem
            .find(".transactions-log__bttn.delete")
            .off("click")
            .click(function () {
              transactionToDelete = propTransItem.attr("id");
            });
        } else {
          propTransItem
            .find("[data-prop-trans='created-at']")
            .text(formatDateNoTime(propTrans.transaction_date));
        }

        // format amount
        if (propTrans.type === "credit") {
          propTransItem
            .find("[data-prop-trans='amount']")
            .text("-" + "$" + propTrans.amount);
        } else {
          propTransItem
            .find("[data-prop-trans='amount']")
            .text("$" + propTrans.amount);
        }

        // click handler for 'edit transaction' button
        propTransItem
          .find("[api-button=edit-prop-trans]")
          .off("click")
          .click(function () {
            updatePropertyTransaction(
              propTransItem.attr("id"),
              propTrans.frequency,
              "property",
            );
          });
      });
    },
    complete: function () {
      $(".pocket-loader").hide();
      /* Delete Recurring Transaction Func */
      $("#delete-transaction-button")
        .off("click")
        .click(function () {
          deleteRecurringTransaction(transactionToDelete, "property");
        });
    },
    error: function (error) {
      // Handle errors here
    },
  });
}

function updatePropertyTransaction(transId, transFreq) {
  var responseData; // Variable to store response data

  $(".loader").css("display", "flex");
  $(".modal__block").show().children().hide();
  $("#edit-prop-trans").show();

  /* update form depending on the transaction frequency type */
  if (transFreq === "one-time") {
    $("#edit-prop-trans-type").closest(".form__item").hide();
    $("#edit-prop-trans-type").removeAttr("required");
    $("#edit-prop-trans-recipient").closest(".form__item").hide();
    $("#edit-prop-trans-recipient").removeAttr("required");
    $("#edit-prop-trans-start-date").closest(".form__item").hide();
    $("#edit-prop-trans-start-date").removeAttr("required");
    $("#edit-prop-trans-end-date").closest(".form__item").hide();
    $("#edit-prop-trans-end-date").removeAttr("required");
    $("#edit-prop-trans-amount").closest(".form__item").hide();
    $("#edit-prop-trans-amount").removeAttr("required");
  } else {
    $("#edit-prop-trans-type").closest(".form__item").show();
    $("#edit-prop-trans-type").attr("required", "required");
    $("#edit-prop-trans-recipient").closest(".form__item").show();
    $("#edit-prop-trans-recipient").attr("required", "required");
    $("#edit-prop-trans-start-date").closest(".form__item").show();
    $("#edit-prop-trans-start-date").attr("required", "required");
    $("#edit-prop-trans-end-date").closest(".form__item").show();
    $("#edit-prop-trans-end-date").attr("required", "required");
    $("#edit-prop-trans-amount").closest(".form__item").show();
    $("#edit-prop-trans-amount").attr("required", "required");
  }

  /* Load Selected Property Transaction */
  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/get_single_property_transaction",
    type: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      transaction_id: transId,
      frequency: transFreq,
    },
    success: function (response) {
      responseData = response;

      /*  Pre Populate Form Fields */
      $("[data-api-input=description]").val(response.description);
      $("[data-api-input=type]").val(response.type);
      $("[data-api-input=recipient]").val(response.recipient_type);
      $("[data-api-input=frequency]").val(response.frequency);
      $("[data-api-input=transaction_date]").val(response.transaction_date);
      $("[data-api-input=transaction_start_date]").val(
        response.transaction_start_date,
      );
      $("[data-api-input=transaction_end_date]").val(
        response.transaction_end_date,
      );
      $("[data-api-input=amount]").val(response.amount);
    },
    complete: function (response) {
      $(".loader").hide();
    },
  });

  /* Handle Form Submission to Update Transaction */
  $("#edit-prop-trans-form")
    .off("submit")
    .submit(function (event) {
      // Prevent the default form submission behavior
      event.preventDefault();

      // Handle 'Loading' State
      $(".modal__block").hide();
      $(".loader").css("display", "flex");

      const formData = {};

      // Iterate through form inputs with data-api-input attribute and collect key-value pairs
      $(this)
        .find("[data-api-input]")
        .each(function () {
          const input = $(this);
          const key = input.data("api-input"); // Get the data attribute value
          const value = input.val();
          formData[key] = value;
        });

      // Add additional data to formData
      formData["property_id"] = localStorage.propertyRecId;
      formData["transaction_id"] = transId;

      // Make an AJAX POST request
      $.ajax({
        url: localStorage.baseUrl + "api:rpDXPv3x/update_property_transaction",
        type: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.authToken,
        },
        data: JSON.stringify(formData), // Convert formData to JSON
        contentType: "application/json", // Set the content type to JSON
        success: function (response) {
          alert("Success! Property Transaction Updated.");
          $(".loader").hide();
          loadProperty();
          $("#property-transaction-form")[0].reset();
        },
        complete: function () {
          $("[api-button='all-prop-trans']").click();
        },
      });
    });
}

function createUserTransaction(view, form) {
  const urlParams = new URLSearchParams(window.location.search);
  let target = urlParams.get("id");

  // Handle 'Loading' State
  $(".modal__block").hide();
  $(".loader").css("display", "flex");

  const formData = {};

  // Iterate through form inputs with data-api-input attribute and collect key-value pairs
  let transactionType = null;
  let amountInput = null;

  $(form)
    .find("[data-api-input]")
    .each(function () {
      const input = $(this);
      const key = input.data("api-input");
      let value = input.val();

      // Store the transaction type and amount input for later use
      if (key === "type") {
        transactionType = value;
      }
      if (key === "amount") {
        amountInput = input;
      }

      formData[key] = value;
    });

  // Modify the amount if the transaction type is 'credit' or 'payment'
  if (
    (transactionType === "credit" || transactionType === "payment") &&
    amountInput
  ) {
    let amount = parseFloat(amountInput.val());
    if (amount > 0) {
      amount = -amount;
      formData["amount"] = amount.toString(); // Update the formData with the modified amount
    }
  }

  // Add additional data to formData
  formData["view"] = view;
  formData["target"] = target;

  // Make an AJAX POST request
  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/create_user_transaction_updated",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: JSON.stringify(formData), // Convert formData to JSON
    contentType: "application/json", // Set the content type to JSON
    success: function (response) {
      alert("Success! Unit Transaction Created.");
      $(".loader").hide();
      form[0].reset();
    },
    complete: function () {
      // re-populate form fields and trigger additional actions
      $("[data-api-input='recipient']").val("");
      // Ensure "Transaction Date" is hidden initially
      $("#unit-trans-date").closest(".form__item").hide();
      $("#unit-trans-start-date").closest(".form__item").hide();
      $("#unit-trans-end-date").closest(".form__item").hide();

      // Determine view and set recipient correctly
      let recipientFieldWrapper = $("[dynamic-element='recipient']");
      let recipientField = $("[data-api-input='recipient']");

      if (localStorage.pageId === "profile") {
          recipientField.val("tenant"); // Default to tenant in profile view
          recipientFieldWrapper.hide(); // Hide recipient in profile view
      } else if (localStorage.pageId === "unit") {
          recipientField.val(""); // Keep recipient blank in unit view
          recipientFieldWrapper.show(); // Show recipient field in unit view
      }     
      
      $("[api-button='all-user-transactions']").click();
      
    },
  });
}

function loadUserTransactions(view, type) {
  const urlParams = new URLSearchParams(window.location.search);
  let target = urlParams.get("id");

  $(".pocket-loader").css("display", "flex");
  var userTransContainer = $(".dyn-container__transactions");

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/load_transactions_component",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    dataType: "json",
    data: {
      target: target,
      view: view,
      type: type,
    },

    success: function (response) {
      var sampleItem = $(".prop-trans-sample-wrapper").find(
        '[data-dyn-item="prop-trans"]',
      );
      userTransContainer.empty();

      response.forEach((userTrans) => {
        let userTransItem = $(sampleItem).clone().appendTo(userTransContainer);

        userTransItem.attr("id", userTrans.transaction_id);

        // bind data
        userTransItem
          .find("[data-prop-trans='description']")
          .text(userTrans.description);
        userTransItem
          .find("[data-prop-trans='created-at']")
          .text(formatDateNoTime(userTrans.created_at));
        userTransItem
          .find("[data-prop-trans='recipient']")
          .text(userTrans.recipient_type);
        userTransItem.find("[data-prop-trans='type']").text(userTrans.type);

        if (type === "recurring") {
          // update date
          userTransItem
            .find("[data-prop-trans='created-at']")
            .text(
              formatDateNoTime(userTrans.transaction_start_date) +
                " " +
                "-" +
                " " +
                formatDateNoTime(userTrans.transaction_end_date),
            );
          // click handler for 'edit transaction' button
          userTransItem
            .find("[api-button=edit-prop-trans]")
            .off("click")
            .click(function () {
              updateUserTransaction(userTransItem.attr("id"), "recurring");
            });
          // click handler for delete button
          userTransItem
            .find(".transactions-log__bttn.delete")
            .off("click")
            .click(function () {
              transactionToDelete = userTransItem.attr("id");
            });
        } else {
          // update date
          userTransItem
            .find("[data-prop-trans='created-at']")
            .text(formatDateNoTime(userTrans.transaction_date));
          // click handler for 'edit transaction' button
          userTransItem
            .find("[api-button=edit-prop-trans]")
            .off("click")
            .click(function () {
              updateUserTransaction(userTransItem.attr("id"), "one-time");
            });
          // remove delete button
          userTransItem.find(".transactions-log__bttn.delete").remove();
        }

        // Format amount
        if (userTrans.type === "credit") {
          userTransItem
            .find("[data-prop-trans='amount']")
            .text("-" + "$" + userTrans.amount);
        } else {
          userTransItem
            .find("[data-prop-trans='amount']")
            .text("$" + userTrans.amount);
        }
      });
    },
    complete: function () {
      $(".pocket-loader").hide();
      /* Delete Recurring Transaction Func */
      $("#delete-transaction-button")
        .off("click")
        .click(function () {
          deleteRecurringTransaction(transactionToDelete, "user");
        });
    },
    error: function (error) {
      // Handle errors here
    },
  });
}

function updateUserTransaction(transId, transFreq) {
  var responseData; // Variable to store response data

  $(".loader").css("display", "flex");
  $(".modal__block").show().children().hide();
  $("#edit-prop-trans").show();

  /* update form depending on the transaction frequency type */
  if (transFreq === "one-time") {
    $("#edit-prop-trans-type").closest(".form__item").hide();
    $("#edit-prop-trans-type").removeAttr("required");
    $("#edit-prop-trans-recipient").closest(".form__item").hide();
    $("#edit-prop-trans-recipient").removeAttr("required");
    $("#edit-prop-trans-start-date").closest(".form__item").hide();
    $("#edit-prop-trans-start-date").removeAttr("required");
    $("#edit-prop-trans-end-date").closest(".form__item").hide();
    $("#edit-prop-trans-end-date").removeAttr("required");
    $("#edit-prop-trans-amount").closest(".form__item").hide();
    $("#edit-prop-trans-amount").removeAttr("required");
  } else {
    $("#edit-prop-trans-type").closest(".form__item").show();
    $("#edit-prop-trans-type").attr("required", "required");
    $("#edit-prop-trans-recipient").closest(".form__item").hide();
    $("#edit-prop-trans-recipient").removeAttr("required");
    $("#edit-prop-trans-start-date").closest(".form__item").show();
    $("#edit-prop-trans-start-date").attr("required", "required");
    $("#edit-prop-trans-end-date").closest(".form__item").show();
    $("#edit-prop-trans-end-date").attr("required", "required");
    $("#edit-prop-trans-amount").closest(".form__item").show();
    $("#edit-prop-trans-amount").attr("required", "required");
  }

  /* Load Selected Property Transaction */
  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/get_single_user_transaction",
    type: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      transaction_id: transId,
      frequency: transFreq,
    },
    success: function (response) {
      responseData = response;

      /*  Pre Populate Form Fields */
      $("[data-api-input=description]").val(response.description);
      $("[data-api-input=type]").val(response.type);
      $("[data-api-input=recipient]").val(response.recipient_type);
      $("[data-api-input=frequency]").val(response.frequency);
      $("[data-api-input=transaction_date]").val(response.transaction_date);
      $("[data-api-input=transaction_start_date]").val(
        response.transaction_start_date,
      );
      $("[data-api-input=transaction_end_date]").val(
        response.transaction_end_date,
      );
      $("[data-api-input=amount]").val(response.amount);
    },
    complete: function (response) {
      $(".loader").hide();
    },
  });

  /* Handle Form Submission to Update Transaction */
  $("#edit-prop-trans-form")
    .off("submit")
    .submit(function (event) {
      // Prevent the default form submission behavior
      event.preventDefault();

      // Handle 'Loading' State
      $(".modal__block").hide();
      $(".loader").css("display", "flex");

      const formData = {};

      // Iterate through form inputs with data-api-input attribute and collect key-value pairs
      $(this)
        .find("[data-api-input]")
        .each(function () {
          const input = $(this);
          const key = input.data("api-input"); // Get the data attribute value
          const value = input.val();
          formData[key] = value;
        });

      // Add additional data to formData
      formData["transaction_id"] = transId;
      formData["frequency"] = transFreq;

      // Make an AJAX POST request
      $.ajax({
        url: localStorage.baseUrl + "api:rpDXPv3x/update_user_transaction",
        type: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.authToken,
        },
        data: JSON.stringify(formData), // Convert formData to JSON
        contentType: "application/json", // Set the content type to JSON
        success: function (response) {
          alert("Success! Property Transaction Updated.");
          $(".loader").hide();
          //loadProperty();
          $("#property-transaction-form")[0].reset();
        },
        complete: function () {
          $("[api-button='all-user-transactions']").click();
        },
      });
    });
}

function deleteRecurringTransaction(transId, type) {
  $(".loader").css("display", "flex");
  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/delete_recurring_transaction",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      transaction_id: transId,
      type: type,
    },
    success: function (response) {},
    complete: function () {
      $(".modal__block").hide();
      alert("Success! Transaction Deleted");

      // reload transactions
      if (localStorage.pageId === "profile") {
        loadUserTransactions("profile", "recurring");
      } else if (localStorage.pageId === "unit") {
        loadUserTransactions("active-tanant", "recurring");
      } else if (localStorage.pageId === "property") {
        $("[api-button='all-prop-trans']").click();
      }

      $(".loader").hide();
    },
    error: function (error) {},
  });
}

function tenantMakesPayment(amount) {

  $(".loader").css("display", "flex");
  $.ajax({
    url: localStorage.baseUrl + "api:S5JmTHue/charge_created",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      amount: amount,
    },
    success: function (response) {
      $(".modal__block").hide();
      alert(
        "Success! Payment Initiated. (Payments can take up to 3-6 business days to clear)",
      );
    },
    complete: function () {
      $(".loader").hide();
      $("#pay-rent-form")[0].reset();
      fetchTransactions("tenant-user-ledger", localStorage.userId);
    },
    error: function (error) {},
  });
}

function loadOutstandingTransactions() {

  $('.loader').css('display','flex'); //show loader

  const $container = $(".pay-rent__container");
  const $payButton = $(".intake-form__submit-bttn.payment");

  $.ajax({
    url:  localStorage.baseUrl + "api:rpDXPv3x/fetch_outstanding_transactions",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    success: function (data) {
      $container.empty(); // Clear previous content

      if (!data.length) {
        $container.append('<p class="no-charges-message">You currently have no outstanding charges.</p>');
        $payButton.addClass("inactive").find("[data-property='user-counter']").text("0");
        return;
      }

      data.forEach((item) => {
        const $item = $(`
          <div class="payment__transaction-item" id="${item.transaction_id}">
            <div class="payment-trans__cell">
              <div class="payment__trans-header">Description</div>
              <div data-api="description" class="system-text__small">${item.description || "N/A"}</div>
            </div>
            <div class="payment-trans__cell">
              <div class="payment__trans-header">Due Date</div>
              <div data-api="due_date" class="system-text__small">${
                item.due_date ? formatDateNoTime(item.due_date) : "—"
              }</div>
            </div>
            <div class="payment-trans__cell">
              <div class="payment__trans-header">Total Amount</div>
              <div data-api="amount" class="system-text__small">$${item.amount.toFixed(2)}</div>
            </div>
            <div class="payment-trans__cell">
              <div class="payment__trans-header">Remaining Balance</div>
              <div data-api="remaining_transaction_balance" class="system-text__small">$${item.remaining_transaction_balance.toFixed(2)}</div>
            </div>
          </div>
        `);

        $container.append($item);
      });
    },
    complete: function () {
      $('.loader').hide(); // hide laoder
    },
    error: function () {
      $('.loader').hide(); // hide laoder
      $container.html('<p class="error-message">Something went wrong. Please try again later.</p>');
    }
  });

  // Bind transaction item click for selection
  $(document).off("click", ".payment__transaction-item").on("click", ".payment__transaction-item", function () {
    $(this).toggleClass("selected");

    const $selectedItems = $(".payment__transaction-item.selected");
    const count = $selectedItems.length;

    if (count > 0) {
      let total = 0;
      $selectedItems.each(function () {
        const amountText = $(this).find('[data-api="remaining_transaction_balance"]').text().replace(/[^0-9.]/g, '');
        const amount = parseFloat(amountText) || 0;
        total += amount;
      });
    
      const formattedTotal = `$${total.toFixed(2)}`;
      const label = `Pay ${count} Charge${count > 1 ? "s" : ""} (${formattedTotal})`;
    
      $payButton.removeClass("inactive");
      $payButton.html(`<div class="dynamic-delete-bttn-text">${label}</div>`);
    } else {
      $payButton.addClass("inactive");
      $payButton.html(`<div class="dynamic-delete-bttn-text">Charge</div>`);
    }
  });
}