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
  const $template = $container.find(".legal_file_item").first().clone();
  $container.empty();

  if (!Array.isArray(files) || files.length === 0) {
    $container.append(`<div class="legal_file_item no-files"><div class="system-text__small">You have no files uploaded.</div></div>`);
    return;
  }

  files.forEach(file => {
    const $item = $template.clone();
    $item.attr("id", file.id);
    $item.find(".file_name").text(file.title || "Untitled Document");
    $item.find(".file_name").css("cursor", "pointer").on("click", () => window.open(file.path_url, "_blank"));
    $container.append($item);
  });
}

// (unchanged code omitted for brevity)

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

        // Refresh only files for the current role and render immediately
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
          },
          complete: function () {
            $(".loader").hide();
          }
        });
      },
      error: function () {
        $(".loader").hide();
        alert("There was an error uploading the file.");
      }
    });
  });

// (rest of the script remains unchanged)
