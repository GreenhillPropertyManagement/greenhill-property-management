document.addEventListener("DOMContentLoaded", function () {
  const quillInstances = {};

  // Initialize Quill editors for all legal__quill-wrapper elements with data-editor-role
  $("[data-role='quill']").each(function () {
    const role = $(this).attr("data-editor-role").toLowerCase();
    quillInstances[role] = new Quill(this, { theme: "snow" });
  });

  // Get active role from user role element in DOM
  const activeRole = $("[data-profile='user_role']").text().trim().toLowerCase();

  function getActiveSection() {
    return $(`[data-legal-tab='${activeRole}']`);
  }

  // When legal tab is clicked
  $(document).on("click", '[api-button="get-legal-case"]', function () {
    getLegalCase();
  });

  // Upload File 
  $(document).on("change", "#legal-file-input", function () {
    const $section = getActiveSection();
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
  $(document).on("click", ".quill__save-wrapper .cta-button", function (e) {
    e.preventDefault();

    const activeRole = $("[data-profile='user_role']").text().trim().toLowerCase();
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
