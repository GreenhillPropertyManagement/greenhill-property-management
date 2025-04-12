const quillInstances = {}; // globally accessible for all tabs

function initQuillIfNeeded(role) {
  const lowerRole = role.toLowerCase();
  if (!quillInstances[lowerRole]) {
    const el = document.querySelector(`[data-role='quill'][data-editor-role='${lowerRole}']`);
    if (el) {
      quillInstances[lowerRole] = new Quill(el, { theme: 'snow' });
      console.log(`Initialized Quill for ${lowerRole}`);
    }
  }
}

function renderLegalFiles($section, files) {
  const $container = $section.find(".legal__files-container");
  $container.empty();

  if (!Array.isArray(files) || files.length === 0) {
    $container.append(`<div class="legal_file_item no-files"><div class="system-text__small">You have no files uploaded.</div></div>`);
    return;
  }

  const role = $section.attr("data-legal-tab").toLowerCase();
  const roleAttribute = role === "tenant"
    ? `data-tenant="delete-file"`
    : `data-landlord="delete-file"`;

  files.forEach(file => {
    const $item = $(`<div class="legal_file_item">
      <div class="system-text__small file_name"></div>
      <div class="file-delete" data-file-id="${file.id}" ${roleAttribute}>🗑️</div>
    </div>`);

    $item.attr("id", file.id);
    $item.find(".file_name").text(file.title || "Untitled Document");
    $item.find(".file_name").css("cursor", "pointer").on("click", () => window.open(file.path_url, "_blank"));

    $container.append($item);
  });
}

