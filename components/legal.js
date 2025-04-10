var quillLegal;

document.addEventListener("DOMContentLoaded", function () {
  // Inject the Quill editor container into .legal__quill-wrapper
  $(".legal__quill-wrapper").html('<div id="legal-editor" style="height: 300px;"></div>');

  // Initialize Quill for legal notes
  quillLegal = new Quill("#legal-editor", {
    theme: "snow",
  });

  // Load existing legal notes if a case ID is in the URL
  const legalCaseId = new URLSearchParams(window.location.search).get("id");
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

  // Save button click handler
  $(".quill__save-wrapper .cta-button").click(function (e) {
    e.preventDefault();

    const content = JSON.stringify(quillLegal.getContents());

    if (!legalCaseId) {
      alert("No legal case ID found in the URL.");
      return;
    }

    $(".loader").css("display", "flex");

    $.ajax({
      url: localStorage.baseUrl + "/api:_jc-29NR/save_legal_case_notes",
      type: "POST",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + localStorage.authToken,
      },
      data: JSON.stringify({
        case_id: legalCaseId,
        notes: content,
      }),
      success: function (res) {
        alert("Legal notes saved!");
      },
      complete: function () {
        $(".loader").hide();
      },
      error: function (err) {
        console.error("Error saving notes:", err);
        alert("Failed to save legal notes.");
      },
    });
  });
});