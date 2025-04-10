var quillLegal;

document.addEventListener("DOMContentLoaded", function () {
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

  // Save button handler
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
      success: function () {
        alert("Legal notes saved!");
      },
      complete: function () {
        $(".loader").hide();
      },
      error: function (err) {
        console.error("Save error:", err);
        alert("Error saving notes.");
      },
    });
  });
});