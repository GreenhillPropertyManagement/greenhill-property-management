let transactionToDelete;
let amount;

document.addEventListener("DOMContentLoaded", function () {

  /* Load Outstanding Transactions Func (Tenant Screen)  */
  $(document).on("click", '[data-api="launch-trans-default"]', function (e) {
    e.preventDefault();
    $("[data-api='load-transactions']").click();
    loadOutstandingTransactions(); // fetch transactions 
  });


  /* Click handler for dynamically loaded transactions */
  $(document)
  .off("click", ".trans-item-updated")
  .on("click", ".trans-item-updated", function () {
    const transactionId = $(this).attr("id");
    const frequency = $(this).data("frequency") || "one_time";
    updateUserTransaction(transactionId, frequency);
  });

  // Click handler for dynamically loaded property transactions
  $(document)
  .off("click", ".trans-item-updated.prop-trans")
  .on("click", ".trans-item-updated.prop-trans", function (e) {
    e.stopPropagation(); // prevent bubbling to user handler
    const transactionId = $(this).attr("id");
    const frequency = $(this).data("frequency") || "one_time";
    updatePropertyTransaction(transactionId, frequency);
  });



  /* Initiate pay transactions on button click */
  $(document).on("click", '[data-api-button="pay-transactions"]', function (e) {
    e.preventDefault();
    paySelectedTransactions();
  });

  /* load balance on button click */
  $(document).on("click", '[data-api-button="general-balance-payment"]', function (e) {
    e.preventDefault();
    loadBalance();
  });

  /* Make general balance payment */
  $(document).on("click", '[api-button="general-balance-payment"]', function (e) {
    e.preventDefault();
    makeGeneralBalancePayment();
  });

  /* Run form ui when modal opens */
  $('[modal="create-transaction"]').on("click", function () {
    const form = document.querySelector('form[api-form="user-transaction"]');
    if (form && !form.dataset.initialized) {
      initTransactionFormUX(form);
      form.dataset.initialized = "true";
    }
  });

  createPropertyTransaction(); // init property transaction creation
  loadTransactionCodesInForm(); // load transaction codes in the transaciton form


  // load property transactions
  $("#property").click(function () {
    loadPropertyTransactions();
  });

  // 'Transactions' Tab clicked - Profile
  $("[api-button='user-transactions']")
  .off("click")
  .on("click", function () {
    $("[data-api-input='recipient']").val("tenant");
    $("[dynamic-element='recipient']").hide();
    loadUserTransactions("profile", "all");
  });

$("[api-button='unit-transactions']")
  .off("click")
  .on("click", function () {
    $("[data-api-input='recipient']").val("");
    $("[dynamic-element='recipient']").show();
    loadUserTransactions("active-tenant", "all");
  });
  // 'Recurring Transactions' Tab clicked
  $("[api-button='recurring-user-transactions']")
  .off("click")
  .on("click", function () {
    if (localStorage.pageId === "profile") {
      loadUserTransactions("profile", "recurring");
    } else if (localStorage.pageId === "unit") {
      loadUserTransactions("active-tenant", "recurring");
    }
  });


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
          
          $(".loader").hide();
          showToast("Success! Property Transaction Created.");
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

  const containerId = type === "recurring" ? "#recurring-prop-trans-container" : "#prop-trans-container";
  const $container = $(containerId);
  $container.empty();

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/get_property_transactions",
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
      const mode = response.mode;
      const transactions = response.transactions;

      
      if (!transactions.length) { // if there are no transactions...
        showEmptyState($(".dyn-container__transactions:visible"));
        return;
      }

      transactions.forEach((item) => {
        const id = item.id;
        const description = item.description || "";
        const amount = `$${item.amount}`;
        const frequency = mode;

        const startOrDue = mode === "recurring"
          ? formatDateNoTime(item.transaction_start_date)
          : formatDateNoTime(item.transaction_date);

        const endOrAmount = mode === "recurring"
          ? formatDateNoTime(item.transaction_end_date)
          : amount;

        const finalValue = mode === "recurring"
          ? amount
          : `$${item.remaining_transaction_balance || 0}`;

        const html = `
          <div class="trans-item-updated wf-grid prop-trans" id="${id}" data-frequency="${frequency}" style="cursor: pointer;">
            <div class="trans-item__cell">
              <div class="trans-item__cell-header">Description</div>
              <div class="trans-item__cell-data" data-api="description">${description}</div>
            </div>

            <div class="trans-item__cell">
              <div class="trans-item__cell-header">${mode === "recurring" ? "Start Date" : "Due Date"}</div>
              <div class="trans-item__cell-data" data-api="start_or_due">${startOrDue}</div>
            </div>

            <div class="trans-item__cell">
              <div class="trans-item__cell-header">${mode === "recurring" ? "End Date" : "Charge Amount"}</div>
              <div class="trans-item__cell-data" data-api="end_or_amount">${endOrAmount}</div>
            </div>

            <div class="trans-item__cell last">
              <div class="trans-item__cell-header">${mode === "recurring" ? "Charge Amount" : "Remaining Transaction Balance"}</div>
              <div class="trans-item__cell-data" data-api="final_value">${finalValue}</div>
            </div>
          </div>
        `;

        const $html = $(html);

        // Conditionally bind click if editPermissions is true
        if (localStorage.getItem("editPermissions") === "true") {
          $html.css({
            cursor: "pointer",
            "pointer-events": "auto"
          });

          $html.off("click").on("click", function () {
            updatePropertyTransaction(id, frequency); // or whatever your handler is
          });

        } else {
          $html.css({
            cursor: "default",
            "pointer-events": "none"
          });
        }

        $container.append($html);
      });
    },
    complete: function () {
      $(".pocket-loader").hide();
    },
    error: function (error) {
      console.error("Error loading property transactions:", error);
    }
  });
}

