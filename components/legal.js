const quillInstances = {}; // Declare globally so all functions can access it

document.addEventListener("DOMContentLoaded", function () {

  // Initialize Quill editors
  $("[data-role='quill']").each(function () {
    const role = $(this).attr("data-editor-role").toLowerCase();
    quillInstances[role] = new Quill(this, { theme: "snow" });
  });

  // Handle clicks on get-legal-case buttons
  $(document).on("click", '[api-button="get-legal-case"]', function () {
    getLegalCase();
  });

  // Detect when a tab is switched and it's the Legal tab
  $(document).on('click', '.w-tab-link', function () {
    const tabName = $(this).attr('data-w-tab')?.toLowerCase();
    if (tabName === 'legal') {
      setTimeout(() => {
        getLegalCase();
      }, 100);
    }
  });

  // Upload File
  $(document).on("change", "#legal-file-input", function () {
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
      headers: { Authorization: "Bearer " + localStorage.authToken },
      success: function () {
        alert("File uploaded successfully!");
        getLegalCase();
      },
      complete: function () {
        $(".loader").hide();
        $("#legal-file-input").val("");
      },
      error: function () {
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
    if (!fileId || !userId) return;

    if (!confirm("Are you sure you want to delete this file?")) return;

    $(".loader").css("display", "flex");

    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/delete_legal_file",
      type: "POST",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + localStorage.authToken },
      data: JSON.stringify({ file_id: fileId, user_id: parseInt(userId) }),
      success: function () {
        alert("File deleted successfully!");
        getLegalCase();
      },
      complete: function () { $(".loader").hide(); },
      error: function () {
        alert("There was an error deleting the file.");
      }
    });
  });

  // Change legal status
  $(document).on("change", '[data="legal-status-select"]', function () {
    const selectedStatus = $(this).val();
    const userId = localStorage.userProfileRecId;
    if (!userId || !selectedStatus) return;

    if (!confirm(`Are you sure you want to update the status to "${selectedStatus}"?`)) return;

    $(".loader").css("display", "flex");

    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/update_status",
      type: "POST",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + localStorage.authToken },
      data: JSON.stringify({ status: selectedStatus, user_id: parseInt(userId) }),
      success: function () {
        alert("Status updated successfully!");
        getLegalCase();
      },
      complete: function () { $(".loader").hide(); },
      error: function () {
        alert("There was an error updating the status.");
      }
    });
  });

  // Save Notes Button
  $(document).on("click", ".quill__save-wrapper .cta-button", function (e) {
    e.preventDefault();
    const activeRole = $("[data-profile='user_role']").text().trim().toLowerCase();
    const content = JSON.stringify(quillInstances[activeRole]?.getContents() || {});
    const userId = localStorage.userProfileRecId;
    if (!userId) return alert("User ID not found in localStorage.");

    $(".loader").css("display", "flex");
    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/save_legal_notes",
      type: "POST",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + localStorage.authToken },
      data: JSON.stringify({ legal_quill_content: content, user_id: parseInt(userId) }),
      success: function () {
        alert("Legal notes saved successfully!");
      },
      complete: function () { $(".loader").hide(); },
      error: function () {
        alert("There was an error saving the notes.");
      }
    });
  });
});

function getLegalCase() {
  const userId = localStorage.userProfileRecId;
  if (!userId) return;
  const activeRole = $("[data-profile='user_role']").text().trim().toLowerCase();
  const $section = $(`[data-legal-tab='${activeRole}']`);
  $(".loader").css("display", "flex");

  $.ajax({
    url: localStorage.baseUrl + "api:5KCOvB4S/get_legal_case",
    headers: { Authorization: "Bearer " + localStorage.authToken },
    data: { user_id: parseInt(userId) },
    success: function (response) {
      const legalStatusStages = [
        "Case Opened",
        "Notice of Default Sent",
        "Initiation of Case",
        "Litigation",
        "Judgement Obtained",
        "Eviction"
      ];

      // Set Quill notes
      if (response.legal_case.notes) {
        quillInstances[activeRole].setContents(response.legal_case.notes);
      }

      // Populate status dropdown
      const $statusSelect = $section.find('[data="legal-status-select"]');
      $statusSelect.empty();
      legalStatusStages.concat("Inactive").forEach(status => {
        const selected = status === response.legal_case.status ? "selected" : "";
        $statusSelect.append(`<option value="${status}" ${selected}>${status}</option>`);
      });

      // Update status bars
      let reachedCurrent = false;
      $section.find(".legal__status-block").each(function () {
        const label = $(this).find(".system-text__small.legal").text().trim().toLowerCase();
        if (!reachedCurrent) {
          $(this).find(".legal__status-fill-bar").addClass("active");
        } else {
          $(this).find(".legal__status-fill-bar").removeClass("active");
        }
        if (label === response.legal_case.status.toLowerCase()) reachedCurrent = true;
      });

      // Render files
      const $container = $section.find(".legal__files-container");
      const $template = $container.find(".legal_file_item").first().clone();
      $container.empty();
      if (!response.legal_files || response.legal_files.length === 0) {
        $container.append('<div class="legal_file_item no-files"><div class="system-text__small">You have no files uploaded.</div></div>');
        return;
      }
      response.legal_files.forEach(file => {
        const $item = $template.clone();
        $item.attr("id", file.id);
        $item.find(".file_name").text(file.title || "Untitled Document");
        $item.find(".file_name").css("cursor", "pointer").on("click", () => window.open(file.path_url, "_blank"));
        $container.append($item);
      });
    },
    complete: function () { $(".loader").hide(); },
    error: function () { alert("There was an error loading the notes."); }
  });
}