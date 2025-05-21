document.addEventListener("DOMContentLoaded", function () {

  const role = localStorage.getItem('userRole');
  const userRecId = localStorage.getItem('userRecId');

  if (role === 'Tenant' && userRecId === '272') { // only for testing mode
    startTenantIntro();
  }

  // keep manual trigger if needed
  $('#start-tour-btn').on('click', function () {
    if (role === 'Tenant' && userRecId === '272') { // only for testing mode
      startTenantIntro();
    } else if (role === 'Landlord') {
      startLandlordIntro();
    }
  });

});



// Tenant Tour
function startTenantIntro() {
const intro = introJs();

intro.setOptions({
steps: [
  {
    element: document.getElementById('tenant-dashboard-header'),
    intro: 'Welcome to your tenant dashboard.',
    position: 'bottom'
  },
  {
    element: document.getElementById('tenant-bills-section'),
    intro: 'Here you can view and pay your bills.'
  }
],
    showStepNumbers: false,
    exitOnOverlayClick: true,
    disableInteraction: false
});

intro.start();
}

// Landlord Tour
function startLandlordIntro() {
const intro = introJs();

intro.setOptions({
    steps: [
    {
        element: $('.landlord-dashboard-header')[0],
        intro: 'This is your landlord dashboard.',
        position: 'bottom'
    },
    {
        element: $('.property-list-section')[0],
        intro: 'Here you can manage your properties.'
    }
    ],
    showStepNumbers: false,
    exitOnOverlayClick: true,
    disableInteraction: false
});

intro.start();
}