function updatePropertyTransaction(transId, transFreq) {

  var responseData; // Variable to store response data

  $("#delete-trans-button").hide(); // always hide first

  if (transFreq === "recurring") {
    $("#delete-trans-button").show().off("click").on("click", function () {
      const isProperty = localStorage.pageId === "property";
      deleteRecurringTransaction(transId, isProperty ? "property" : "user");
    });
  }

  $(".loader").css("display", "flex");
  $(".modal__block").show().children().hide();
  $("#edit-transaction").show();

  const $form = $('form[api-form="update-transaction"]');
  const $actionSelect = $form.find('[data-api-input="action"]');
  const $amountWrapper = $form.find('#edit-transaction-amount').closest('.form__item');
  const $descWrapper = $form.find('#edit-transaction-action-description').closest('.form__item');
  const $dateWrapper = $form.find('#edit-transaction-action-date').closest('.form__item');

  // Initial hide
  $amountWrapper.hide();
  $descWrapper.hide();
  $dateWrapper.hide();

  // Bind action dropdown logic
  $actionSelect.off("change").on("change", function () {
    const selected = $(this).val();
    if (["charge", "payment", "credit"].includes(selected)) {
      $amountWrapper.show();
      $descWrapper.show();
      $dateWrapper.show();
    } else {
      $amountWrapper.find('[data-api-input]').val('');
      $amountWrapper.hide();
      
      $descWrapper.find('[data-api-input]').val('');
      $descWrapper.hide();
      
      $dateWrapper.find('[data-api-input]').val('');
      $dateWrapper.hide();
    }
  });

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
          showToast("Success! Property Transaction Updated.");
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
      
      $(".loader").hide();
      showToast("Success! Unit Transaction Created.");
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
  const userTransContainer = $(".dyn-container__transactions");
  userTransContainer.empty(); // clear existing transactions

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

      const mode = response.mode;
      const transactions = response.transactions;

      if (!transactions.length) { // if there are no transactions...
        showEmptyState($(".dyn-container__transactions:visible"));
        return;
      }

      transactions.forEach((userTrans) => {
        const transactionId = userTrans.id;
        const description = userTrans.description || "";
        const frequency = mode; // "recurring" or "one_time"

        const label2 = mode === "recurring" ? "Start Date" : "Due Date";
        const label3 = mode === "recurring" ? "End Date" : "Charge Amount";
        const label4 = mode === "recurring" ? "Charge Amount" : "Remaining Transaction Balance";

        const value2 = mode === "recurring"
          ? formatDateNoTime(userTrans.transaction_start_date)
          : formatDateNoTime(userTrans.due_date || userTrans.transaction_date);

        const value3 = mode === "recurring"
          ? formatDateNoTime(userTrans.transaction_end_date)
          : `$${userTrans.amount}`;

        const value4 = mode === "recurring"
          ? `$${userTrans.amount}`
          : `$${userTrans.remaining_transaction_balance || 0}`;

        // Conditionally render Billing Period cell only for one-time transactions
        const billingPeriodCell = mode !== "recurring" ? `
          <div class="trans-item__cell">
            <div class="trans-item__cell-header">Billing Period</div>
            <div class="trans-item__cell-data" data-api="transaction_date">
              ${formatDateNoTime(userTrans.transaction_date)}
            </div>
          </div>
        ` : "";

        const html = `
          <div class="trans-item-updated wf-grid" 
              id="${transactionId}" 
              data-frequency="${frequency}" 
              style="cursor: pointer;">
            <div class="trans-item__cell">
              <div class="trans-item__cell-header">Description</div>
              <div class="trans-item__cell-data" data-api="description">${description}</div>
            </div>

            ${billingPeriodCell}

            <div class="trans-item__cell">
              <div class="trans-item__cell-header">${label2}</div>
              <div class="trans-item__cell-data" data-api="start_or_due">${value2}</div>
            </div>

            <div class="trans-item__cell">
              <div class="trans-item__cell-header">${label3}</div>
              <div class="trans-item__cell-data" data-api="end_or_amount">${value3}</div>
            </div>

            <div class="trans-item__cell last">
              <div class="trans-item__cell-header">${label4}</div>
              <div class="trans-item__cell-data" data-api="final_value">${value4}</div>
            </div>
          </div>
        `;

        const $html = $(html);

        // If user has edit permissions, enable interaction
        if (localStorage.getItem("editPermissions") === "true") {
          $html.css("cursor", "pointer");
          $html.css("pointer-events", "auto");
          $html.off("click").on("click", function () {
            updateUserTransaction(transactionId, frequency);
          });
        } else {
          // Fully disable interaction
          $html.css("cursor", "default");
          $html.css("pointer-events", "none");
        }

        $(".dyn-container__transactions:visible").append($html);
      });
    },

    complete: function () {
      $(".pocket-loader").hide();
    },

    error: function (error) {
      console.error("Failed to load transactions:", error);
    },
  });
}

