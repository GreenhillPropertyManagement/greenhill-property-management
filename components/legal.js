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
  const $template = $container.find(".legal_file_item").first().clone(false, false); // clone without events
  $container.empty();

  if (!Array.isArray(files) || files.length === 0) {
    $container.append(`<div class="legal_file_item no-files"><div class="system-text__small">You have no files uploaded.</div></div>`);
    return;
  }

  files.forEach(file => {
    const $item = $template.clone(false, false); // ensure no event handlers are carried over
    $item.attr("id", file.id);
    $item.find(".file_name").text(file.title || "Untitled Document");
    $item.find(".file_name").css("cursor", "pointer").on("click", () => window.open(file.path_url, "_blank"));
    $container.append($item);
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
});
