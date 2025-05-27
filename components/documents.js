document.addEventListener("DOMContentLoaded", function () {
  /* ---- Upload Document Functionality ----- */
  // Initialize the Uploadcare widget
  var widget = uploadcare.Widget(".document-uploader", {
    imagesOnly: false,
    previewStep: true,
    inputAcceptTypes: ".pdf,.doc,.docx,.xls,.xlsx,.txt,.pages",
  });

  // Define variables to hold the document info
  var documentInfo = {
    type: null,
    uploader: null,
    recipient: null,
    unit: null,
    page: null,
  };

  // Trigger the Uploadcare dialog when the button is clicked
  $("[element=new-doc-button]").on("click", function () {
    if (localStorage.pageId === "documents") {
      documentInfo.type = "private";
      documentInfo.uploader = localStorage.userId;
      documentInfo.recipient = null;
      documentInfo.unit = null;
      documentInfo.page = "documents";
    }

    if (localStorage.pageId === "profile") {
      documentInfo.type = "private";
      documentInfo.uploader = localStorage.userId;
      documentInfo.recipient = localStorage.pageRefreshParam;
      documentInfo.unit = null;
      documentInfo.page = "profile";
    }

    if (localStorage.pageId === "unit") {
      documentInfo.type = "public";
      documentInfo.uploader = localStorage.userId;
      documentInfo.recipient = null;
      documentInfo.unit = localStorage.pageRefreshParam;
      documentInfo.page = "unit";
    }

    // open the widget dialog
    widget.openDialog();
  });

  // Configure the callback when the upload is complete
  widget.onUploadComplete(function (info) {
    // Get the Uploadcare URL of the uploaded file
    var fileUrl = info.cdnUrl;
    var fileName = info.name;

    // Call your function with the required parameters using the documentInfo
    uploadDocument(
      documentInfo.type,
      documentInfo.uploader,
      documentInfo.unit,
      fileUrl,
      fileName,
      documentInfo.recipient,
      documentInfo.page,
    );
  });

  /* ------- Load Documents Fucntionality ------- */

  // Main Documents Tab Clicked
  $("#documents").click(function () {
    loadDocuments(localStorage.userId, "documents");
  });

  // Documents Tab Button Clicked (Profile Page or Units Page)
  $("[api-button='documents']").click(function () {
    if (localStorage.pageId === "profile") {
      loadDocuments(localStorage.pageRefreshParam, "profile");
    } else if (localStorage.pageId === "unit") {
      loadDocuments(localStorage.pageRefreshParam, "unit");
    }
  });

  /* ---- Delete Documents Functionality ----*/
  deleteDocuments();
});

function uploadDocument(
  type,
  uploader,
  unit,
  fileUrl,
  fileName,
  recipient,
  page,
) {
  $(".loader").css("display", "flex");

  // Make API Call
  $.ajax({
    url: localStorage.baseUrl + "api:TywfVEHj/upload_document",
    type: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      uploader: uploader,
      type: type,
      file_url: fileUrl,
      file_name: fileName,
      unit: unit,
      recipient: recipient,
      page: page,
    },
    success: function (response) {
      showToastoast("Document Uploaded Successfully!");
      if (localStorage.pageId === "profile") {
        loadDocuments(localStorage.pageRefreshParam, "profile");
      } else if (localStorage.pageId === "unit") {
        loadDocuments(localStorage.pageRefreshParam, "unit");
      } else if (localStorage.pageId === "documents") {
        loadDocuments(localStorage.userId, "documents");
      }
    },
    complete: function () {
      // Reset the Uploadcare widget
      var widget = uploadcare.Widget(".document-uploader");
      widget.value(null);

      $(".loader").hide();
    },
    error: function (error) {},
  });
}

function loadDocuments(retrieve, page) {
  $(".loader").css("display", "flex");
  var docsContainer = $("[data-dyn-container=documents]");

  $.ajax({
    url: localStorage.baseUrl + "api:TywfVEHj/get_documents", // Use the provided endpoint URL
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    dataType: "json",
    data: {
      retrieve: retrieve,
      page: page,
    },

    success: function (response) {
      var sampleDoc = $(".doc-sample-wrapper").find("[data-dyn-item=document]");
      docsContainer.empty();

      response.forEach((doc) => {
        let docItem = $(sampleDoc).clone().appendTo(docsContainer);

        // show private indicator for private docs
        if (doc.type === "private") {
          docItem.find(".doc-type-indicator").show();
        } else {
          docItem.find(".doc-type-indicator").hide();
        }

        // bind data
        docItem.attr("id", doc.id);
        docItem.find("[data-document='title']").text(doc.file_name);

        $(docItem)
          .find(".documents__click-targets-parent")
          .click(function () {
            window.open(doc.file_url, "_blank"); // open doc
          });
      });
    },
    complete: function () {
      $(".loader").hide();
      documentsFiltering();
    },
    error: function (error) {
      // Handle errors here
    },
  });
}