function updateUserTransaction(transId, transFreq) {
  var responseData;

  $("#delete-trans-button").hide(); // always hide first

  if (transFreq === "recurring") {
    $("#delete-trans-button").show().off("click").on("click", function () {
      const isProperty = localStorage.pageId === "property";
      deleteRecurringTransaction(transId, isProperty ? "property" : "user");
    });
  }

  $(".loader").css("display", "flex");
  $(".modal__block").show().children().hide();
  $("#edit-transaction").show();

  const $form = $('form[api-form="update-transaction"]');
  $form[0].reset();
  $form.find('.form__item').show();
  $form.find('[data-api-input]').val('').removeAttr('required');

  // one-time fields
  const $actionAmount = $form.find('#edit-transaction-amount').closest('.form__item');
  const $actionDescription = $form.find('#edit-transaction-action-description').closest('.form__item');
  const $actionDate = $form.find('#edit-transaction-action-date').closest('.form__item');
  const $action = $form.find('#edit-transaction-action').closest('.form__item');
  const $remainingBalancewrapper = $form.find('#edit-remaining-trans-balance').closest('.form__item');
  const $transDateWrapper = $form.find('#edit-transaction-date').closest('.form__item');
  const $dueDateWrapper = $form.find('#edit-transaction-due-date').closest('.form__item');

  // recurring fields
  const $startDateWrapper = $form.find('#edit-transaction-start-date').closest('.form__item');
  const $endDateWrapper = $form.find('#edit-transaction-end-date').closest('.form__item');
  const $transAmountWrapper = $form.find('#edit-trans-amount').closest('.form__item');

  if (transFreq === "one_time") {
    // Show one-time fields
    $remainingBalancewrapper.show();
    $actionDescription.show();
    $actionDate.show();
    $actionAmount.show();
    $action.closest('.form__item').show();

    // Hide recurring
    [$startDateWrapper, $endDateWrapper, $transAmountWrapper].forEach($el => {
      $el.hide();
      $el.find('[data-api-input]').val('').removeAttr('required');
    });

    // Dropdown change logic
    $('#edit-transaction-action').off('change').on('change', function () {
      const selectedValue = $(this).val();
      if (["charge", "payment", "credit"].includes(selectedValue)) {
        $actionAmount.show();
        $actionDescription.show();
        $actionDate.show();
      } else {
        $actionAmount.hide();
        $actionDescription.hide();
        $actionDate.hide();
      }
    });

    // Warn if amount exceeds remaining balance
    $form.find('[data-api-input="amount"]').off('input').on('input', function () {
      const action = $('#edit-transaction-action').val();
      if (action !== 'payment' && action !== 'credit') return;

      const enteredAmount = parseFloat($(this).val());
      const remainingBalance = parseFloat($form.find('[data-api-input="remaining_transaction_balance"]').val());

      let $message = $('#amount-limit-warning');
      if ($message.length === 0) {
        $message = $('<div id="amount-limit-warning" class="form__error" style="color: red; font-size: 13px; margin-top: 4px;"></div>');
        $(this).after($message);
      }

      if (!isNaN(enteredAmount) && enteredAmount > remainingBalance) {
        $message.text(`Amount cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`);
      } else {
        $message.text('');
      }
    });

  } else {
    // Show recurring fields
    [$startDateWrapper, $endDateWrapper, $transAmountWrapper].forEach($el => {
      $el.show();
    });

    // Hide one-time fields
    [$remainingBalancewrapper, $transDateWrapper, $dueDateWrapper, $action, $actionAmount, $actionDescription, $actionDate].forEach($el => {
      $el.hide();
      $el.find('[data-api-input]').val('').removeAttr('required');
    });
  }

  // Load existing data
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
      const mode = response.mode;
      const data = response.transaction;

      $form.find('[data-api-input="description"]').val(data.description);

      if (mode === "one_time") {
        $form.find('[data-api-input="remaining_transaction_balance"]').val(data.remaining_transaction_balance);
        $form.find('[data-api-input="transaction_code"]').val(data.code);
        $form.find('[data-api-input="transaction_date"]').val(data.transaction_date);
        $form.find('[data-api-input="due_date"]').val(data.due_date);
        $form.find('[data-api-input="action_description"]').val(data.action_description);
        $form.find('[data-api-input="action_date"]').val(data.action_date);
        $form.find('[data-api-input="action"]').val(data.action).trigger("change");

      } else if (mode === "recurring") {
        $form.find('[data-api-input="transaction_start_date"]').val(data.transaction_start_date);
        $form.find('[data-api-input="transaction_end_date"]').val(data.transaction_end_date);
        $form.find('[data-api-input="transaction_code"]').val(data.transaction_code);
        $form.find('[data-api-input="amount"]').val(data.amount);
      }
    },
    complete: function () {
      $(".loader").hide();
    },
  });

  $form.off("submit").on("submit", function (event) {
    event.preventDefault();
    $(".modal__block").hide();
    $(".loader").css("display", "flex");

    // Enforce amount does not exceed remaining balance
    const actionType = $form.find('[data-api-input="action"]').val();
    const amountVal = parseFloat($form.find('[data-api-input="amount"]').val());
    const remainingBalance = parseFloat($form.find('[data-api-input="remaining_transaction_balance"]').val());

    if (["payment", "credit"].includes(actionType) && amountVal > remainingBalance) {
      $(".loader").hide();
      showToast("Entered amount exceeds remaining balance.");
      return;
    }

    const formData = {};
    $form.find("[data-api-input]").each(function () {
      const input = $(this);
      const key = input.data("api-input");
      const value = input.val();
      formData[key] = value;
    });

    formData["transaction_id"] = transId;
    formData["frequency"] = transFreq;

    $.ajax({
      url: localStorage.baseUrl + "api:rpDXPv3x/update_user_transaction",
      type: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: JSON.stringify(formData),
      contentType: "application/json",
      success: function () {
        $(".loader").hide();
        $("#property-transaction-form")[0].reset();
      },
      complete: function () {
        showToast("Success! Property Transaction Updated.");

        const pageId = localStorage.pageId;
        const isRecurring = $('[api-button="recurring-user-transactions"]').hasClass('w--current');
        const view = pageId === "unit" ? "active-tenant" : "profile";
        const type = isRecurring ? "recurring" : "all";

        loadUserTransactions(view, type);
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
      showToast("Success! Transaction Deleted");

      // reload transactions
      if (localStorage.pageId === "profile") {
        loadUserTransactions("profile", "recurring");
      } else if (localStorage.pageId === "unit") {
        loadUserTransactions("active-tenant", "recurring");
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
      showToast(
        "Success! Payment Initiated. (Payments can take up to 3-6 business days to clear)",
      );
      $(".modal__block").hide();

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


  $('.container-loader').css('display','flex'); // Show loader

  $(".pay-transactions-button")
    .removeClass("active")
    .html(`<div class="dynamic-delete-bttn-text">Select Transaction(s)</div>`);

  const $container = $(".pay-rent__container");
  const $payButton = $(".pay-transactions-button");

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/fetch_outstanding_transactions",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    success: function (data) {
      $container.empty();

      // Track if anything was displayed
      let hasVisibleCharges = false;

      data.forEach((record) => {
        const master = record.master_transaction;
        const pendingPayment = parseFloat(record.pending_payment) || 0;

        if (pendingPayment > 0) return; // ⛔ Skip if there's a pending payment

        hasVisibleCharges = true;

        const $item = $(`
          <div class="payment__transaction-item wf-grid" id="${master.id}">
            <div class="payment-trans__cell">
              <div class="payment__trans-header">Description</div>
              <div data-api="description" class="system-text__small">
                ${master.description || "N/A"}
              </div>
            </div>
            <div class="payment-trans__cell">
              <div class="payment-trans__amount-wrapper">
                <div class="payment__trans-header">Billing Period</div>
                <div data-api="transaction_date" class="system-text__small">
                  ${master.transaction_date ? formatDateNoTime(master.transaction_date) : "—"}
                </div>
              </div>
            </div>
            <div class="payment-trans__cell">
              <div class="payment-trans__amount-wrapper">
                <div class="payment__trans-header">Due Date</div>
                <div data-api="due_date" class="system-text__small">
                  ${master.due_date ? formatDateNoTime(master.due_date) : "—"}
                </div>
              </div>
            </div>
            <div class="payment-trans__cell">
              <div class="payment-trans__amount-wrapper">
                <div class="payment__trans-header">Charge Amount</div>
                <div data-api="amount" class="system-text__small">
                  $${master.amount.toFixed(2)}
                </div>
              </div>
            </div>
            <div class="payment-trans__amount-wrapper">
              <div class="payment__trans-header">Remaining Balance</div>
              <div data-api="remaining_transaction_balance" class="system-text__small">
                $${master.remaining_transaction_balance.toFixed(2)}
              </div>
            </div>
          </div>
        `);

        $container.append($item);
      });

      if (!hasVisibleCharges) { // if all transactions have payments pending....
        $container.append('<p class="no-charges-message" style="text-align: center; margin-top: 1em;">All charges are either paid or pending payment. Transactions and balances will be updated once payments clear.</p>');
        $payButton.addClass("inactive").find("[data-property='user-counter']").text("0");

        $('.no-charges-payment-text').show(); // show the no transactions available text
        $('#general-payment-form').hide(); // hide the payment form
        $('[api-button="general-balance-payment"]').css({ // hide the submit payment button
          display: 'none',
          'pointer-events': 'none'
        });

      } else {

        $('.no-charges-payment-text').hide(); // hide the no transactions avbailble text
        $('#general-payment-form').show(); // show the patyment form
        $('[api-button="general-balance-payment"]').css({ // show the submit payment button
          display: 'flex',
          'pointer-events': 'auto'
        });
      }
    },
    complete: function () {
      $('.container-loader').hide();
    },
    error: function () {
      $('.container-loader').hide();
      $container.html('<p class="error-message">Something went wrong. Please try again later.</p>');
    }
  });

  // Click handler to toggle selection
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

      const formattedTotal = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const label = `Pay ${count} Charge${count > 1 ? "s" : ""} (${formattedTotal})`;

      $payButton.addClass("active").html(`<div class="dynamic-delete-bttn-text">${label}</div>`);
    } else {
      $payButton.removeClass("active").html(`<div class="dynamic-delete-bttn-text">Select Transaction(s)</div>`);
    }
  });
}

