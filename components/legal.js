const quillInstances = {}; // globally accessible for all tabs

function initQuillIfNeeded(role) {
  if (!quillInstances[role]) {
    const el = document.querySelector(`[data-role='quill'][data-editor-role='${role}']`);
    if (el) {
      quillInstances[role] = new Quill(el, { theme: 'snow' });
      console.log(`Initialized Quill for ${role}`);
    }
  }
}

function renderLegalFiles($section, files) {
  const $container = $section.find(".legal__files-container");
  const $template = $container.find(".legal_file_item").first().clone(false, false);
  $container.empty();

  if (!Array.isArray(files) || files.length === 0) {
    $container.append(`<div class="legal_file_item no-files"><div class="system-text__small">You have no files uploaded.</div></div>`);
    return;
  }

  files.forEach(file => {
    const $item = $template.clone(false, false);
    $item.attr("id", file.id);
    $item.find(".file_name").text(file.title || "Untitled Document");
    $item.find(".file_name").css("cursor", "pointer").on("click", () => window.open(file.path_url, "_blank"));
    $container.append($item);
  });
}

function getLegalCase(roleOverride = null) {
  const role = roleOverride || $("[data-profile='user_role']").text().trim().toLowerCase();
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
        "Case Opened",
        "Notice of Default Sent",
        "Initiation of Case",
        "Litigation",
        "Judgement Obtained",
        "Eviction",
        "Inactive"
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

document.addEventListener("DOMContentLoaded", function () {
  $(document).on("click", '[api-button="get-legal-case-tenant"]', function () {
    getLegalCase("tenant");
  });

  $(document).on("click", '[api-button="get-legal-case-landlord"]', function () {
    getLegalCase("landlord");
  });

  $(document).on('click', '.w-tab-link', function () {
    const tabName = $(this).attr('data-w-tab')?.toLowerCase();
    if (tabName === 'legal') {
      const role = $('[data-profile="user_role"]').text().trim().toLowerCase();
      setTimeout(() => {
        initQuillIfNeeded(role);
        getLegalCase(role);
      }, 100);
    }
  });

  $(document).off("click", ".file-delete").on("click", ".file-delete", function (e) {
    e.stopPropagation();

    const $fileItem = $(this).closest(".legal_file_item");
    const fileId = $fileItem.attr("id");
    const userId = localStorage.userProfileRecId;
    const $section = $(this).closest("[data-legal-tab]");
    const role = $section.attr("data-legal-tab");

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
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: JSON.stringify({
        file_id: fileId,
        user_id: parseInt(userId),
      }),
      success: function () {
        alert("File deleted successfully!");

        $.ajax({
          url: localStorage.baseUrl + "api:5KCOvB4S/get_legal_case",
          type: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.authToken,
          },
          data: {
            user_id: parseInt(userId),
          },
          success: function (res) {
            renderLegalFiles($section, res.legal_files || []);
          },
          complete: function () {
            $(".loader").hide();
          }
        });
      },
      error: function () {
        $(".loader").hide();
        alert("There was an error deleting the file.");
      }
    });
  });

  $(document).on("click", ".upload-file", function () {
    const $section = $(this).closest("[data-legal-tab]");
    const role = $section.attr("data-legal-tab");
    $(`.file-upload-input[data-upload-role='${role}']`).trigger("click");
  });

  $(document).on("change", ".file-upload-input", function () {
    const file = this.files[0];
    const role = $(this).data("upload-role");
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
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      success: function () {
        alert("File uploaded successfully!");
        $.ajax({
          url: localStorage.baseUrl + "api:5KCOvB4S/get_legal_case",
          type: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.authToken
          },
          data: {
            user_id: parseInt(userId)
          },
          success: function (res) {
            const $section = $(`[data-legal-tab='${role}']`);
            renderLegalFiles($section, res.legal_files || []);
          }
        });
      },
      complete: function () {
        $(".loader").hide();
        $(this).val("");
      },
      error: function () {
        alert("There was an error uploading the file.");
      }
    });
  });

  $(document).off("click", ".cta-button.quill").on("click", ".cta-button.quill", function (e) {
    e.preventDefault();
    const $section = $(this).closest('[data-legal-tab]');
    const role = $section.attr('data-legal-tab');
    const editor = quillInstances[role];
    const userId = localStorage.userProfileRecId;

    if (!editor || !userId) {
      alert("Editor not initialized or user ID missing");
      return;
    }

    const content = editor.getContents();
    console.log("📝 Saving for:", role, content);

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
        alert("Legal notes saved.");
      },
      complete: function () {
        $(".loader").hide();
      },
      error: function () {
        alert("Failed to save notes.");
      }
    });
  });
});
