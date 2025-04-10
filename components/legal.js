var quillLegal;

document.addEventListener("DOMContentLoaded", function () {

  // when legal tab is clicked
  $(document).on("click", '[api-button="get-legal-case"]', function () {
    getLegalCase();
  });


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
  
    // Get content from the legal Quill instance
    const content = JSON.stringify(quillLegal.getContents());
  
    // Grab user ID from localStorage
    const userId = localStorage.userProfileRecId;
  
    // Quick validation
    if (!userId) {
      alert("User ID not found in localStorage.");
      return;
    }
  
    // Optional loader
    $(".loader").css("display", "flex");
  
    // AJAX request
    $.ajax({
      url: localStorage.baseUrl + "api:5KCOvB4S/save_legal_notes",
      type: "POST",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + localStorage.authToken, // include auth if needed
      },
      data: JSON.stringify({
        legal_quill_content: content,
        user_id: parseInt(userId)
      }),
      success: function (response) {
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
    url: localStorage.baseUrl + "api:5KCOvB4S/get_legal_cases",
    type: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.authToken,
    },
    data: {
      user_id: parseInt(userId)
    },
    success: function (response) {
      if (response.notes) {
        quillLegal.setContents(response.notes);
      } else {
        console.warn("No legal notes found for this user.");
        quillLegal.setContents([]); // or leave empty
      }
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