function paySelectedTransactions() {

  const $selectedItems = $(".payment__transaction-item.selected");

  const selectedTransactionIds = $selectedItems.map(function () {
    return parseInt($(this).attr("id")); // ensure numeric IDs
  }).get();

  if (selectedTransactionIds.length === 0) {
    alert("Please select at least one transaction to pay.");
    return;
  }

  // Calculate total remaining balance
  let total = 0;
  $selectedItems.each(function () {
    const amountText = $(this).find('[data-api="remaining_transaction_balance"]').text().replace(/[^0-9.]/g, '');
    const amount = parseFloat(amountText) || 0;
    total += amount;
  });

  const formattedTotal = `$${total.toFixed(2)}`;
  const count = selectedTransactionIds.length;
  const confirmMessage = `Pay ${count} transaction${count > 1 ? "s" : ""} (${formattedTotal})?`;

  // Show confirmation
  if (!confirm(confirmMessage)) {
    return; // Exit if user cancels
  }

  $('.loader').css('display', 'flex');

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/pay_selected_transaction",
    method: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
      "Content-Type": "application/json"
    },
    data: JSON.stringify({
      transactions: selectedTransactionIds
    }),
    success: function (response) {

      $('.modal__pay-rent').hide();
      $('.modal__block').hide();
      $('.loader').hide();
      $('#pay-rent').click();
      loadOutstandingTransactions(); // Reload updated list
    },
    error: function (xhr) {
      console.error("Payment error:", xhr.responseText);
      alert("There was an error processing your payment.");
    },
    complete: function () {
      showToast("Your Payment Was Submitted.");
      
    }
  });
}