function getLegalCase(roleOverride = null) {
  const role = (roleOverride || $("[data-profile='user_role']").text().trim()).toLowerCase();
  const $section = $(`[data-legal-tab='${role}']`);
  const userId = localStorage.userProfileRecId;
  if (!userId) return;

  $(".loader").css("display", "flex");

  $.ajax({
    url: localStorage.baseUrl + "api:5KCOvB4S/get_legal_case",
    method: "GET",
    headers: { Authorization: "Bearer " + localStorage.authToken },
    data: { user_id: parseInt(userId) },
    success: function (res) {
      initQuillIfNeeded(role);

      if (quillInstances[role]) {
        quillInstances[role].setContents({ ops: [] });
        const contents = res.legal_case.notes?.ops ? res.legal_case.notes : { ops: [] };
        quillInstances[role].setContents(contents);
      }

      const legalStatusStages = [
        "Case Opened", "Notice of Default Sent", "Initiation of Case",
        "Litigation", "Judgement Obtained", "Eviction", "Inactive"
      ];

      const $dropdown = $section.find('[data="legal-status-select"]');
      $dropdown.empty();
      legalStatusStages.forEach(status => {
        const selected = res.legal_case.status === status ? "selected" : "";
        $dropdown.append(`<option value="${status}" ${selected}>${status}</option>`);
      });

      const currentStatus = res.legal_case.status.toLowerCase();
      if (currentStatus === "inactive") {
        $section.find(".legal__status-fill-bar").removeClass("active");
      } else {
        let reached = false;
        $section.find(".legal__status-block").each(function () {
          const label = $(this).find(".system-text__small.legal").text().trim().toLowerCase();
          if (!reached) {
            $(this).find(".legal__status-fill-bar").addClass("active");
          } else {
            $(this).find(".legal__status-fill-bar").removeClass("active");
          }
          if (label === currentStatus) reached = true;
        });
      }

      renderLegalFiles($section, res.legal_files || []);
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function () {
      alert("Error loading legal case data.");
    }
  });
}

let handlersBound = false;

document.addEventListener("DOMContentLoaded", function () {
  if (handlersBound) return;
  handlersBound = true;

  // Save Notes
  $(document)
  .off("click", "[data-tenant='save-content'], [data-landlord='save-content']")
  .on("click", "[data-tenant='save-content'], [data-landlord='save-content']", function (e) {
    e.preventDefault();
    const $section = $(this).closest('[data-legal-tab]');
    const role = $section.attr("data-legal-tab").toLowerCase();
    const editor = quillInstances[role];
    const userId = localStorage.userProfileRecId;

    if (!editor || !userId) {
      alert("Editor not initialized or user ID missing");
      return;
    }

    const content = editor.getContents();
    $(".loader").css("display", "flex");

    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/save_legal_notes",
      method: "POST",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + localStorage.authToken },
      data: JSON.stringify({
        legal_quill_content: content,
        user_id: parseInt(userId)
      }),
      success: function () {
        alert("Success! Legal notes saved.");
      },
      complete: function () {
        $(".loader").hide();
      },
      error: function () {
        alert("Failed to save notes.");
        $(".loader").hide();
      }
    });
  });
  // Delete File
  $(document)
  .off("click", "[data-tenant='delete-file'], [data-landlord='delete-file']")
  .on("click", "[data-tenant='delete-file'], [data-landlord='delete-file']", function (e) {
    e.stopPropagation();

    const $btn = $(this);
    const fileId = $btn.attr("data-file-id");
    const $section = $btn.closest("[data-legal-tab]");
    const role = $section.attr("data-legal-tab").toLowerCase();
    const userId = localStorage.userProfileRecId;

    if (!fileId || !userId) {
      alert("Missing file ID or user ID.");
      return;
    }

    if (!confirm("Are you sure you want to delete this file?")) return;

    $(".loader").css("display", "flex");

    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/delete_legal_file",
      type: "POST",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + localStorage.authToken },
      data: JSON.stringify({
        file_id: fileId,
        user_id: parseInt(userId)
      }),
      success: function () {
        alert("File deleted successfully!");
        getLegalCase(role);
      },
      complete: function () {
        $(".loader").hide();
      },
      error: function () {
        $(".loader").hide();
        alert("There was an error deleting the file.");
      }
    });
  });

  // Status Dropdown
  $(document).on("change", '[data="legal-status-select"]', function () {
    const newStatus = $(this).val();
    const $section = $(this).closest("[data-legal-tab]");
    const role = $section.attr("data-legal-tab").toLowerCase();
    const userId = localStorage.userProfileRecId;

    if (!newStatus || !userId) return;
    if (!confirm(`Change legal case status to "${newStatus}"?`)) return;

    $(".loader").css("display", "flex");

    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/update_status",
      type: "POST",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + localStorage.authToken },
      data: JSON.stringify({
        status: newStatus,
        user_id: parseInt(userId)
      }),
      success: function () {
        alert("Status updated successfully!");
        getLegalCase(role);
      },
      complete: function () {
        $(".loader").hide();
      },
      error: function () {
        $(".loader").hide();
        alert("There was an error updating the status.");
      }
    });
  });

  // File Upload Trigger
  $(document)
  .off("click", ".upload-file")
  .on("click", ".upload-file", function () {
    const $section = $(this).closest("[data-legal-tab]");
    const role = $section.attr("data-legal-tab").toLowerCase();
    $(`.file-upload-input[data-upload-role='${role}']`).trigger("click");
  });

// File Upload Handler
$(document)
  .off("change", ".file-upload-input")
  .on("change", ".file-upload-input", function () {
    const file = this.files[0];
    const role = $(this).data("upload-role").toLowerCase();
    const userId = localStorage.userProfileRecId;

    if (!file || !role || !userId) return;

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
      success: () => {
        alert("File uploaded successfully!");
        getLegalCase(role);
      },
      complete: () => {
        $(".loader").hide();
        $(this).val(""); // Reset file input
      },
      error: () => {
        alert("There was an error uploading the file.");
        $(".loader").hide();
      }
    });
  });


  // Init Legal Case Buttons
  $(document)
  .off("click", '[api-button="get-legal-case-tenant"]')
  .on("click", '[api-button="get-legal-case-tenant"]', function () {
    getLegalCase("tenant");
  });

  $(document)
  .off("click", '[api-button="get-legal-case-landlord"]')
  .on("click", '[api-button="get-legal-case-landlord"]', function () {
    getLegalCase("landlord");
  });
});