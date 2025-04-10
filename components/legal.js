var quillLegal;

document.addEventListener("DOMContentLoaded", function () {

  // when legal tab is clicked
  $(document).on("click", '[api-button="get-legal-case"]', function () {
    getLegalCase();
  });

  // when upload file is clicked

  $(document).on("click", ".upload-file", function () {
    $("#legal-file-input").click(); // Trigger hidden file input
  });


 // Initialize Quill directly on the .legal__quill-wrapper element
 quillLegal = new Quill(".legal__quill-wrapper", {
    theme: "snow",
  });

  const legalCaseId = new URLSearchParams(window.location.search).get("id");

  // Load existing content
  if (legalCaseId) {
    $.ajax({
      url: localStorage.baseUrl + "/api:_jc-29NR/load_legal_case_notes",
      type: "GET",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: {
        case_id: legalCaseId,
      },
      success: function (res) {
        if (res.notes) {
          quillLegal.setContents(res.notes);
        }
      },
    });
  }

  // Upload File 
  $("#legal-file-input").on("change", function () {
    const file = this.files[0];
    const userId = localStorage.userProfileRecId;
  
    if (!file || !userId) return;
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("file_name", file.name);
    formData.append("assignee", parseInt(userId));
  
    $(".loader").css("display", "flex");
  
    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/upload_legal_doc", 
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      success: function (res) {
        alert("File uploaded successfully!");
        // Optional: reload file list here
      },
      complete: function () {
        $(".loader").hide();
        $("#legal-file-input").val(""); 
      },
      error: function (xhr, status, err) {
        console.error("Upload failed:", err);
        alert("There was an error uploading the file.");
      }
    });
  });


  // Save Notes Button Handler
  $(".quill__save-wrapper .cta-button").click(function (e) {
    e.preventDefault();
  
    // Get content from the legal Quill instance
    const content = JSON.stringify(quillLegal.getContents());
  
    // Grab user ID from localStorage
    const userId = localStorage.userProfileRecId;
  
    // Quick validation
    if (!userId) {
      alert("User ID not found in localStorage.");
      return;
    }
  
    // Optional loader
    $(".loader").css("display", "flex");
  
    // AJAX request
    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/save_legal_notes",
      type: "POST",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + localStorage.authToken, // include auth if needed
      },
      data: JSON.stringify({
        legal_quill_content: content,
        user_id: parseInt(userId)
      }),
      success: function (response) {
        alert("Legal notes saved successfully!");
      },
      complete: function () {
        $(".loader").hide();
      },
      error: function (xhr, status, error) {
        console.error("Error saving legal notes:", error);
        alert("There was an error saving the notes.");
      }
    });
  });
});


function getLegalCase() {
  const userId = localStorage.userProfileRecId;

  if (!userId) {
    console.error("User ID not found in localStorage.");
    return;
  }

  $(".loader").css("display", "flex");

  $.ajax({
    url: localStorage.baseUrl + "api:5KCOvB4S/get_legal_case",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      user_id: parseInt(userId)
    },
    success: function (response) {

      // render legal notes
      if (response.legal_case.notes) {
        quillLegal.setContents(response.legal_case.notes);
      } else {
        console.warn("No legal notes found for this user.");
        quillLegal.setContents([]); // or leave empty
      }

      const legalStatusStages = [
        "Case Opened",
        "Notice of Default Sent",
        "Initiation of Case",
        "Litigation",
        "Judgement Obtained",
        "Eviction"
      ];
      
      // update status progress bar
      function updateLegalStatusUI(currentStatus) {
        // If status is "Inactive", remove all active classes and exit
        if (currentStatus === "Inactive") {
          $(".legal__status-fill-bar").removeClass("active");
          return;
        }
      
        let found = false;
      
        $(".legal__status-block").each(function () {
          const statusText = $(this).find(".system-text__small.legal").text().trim();
      
          if (!found) {
            $(this).find(".legal__status-fill-bar").addClass("active");
          } else {
            $(this).find(".legal__status-fill-bar").removeClass("active");
          }
      
          if (statusText === currentStatus) {
            found = true;
          }
        });
      }
      updateLegalStatusUI(response.legal_case.status);

      // Render legal files
      const $container = $(".legal__files-container");
      const $template = $container.find(".legal_file_item").first().clone();

      // Clear current list
      $container.empty();

      // Loop through legal files
      response.legal_files.forEach((file) => {
        const $item = $template.clone();

        // Update the text with file title
        $item.find(".system-text__small").text(file.title || "Untitled Document");

        // Add click handler to open in new tab
        $item.css("cursor", "pointer").on("click", function () {
          window.open(file.path_url, "_blank");
        });

        // Append to container
        $container.append($item);
      });


    },
    complete: function () {
      $(".loader").hide();
    },
    error: function (xhr, status, error) {
      console.error("Error fetching legal notes:", error);
      alert("There was an error loading the notes.");
    }
  });
}