function loadBalance() {

  $('.container-loader').css('display','flex');

  $.ajax({
    url: localStorage.baseUrl + "api:rpDXPv3x/load_current_balance",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
      "Content-Type": "application/json"
    },
    success: function (response) {
      $('[data=current-balance]').text("$" + parseFloat(response.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      loadOutstandingTransactions(); // Reload updated list
    },
    error: function (xhr) {
      console.error("Payment error:", xhr.responseText);
      alert("There was an error processing your payment.");
    },
    complete: function (response) {
      $('.container-loader').hide();
    }
  });

}

function makeGeneralBalancePayment() {
  $('.loader').css('display','flex');
  const amount = parseFloat($('[data-api-input="general-balance-amount"]').val()) || 0;

  if (amount <= 0) {
    alert("Please enter a valid payment amount.");
    return;
  }

  const formattedAmount = `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  const confirmed = confirm(`Are you sure you want to make a general balance payment of ${formattedAmount}?`);
  if (!confirmed) return;

  $('.container-loader').show(); // Show loader

  $.ajax({
    url: localStorage.baseUrl + "api:S5JmTHue/general_balance_payment",
    method: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
      "Content-Type": "application/json"
    },
    data: JSON.stringify({ amount }),
    success: function (response) {
      loadOutstandingTransactions(); // refresh charges
      $('.modal__block').hide();
      $('#pay-rent').click();
      $('[data-api-input="general-balance-amount"]').val(''); // clear payment amount input 
    },
    error: function (xhr) {
      console.error("Payment error:", xhr.responseText);
      alert("There was an error processing your payment.");
    },
    complete: function () {
      $('.container-loader').hide();
      $('.loader').hide();
      showToast("Payment submitted successfully.");
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

function initTransactionFormUX(form) {

  const freqField = form.querySelector('[data-api-input="frequency"]');
  const typeField = form.querySelector('[data-api-input="type"]');
  const transDateField = form.querySelector('[data-api-input="transaction_date"]');
  const startDateField = form.querySelector('[data-api-input="transaction_start_date"]');
  const endDateField = form.querySelector('[data-api-input="transaction_end_date"]');
  const dueDateField = form.querySelector('[data-api-input="due_date"]');

  // Exit if any of the required fields are missing (prevent errors)
  if (!freqField || !typeField) return;

  // Hide all date fields initially and remove 'required'
  [transDateField, startDateField, endDateField, dueDateField].forEach(function (field) {
    if (field) {
      const wrapper = field.closest(".form__item");
      if (wrapper) wrapper.style.display = "none";
      field.removeAttribute("required");
    }
  });

  // Frequency change logic
  freqField.addEventListener("change", function () {
    const selectedFreq = freqField.value;

    if (selectedFreq === "one-time") {
      if (transDateField) {
        transDateField.closest(".form__item").style.display = "block";
        transDateField.setAttribute("required", "");
      }

      if (dueDateField) {
        if (typeField.value !== "payment" && typeField.value !== "credit") {
          dueDateField.closest(".form__item").style.display = "block";
        } else {
          dueDateField.closest(".form__item").style.display = "none";
          dueDateField.value = "";
        }
      }

      if (startDateField) {
        startDateField.closest(".form__item").style.display = "none";
        startDateField.removeAttribute("required");
      }
      if (endDateField) {
        endDateField.closest(".form__item").style.display = "none";
        endDateField.removeAttribute("required");
      }

    } else if (selectedFreq === "recurring") {
      if (transDateField) {
        transDateField.closest(".form__item").style.display = "none";
        transDateField.removeAttribute("required");
      }

      if (dueDateField) {
        dueDateField.closest(".form__item").style.display = "none";
        dueDateField.value = "";
        dueDateField.removeAttribute("required");
      }

      if (startDateField) {
        startDateField.closest(".form__item").style.display = "block";
        startDateField.setAttribute("required", "");
      }
      if (endDateField) {
        endDateField.closest(".form__item").style.display = "block";
        endDateField.setAttribute("required", "");
      }
    }
  });

  // Transaction type change logic
  typeField.addEventListener("change", function () {
    const selectedType = typeField.value;

    // Due date logic
    if (dueDateField) {
      if (selectedType === "payment" || selectedType === "credit") {
        dueDateField.closest(".form__item").style.display = "none";
        dueDateField.value = "";
        dueDateField.removeAttribute("required");
      } else if (freqField.value === "one-time") {
        dueDateField.closest(".form__item").style.display = "block";
      }
    }

    // Frequency logic based on type
    if (selectedType === "payment" || selectedType === "credit") {
      freqField.value = "one-time";
      Array.from(freqField.options).forEach(option => {
        if (option.value === "recurring") {
          option.disabled = true;
        } else {
          option.disabled = false;
        }
      });
      $(freqField).trigger("change"); // Apply one-time logic
    } else if (selectedType === "charge") {
      Array.from(freqField.options).forEach(option => {
        option.disabled = false;
      });
    }
  });

  // Trigger initial state
  $(freqField).trigger("change");
  $(typeField).trigger("change");
}

function showEmptyState($container) {
  $container.html(`
    <div class="system-text__main" style="text-align: center; margin-top: 2em;">
      There are no transactions to display
    </div>
  `);
}




