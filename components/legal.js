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

document.addEventListener("DOMContentLoaded", function () {
  // Click handler for tenant tab
  $(document).on("click", '[api-button="get-legal-case-tenant"]', function () {
    getLegalCase("tenant");
  });

  // Click handler for landlord tab
  $(document).on("click", '[api-button="get-legal-case-landlord"]', function () {
    getLegalCase("landlord");
  });

  // Tab click fallback (if needed)
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

  // Save button
  $(document).on("click", ".quill__save-wrapper .cta-button", function (e) {
    e.preventDefault();
    const role = $("[data-profile='user_role']").text().trim().toLowerCase();
    const content = JSON.stringify(quillInstances[role]?.getContents() || { ops: [] });
    const userId = localStorage.userProfileRecId;

    if (!userId) return alert("User ID not found");

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

      const $files = $section.find(".legal__files-container");
      const $template = $files.find(".legal_file_item").first().clone();
      $files.empty();

      if (!Array.isArray(res.legal_files) || res.legal_files.length === 0) {
        $files.append(`<div class="legal_file_item no-files"><div class="system-text__small">You have no files uploaded.</div></div>`);
        return;
      }

      res.legal_files.forEach(file => {
        const $item = $template.clone();
        $item.attr("id", file.id);
        $item.find(".file_name").text(file.title || "Untitled Document");
        $item.find(".file_name").css("cursor", "pointer").on("click", () => window.open(file.path_url, "_blank"));
        $files.append($item);
      });
    },
    complete: function () {
      $(".loader").hide();
    },
    error: function () {
      alert("Error loading legal case data.");
    }
  });
}