function documentsFiltering() {
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
  // Query all .documents__component elements
  var documentsComponents = document.querySelectorAll(".documents__component");

  documentsComponents.forEach(function (component, index) {
    // Initialize Isotope on the .dyn-container__maintenance-records element
    var iso = new Isotope(
      component.querySelector(".dyn-container__documents"),
      {
        itemSelector: '[data-dyn-item="document"]',
        layoutMode: "vertical", // This will keep the grid layout intact
        transitionDuration: 0, // disable animation
      },
    );

    // Initialize search functionality
    var searchInput = component.querySelector('[element="search-documents"]');
    if (searchInput) {
      searchInput.addEventListener(
        "input",
        debounce(function () {
          qsRegex = new RegExp(searchInput.value, "gi");
          iso.arrange({
            filter: function () {
              return qsRegex ? this.innerText.match(qsRegex) : true;
            },
          });
        }, 200),
      ); // Adjust debounce delay as needed
    }
  });
}

function deleteDocuments() {
  /* --------- Storing Documents to Delete with Toggle ------- */
  var selectedItems = [];
  var count;

  // Function to update the delete counter display
  function updateDeleteCounter() {
    count = selectedItems.length;
    var $deleteCounter = $(".delete-counter");
    var $deleteButton = $('[element="delete-docs-button"]');

    $deleteCounter.text(count);

    if (count > 0) {
      $deleteCounter.show(); // Show counter if there are selected items
      $deleteButton.css({
        "background-color": "#bb342f",
        color: "white",
        "border-color": "#bb342f",
      });
    } else {
      $deleteCounter.hide(); // Hide counter if there are no selected items
      $deleteButton.css({
        "background-color": "", // Reset to default background color
        color: "", // reset text color
        "border-color": "", // reset border color
      });
    }
  }

  // Initially hide the delete counter
  $(".delete-counter").hide();

  // Click event handler for .doc__toggle-wrapper
  $(".documents__component").on("click", ".doc__toggle-wrapper", function () {
    var $toggle = $(this).find(".doc__select-toggle");
    var $ball = $(this).find(".select-ball");
    var documentId = $(this).closest(".dyn-item__document").attr("id");

    $toggle.toggleClass("selected");
    $ball.toggleClass("selected");

    if ($toggle.hasClass("selected")) {
      // Add ID to array if it's not there already (for safety)
      if (selectedItems.indexOf(documentId) === -1) {
        selectedItems.push(documentId);
      }
    } else {
      // Remove ID from array
      selectedItems = selectedItems.filter(function (id) {
        return id !== documentId;
      });
    }

    // Update the delete counter display
    updateDeleteCounter();
  });

  /* -------- Deleting Documents API -------- */

  // Delete Documents Button Clicked
  $('[element="delete-docs-button"]').click(function () {
    if (count > 0) {
      $(".loader").css("display", "flex"); // show loader

      // Make API Call
      $.ajax({
        url: localStorage.baseUrl + "api:TywfVEHj/delete_documents",
        type: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.authToken,
        },
        data: {
          documents_to_delete: selectedItems,
        },
        success: function (response) {
          alert("Success! Documents Deleted");

          // Resetting items and UI after successful deletion
          $(".doc__select-toggle.selected").removeClass("selected"); // Reset toggles
          $(".select-ball.selected").removeClass("selected"); // Reset balls

          // Resetting the internal state and UI counter
          selectedItems = [];
          updateDeleteCounter(); // This will reset count and update UI

          if (localStorage.pageId === "profile") {
            loadDocuments(localStorage.pageRefreshParam, "profile");
          } else if (localStorage.pageId === "unit") {
            loadDocuments(localStorage.pageRefreshParam, "unit");
          } else if (localStorage.pageId === "documents") {
            loadDocuments(localStorage.userId, "documents");
          }
        },
        complete: function () {
          $(".loader").hide();
        },
        error: function (error) {},
      });
    } else {
      alert("No Documents Selected to Delete");
    }
  });
}
