document.addEventListener("DOMContentLoaded", function () {
  const quillInstances = {};

  // Initialize Quill editors for all legal__quill-wrapper elements with data-editor-role
  $("[data-role='quill']").each(function () {
    const role = $(this).attr("data-editor-role").toLowerCase();
    quillInstances[role] = new Quill(this, { theme: "snow" });
  });

  // Get active role from user role element in DOM
  const activeRole = $("[data-profile='user_role']").text().trim().toLowerCase();

  // When legal tab is clicked
  $(document).on("click", '[api-button="get-legal-case"]', function () {
    getLegalCase();
  });

  // When upload file is clicked
  $(document).on("click", ".upload-file", function () {
    $("#legal-file-input").click(); // Trigger hidden file input
  });

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
      success: function () {
        alert("File uploaded successfully!");
        getLegalCase();
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

  // Delete Legal File
  $(document).on("click", ".file-delete", function (e) {
    e.stopPropagation();

    const $fileItem = $(this).closest(".legal_file_item");
    const fileId = $fileItem.attr("id");
    const userId = localStorage.userProfileRecId;

    if (!fileId || !userId) {
      alert("Missing file ID or user ID.");
      return;
    }

    const confirmed = confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;

    $(".loader").css("display", "flex");

    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/delete_legal_file",
      type: "POST",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: JSON.stringify({
        file_id: fileId,
        user_id: parseInt(userId)
      }),
      success: function () {
        alert("File deleted successfully!");
        getLegalCase();
      },
      complete: function () {
        $(".loader").hide();
      },
      error: function (xhr, status, error) {
        console.error("Error deleting file:", error);
        alert("There was an error deleting the file.");
      }
    });
  });

  // Change legal status
  $(document).on("change", '[data="legal-status-select"]', function () {
    const selectedStatus = $(this).val();
    const userId = localStorage.userProfileRecId;

    if (!userId || !selectedStatus) {
      alert("Missing user ID or selected status.");
      return;
    }

    const confirmed = confirm(`Are you sure you want to update the status to "${selectedStatus}"?`);
    if (!confirmed) return;

    $(".loader").css("display", "flex");

    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/update_status",
      type: "POST",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: JSON.stringify({
        status: selectedStatus,
        user_id: parseInt(userId)
      }),
      success: function () {
        alert("Status updated successfully!");
        getLegalCase();
      },
      complete: function () {
        $(".loader").hide();
      },
      error: function (xhr, status, error) {
        console.error("Error updating status:", error);
        alert("There was an error updating the status.");
      }
    });
  });

  // Save Notes Button Handler
  $(".quill__save-wrapper .cta-button").click(function (e) {
    e.preventDefault();

    const userId = localStorage.userProfileRecId;
    const content = JSON.stringify(quillInstances[activeRole]?.getContents() || {});

    if (!userId) {
      alert("User ID not found in localStorage.");
      return;
    }

    $(".loader").css("display", "flex");

    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/save_legal_notes",
      type: "POST",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: JSON.stringify({
        legal_quill_content: content,
        user_id: parseInt(userId)
      }),
      success: function () {
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
      const legalStatusStages = [
        "Case Opened",
        "Notice of Default Sent",
        "Initiation of Case",
        "Litigation",
        "Judgement Obtained",
        "Eviction"
      ];

      // Set notes in editor
      if (response.legal_case.notes && window.quillInstances) {
        const activeRole = $("[data-profile='user_role']").text().trim().toLowerCase();
        quillInstances[activeRole].setContents(response.legal_case.notes);
      }

      // Update status select field
      const $statusSelect = $('[data="legal-status-select"]');
      $statusSelect.empty();

      legalStatusStages.concat("Inactive").forEach((status) => {
        const isSelected = status === response.legal_case.status;
        const option = `<option value="${status}" ${isSelected ? "selected" : ""}>${status}</option>`;
        $statusSelect.append(option);
      });

      // Update status progress bar
      function updateLegalStatusUI(currentStatus) {
        if (currentStatus === "Inactive") {
          $(".legal__status-fill-bar").removeClass("active");
          return;
        }
      
        let reachedCurrent = false;
      
        $(".legal__status-block").each(function () {
          const statusText = $(this).find(".system-text__small.legal").text().trim();
      
          if (!reachedCurrent) {
            $(this).find(".legal__status-fill-bar").addClass("active");
          } else {
            $(this).find(".legal__status-fill-bar").removeClass("active");
          }
      
          // Stop activating after this block if it's the current status
          if (statusText.toLowerCase() === currentStatus.toLowerCase()) {
            reachedCurrent = true;
          }
        });
      }
      updateLegalStatusUI(response.legal_case.status);

      // Render legal files
      const $container = $(".legal__files-container");
      const $template = $container.find(".legal_file_item").first().clone();
      $container.empty();

      if (!response.legal_files || response.legal_files.length === 0) {
        $container.append(`
          <div class="legal_file_item no-files">
            <div class="system-text__small">You have no files uploaded.</div>
          </div>
        `);
        return;
      }

      response.legal_files.forEach((file) => {
        const $item = $template.clone();
        $item.attr("id", file.id);
        $item.find(".file_name").text(file.title || "Untitled Document");
        $item.find(".file_name").css("cursor", "pointer").on("click", function () {
          window.open(file.path_url, "_blank");
        });
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
